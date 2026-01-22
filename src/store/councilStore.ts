import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Person, Assignment } from '@/services/council/CouncilRepository';
import { CouncilRepositorySQLite } from '@/services/council/CouncilRepositorySQLite';
import { FeatureFlags, isFlagEnabled } from '@/config/featureFlags';

const sqliteRepo = new CouncilRepositorySQLite();

interface CouncilState {
    people: Person[];
    assignments: Assignment[];
    isLoading: boolean;
    error: string | null;

    // Actions
    loadData: () => Promise<void>;

    addPerson: (person: Omit<Person, 'id' | 'notes' | 'reminders'>) => Promise<void>;
    removePerson: (id: string) => Promise<void>;
    updatePerson: (id: string, data: Partial<Person>) => Promise<void>;

    addNoteToPerson: (personId: string, text: string) => Promise<void>;

    addAssignment: (assignment: Omit<Assignment, 'id' | 'createdAt' | 'isCompleted'>) => Promise<void>;
    toggleAssignmentComplete: (id: string) => Promise<void>;
    removeAssignment: (id: string) => Promise<void>;
}

export const useCouncilStore = create<CouncilState>()(
    persist(
        (set, get) => ({
            people: [],
            assignments: [],
            isLoading: false,
            error: null,

            loadData: async () => {
                // Migration Check (Import on Entry)
                if (isFlagEnabled('COUNCIL_IMPORT_ON_ENTRY')) {
                    const { CouncilMigration } = require('@/services/council/councilMigration');
                    const migrated = await CouncilMigration.isMigrated();
                    const hasLegacy = await CouncilMigration.hasLegacyData();
                    if (!migrated && hasLegacy) {
                        try {
                            set({ isLoading: true });
                            await CouncilMigration.importLegacyToSQLite();
                        } catch (e) {
                            console.error('Auto-migration failed', e);
                        }
                    }
                }

                if (isFlagEnabled('COUNCIL_SQLITE_ENABLED')) {
                    set({ isLoading: true, error: null });
                    try {
                        await sqliteRepo.initialize();
                        const [people, assignments] = await Promise.all([
                            sqliteRepo.getPeople(),
                            sqliteRepo.getAssignments()
                        ]);
                        set({ people, assignments, isLoading: false });
                    } catch (e: any) {
                        console.error('Failed to load council data from SQLite. Falling back to Legacy Storage.', e);
                        // FAIL SOFT: Explicitly load from Legacy Repo to ensure UI is hydrated
                        try {
                            const { CouncilRepositoryAsyncStorage } = require('@/services/council/CouncilRepositoryAsyncStorage');
                            const legacyRepo = new CouncilRepositoryAsyncStorage();
                            const people = await legacyRepo.getPeople();
                            const assignments = await legacyRepo.getAssignments();
                            set({ people, assignments, isLoading: false });
                        } catch (legacyError) {
                            console.error('CRITICAL: Legacy Fallback also failed', legacyError);
                            set({ isLoading: false }); // Nothing more we can do
                        }
                    }
                }
            },

            addPerson: async (personData) => {
                const shouldWriteSqlite = isFlagEnabled('COUNCIL_SQLITE_ENABLED') || isFlagEnabled('COUNCIL_DUAL_WRITE_ENABLED');
                const shouldUpdateState = true;

                // STRATEGY: Use Timestamp ID (Legacy Compatible) as the source of truth
                // This ensures that if we fall back or duplicate write, the ID is consistent.
                const id = Date.now().toString();

                if (shouldWriteSqlite) {
                    try {
                        // Pass explicit ID to SQLite
                        await sqliteRepo.addPerson({ ...personData, id });
                    } catch (e) {
                        console.error('SQLite Add Person Failed', e);
                        // If SQLite Only mode, we should perhaps alert user, but prompt asks for Fail-Soft.
                        // However, updating State updates Legacy Persist. So data is safe locally.
                        if (isFlagEnabled('COUNCIL_SQLITE_ENABLED') && !isFlagEnabled('COUNCIL_DUAL_WRITE_ENABLED')) {
                            // Just log. UI will update relying on local state (Legacy mechanism).
                            // We don't throw to avoid crash.
                        }
                    }
                }

                if (shouldUpdateState) {
                    const newPerson: Person = {
                        ...personData,
                        id,
                        notes: [],
                        reminders: []
                    };
                    set(state => ({ people: [...state.people, newPerson] }));
                }
            },

            removePerson: async (id) => {
                const shouldWriteSqlite = isFlagEnabled('COUNCIL_SQLITE_ENABLED') || isFlagEnabled('COUNCIL_DUAL_WRITE_ENABLED');

                if (shouldWriteSqlite) {
                    try {
                        await sqliteRepo.deletePerson(id);
                    } catch (e) {
                        console.error('SQLite Delete Person Failed', e);
                    }
                }

                set(state => ({
                    people: state.people.filter(p => p.id !== id),
                    assignments: state.assignments.filter(a => a.assignedToId !== id)
                }));
            },

            updatePerson: async (id, data) => {
                const shouldWriteSqlite = isFlagEnabled('COUNCIL_SQLITE_ENABLED') || isFlagEnabled('COUNCIL_DUAL_WRITE_ENABLED');

                if (shouldWriteSqlite) {
                    try {
                        await sqliteRepo.updatePerson(id, data);
                    } catch (e) {
                        console.error('SQLite Update Person Failed', e);
                    }
                }

                set(state => ({
                    people: state.people.map(p => p.id === id ? { ...p, ...data } : p)
                }));
            },

            addNoteToPerson: async (personId, text) => {
                const shouldWriteSqlite = isFlagEnabled('COUNCIL_SQLITE_ENABLED') || isFlagEnabled('COUNCIL_DUAL_WRITE_ENABLED');
                let note: any = { id: Date.now().toString(), text, createdAt: new Date().toISOString() };

                if (shouldWriteSqlite) {
                    try {
                        note = await sqliteRepo.addNote(personId, text);
                    } catch (e) {
                        console.error('SQLite Add Note Failed', e);
                    }
                }

                set(state => ({
                    people: state.people.map(p =>
                        p.id === personId
                            ? { ...p, notes: [...p.notes, note] }
                            : p
                    )
                }));
            },

            addAssignment: async (assignmentData) => {
                const shouldWriteSqlite = isFlagEnabled('COUNCIL_SQLITE_ENABLED') || isFlagEnabled('COUNCIL_DUAL_WRITE_ENABLED');
                const id = Date.now().toString(); // Legacy ID Strategy

                if (shouldWriteSqlite) {
                    try {
                        await sqliteRepo.addAssignment({ ...assignmentData, id });
                    } catch (e) {
                        console.error('SQLite Add Assignment Failed', e);
                    }
                }

                const newAssignment: Assignment = {
                    ...assignmentData,
                    id,
                    isCompleted: false,
                    createdAt: new Date().toISOString()
                };
                set(state => ({ assignments: [...state.assignments, newAssignment] }));
            },

            toggleAssignmentComplete: async (id) => {
                const shouldWriteSqlite = isFlagEnabled('COUNCIL_SQLITE_ENABLED') || isFlagEnabled('COUNCIL_DUAL_WRITE_ENABLED');

                if (shouldWriteSqlite) {
                    try {
                        await sqliteRepo.toggleAssignment(id);
                    } catch (e) {
                        console.error('SQLite Toggle Assignment Failed', e);
                    }
                }

                set(state => ({
                    assignments: state.assignments.map(a =>
                        a.id === id ? { ...a, isCompleted: !a.isCompleted } : a
                    )
                }));
            },

            removeAssignment: async (id) => {
                const shouldWriteSqlite = isFlagEnabled('COUNCIL_SQLITE_ENABLED') || isFlagEnabled('COUNCIL_DUAL_WRITE_ENABLED');

                if (shouldWriteSqlite) {
                    try {
                        await sqliteRepo.deleteAssignment(id);
                    } catch (e) {
                        console.error('SQLite Remove Assignment Failed', e);
                    }
                }
                set(state => ({ assignments: state.assignments.filter(a => a.id !== id) }));
            }
        }),
        {
            name: 'council-storage',
            storage: createJSONStorage(() => {
                // Conditional Storage:
                // If SQLite is enabled, we DO NOT want to read/write to AsyncStorage for 'council-storage',
                // OR we want to keep it in sync?
                // Dual-write strategy suggested: "Write to SQLite first; also write to Async for safety".
                // If we persist to Async always, it acts as a backup.
                // But reading? We should read from SQLite if enabled (`loadData` above overrides state).
                // So keeping default AsyncStorage usage here is FINE for dual-write.
                return AsyncStorage;
            }),
            // If SQLite is enabled, we skip rehydration to avoid overwriting SQLite data with stale AS data.
            // loadData() will handle the initialization from SQLite (or fail-soft to AS).
            skipHydration: isFlagEnabled('COUNCIL_SQLITE_ENABLED')
        }
    )
);
