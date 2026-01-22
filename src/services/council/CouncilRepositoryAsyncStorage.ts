import { CouncilRepository, Person, Assignment, Note, CouncilType } from './CouncilRepository';
import { useCouncilStore } from '@/store/councilStore'; // We will eventually decouple this
// Actually, the Store uses persist middleware. 
// So this "Repository" acts as a facade over that existing Store for Phase 2 transition?
// OR does this Repository manipulate AsyncStorage directly?
// Since the goal is "No-Regress Contract", we should use the EXISTING Store logic 
// as the "Legacy Repository" implementation to ensure exact behavior match.
// BUT the prompt says "CouncilStore.ts only contains UI state + selectors".
// This implies we refactor the store to delegate to this repo.
// So this Repo should replicate what the store CURRENTLY does with AsyncStorage (or persist).

// HOWEVER, Zustand persist middleware manages the load/save automatically.
// If we move to Repo pattern, we might break the auto-persist "magic" unless we are careful.

// Strategy:
// The Legacy Repository will WRAP the existing Zustand Store actions or logic?
// No, that creates circular dependency.

// Real Strategy for Phase 2 with Zustand Persist:
// The "Repository" abstraction is best applied by modifying the Store to call Repo.
// For "AsyncStorage" mode, the Store could continue doing what it does (Persist Middleware)
// OR we reimplement the "Load from AS / Save to AS" logic manually in this class.

// Given "Council data is persisted as a big JSON blob... via Zustand persist",
// Re-implementing it manually in this class allows us to eventually remove the 'persist' middleware form the store
// and control strict loading.
// BUT for Phase 2 'Legacy Mode', we want to keep using the persist middleware if possible to avoid migration?
// If we disabled persist middleware, we'd lose the data unless we migrate it.

// WAIT. The goal: "Council to SQLite".
// If Flag OFF: Behavior identical.
// If Flag ON: Use SQLite.

// So, if Flag OFF, we want `useCouncilStore` to behave exactly as before.
// The easiest way is to let `useCouncilStore` KEEP its persist middleware for now,
// but inside its actions, check the flag?
// If Flag is ON, call SQLite Repo.
// If Flag is OFF, update local state (which persist middleware saves to JSON).

// So "CouncilRepositoryAsyncStorage" might actually be a "No-Op" or "Local State" implementation 
// if we rely on Zustand's auto-persist.
// OR we fully implement it and remove `persist` middleware, BUT that requires migration of existing JSON.

// Let's go with "Modify Store" approach where Store delegates to Repo.
// But for Legacy, "Delegation" means "Update Local State and let Persist middleware handle it".
// Creating a "Repository" class for the Legacy path might be redundant but satisfies the architecture requirement.
// Let's implement it as a "Pass Through" that returns promises resolving to current store state?
// No, simpler: The Store will hold the "In Memory" data (people array).
// The Repository handles "Persistence".
// In Legacy Mode: Persistence is handled by Zustand Middleware (Magic).
// In SQLite Mode: Persistence is handled by SQL calls.

// Problem: Zustand Persist middleware writes on EVERY state change.
// SQLite should write on action call.
// If we mix them, we might get double writes or race conditions.

// Better Plan:
// modify `councilStore.ts` to distinct modes.
// If SQLITE_ENABLED:
//   - Disable Persist Middleware (or ignore rehydrated state?)
//   - Initialize by loading from SQLite.
//   - Actions await SQLite, then update local state.
// If SQLITE_DISABLED:
//   - Use Persist Middleware as always.

// This means `CouncilRepository` interface might be internal to the Store's logic
// or simply `CouncilRepositorySQLite` is the new thing, and "Legacy" is just "Do nothing special".

// Let's implement `CouncilRepositorySQLite`.
// We don't strictly *need* an explicit `CouncilRepositoryAsyncStorage` if we keep Zustand's persist.
// But having the interface allows us to Dependency Inject if we wanted.

// I will define the SQLite implementation.
// And for the Legacy Adapter, I will implement a class that uses `AsyncStorage` directly 
// to read/write the JSON blob, matching how zustand/persist does it (key: 'council-storage').
// This allows us to eventually REMOVE persist middleware and have full control.
// This is cleaner than fighting the middleware.

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'council-storage';

export class CouncilRepositoryAsyncStorage implements CouncilRepository {
    private async getState(): Promise<any> {
        try {
            const json = await AsyncStorage.getItem(STORAGE_KEY);
            if (!json) return { state: { people: [], assignments: [] } };
            return JSON.parse(json);
        } catch (e) {
            console.error('Failed to read council storage', e);
            return { state: { people: [], assignments: [] } };
        }
    }

    private async saveState(state: any): Promise<void> {
        // Must match Zustand persist format: { state: { ... }, version: 0 }
        const envelope = { state, version: 0 };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    }

    async initialize(): Promise<void> {
        // No-op, lazy load
    }

    async getPeople(): Promise<Person[]> {
        const data = await this.getState();
        return data.state.people || [];
    }

    async addPerson(person: Omit<Person, 'id' | 'notes' | 'reminders'> & { id?: string }): Promise<string> {
        const data = await this.getState();
        const newPerson: Person = {
            ...person,
            id: person.id || Date.now().toString(),
            notes: [],
            reminders: []
        };
        data.state.people.push(newPerson);
        await this.saveState(data.state);
        return newPerson.id;
    }

    async updatePerson(id: string, updateData: Partial<Person>): Promise<void> {
        const data = await this.getState();
        data.state.people = data.state.people.map((p: Person) => p.id === id ? { ...p, ...updateData } : p);
        await this.saveState(data.state);
    }

    async deletePerson(id: string): Promise<void> {
        const data = await this.getState();
        data.state.people = data.state.people.filter((p: Person) => p.id !== id);
        // Also clean assignments? Store logic did:
        // assignments: state.assignments.filter((a) => a.assignedToId !== id)
        data.state.assignments = data.state.assignments.filter((a: Assignment) => a.assignedToId !== id);
        await this.saveState(data.state);
    }

    async addNote(personId: string, text: string): Promise<Note> {
        const data = await this.getState();
        const newNote: Note = { id: Date.now().toString(), text, createdAt: new Date().toISOString() };
        data.state.people = data.state.people.map((p: Person) =>
            p.id === personId ? { ...p, notes: [...p.notes, newNote] } : p
        );
        await this.saveState(data.state);
        return newNote;
    }

    async getAssignments(): Promise<Assignment[]> {
        const data = await this.getState();
        return data.state.assignments || [];
    }

    async addAssignment(assignment: Omit<Assignment, 'id' | 'createdAt' | 'isCompleted'> & { id?: string; createdAt?: string; isCompleted?: boolean }): Promise<string> {
        const data = await this.getState();
        const newAssignment: Assignment = {
            ...assignment,
            id: assignment.id || Date.now().toString(),
            isCompleted: assignment.isCompleted || false,
            createdAt: assignment.createdAt || new Date().toISOString()
        };
        data.state.assignments.push(newAssignment);
        await this.saveState(data.state);
        return newAssignment.id;
    }

    async toggleAssignment(id: string): Promise<void> {
        const data = await this.getState();
        data.state.assignments = data.state.assignments.map((a: Assignment) =>
            a.id === id ? { ...a, isCompleted: !a.isCompleted } : a
        );
        await this.saveState(data.state);
    }

    async deleteAssignment(id: string): Promise<void> {
        const data = await this.getState();
        data.state.assignments = data.state.assignments.filter((a: Assignment) => a.id !== id);
        await this.saveState(data.state);
    }
}
