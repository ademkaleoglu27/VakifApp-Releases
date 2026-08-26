import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type CouncilType = 'mesveret' | 'sohbet';

export interface Note {
    id: string;
    text: string;
    createdAt: string;
}

export interface Reminder {
    id: string;
    text: string;
    date: string;
    isCompleted: boolean;
}

export interface Person {
    id: string;
    name: string;
    surname: string;
    phoneNumber: string;
    address?: string;
    councilType: CouncilType; // Belongs to Meşveret or Sohbet team
    notes: Note[];
    reminders: Reminder[];
}

export interface Assignment {
    id: string;
    title: string;
    description?: string;
    assignedToId: string; // ID of the Person
    dueDate?: string;
    isCompleted: boolean;
    createdAt: string;
}

interface CouncilState {
    people: Person[];
    assignments: Assignment[];

    // Actions
    addPerson: (person: Omit<Person, 'id' | 'notes' | 'reminders'>) => void;
    removePerson: (id: string) => void;
    updatePerson: (id: string, data: Partial<Person>) => void;

    addNoteToPerson: (personId: string, text: string) => void;

    addAssignment: (assignment: Omit<Assignment, 'id' | 'createdAt' | 'isCompleted'>) => void;
    toggleAssignmentComplete: (id: string) => void;
    removeAssignment: (id: string) => void;
}

export const useCouncilStore = create<CouncilState>()(
    persist(
        (set) => ({
            people: [],
            assignments: [],

            addPerson: (personData) => set((state) => ({
                people: [...state.people, {
                    ...personData,
                    id: Date.now().toString(),
                    notes: [],
                    reminders: []
                }]
            })),

            removePerson: (id) => set((state) => ({
                people: state.people.filter((p) => p.id !== id),
                // Also remove assignments for this person? Optional.
                assignments: state.assignments.filter((a) => a.assignedToId !== id)
            })),

            updatePerson: (id, data) => set((state) => ({
                people: state.people.map((p) => (p.id === id ? { ...p, ...data } : p))
            })),

            addNoteToPerson: (personId, text) => set((state) => ({
                people: state.people.map((p) =>
                    p.id === personId
                        ? { ...p, notes: [...p.notes, { id: Date.now().toString(), text, createdAt: new Date().toISOString() }] }
                        : p
                )
            })),

            addAssignment: (assignmentData) => set((state) => ({
                assignments: [...state.assignments, {
                    ...assignmentData,
                    id: Date.now().toString(),
                    isCompleted: false,
                    createdAt: new Date().toISOString()
                }]
            })),

            toggleAssignmentComplete: (id) => set((state) => ({
                assignments: state.assignments.map((a) =>
                    a.id === id ? { ...a, isCompleted: !a.isCompleted } : a
                )
            })),

            removeAssignment: (id) => set((state) => ({
                assignments: state.assignments.filter((a) => a.id !== id)
            })),
        }),
        {
            name: 'council-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
