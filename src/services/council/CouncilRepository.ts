export interface CouncilRepository {
    initialize(): Promise<void>;

    // People
    getPeople(): Promise<Person[]>;
    addPerson(person: Omit<Person, 'id' | 'notes' | 'reminders'> & { id?: string }): Promise<string>; // returns ID
    updatePerson(id: string, data: Partial<Person>): Promise<void>;
    deletePerson(id: string): Promise<void>;

    // Notes
    addNote(personId: string, text: string): Promise<Note>;

    // Assignments
    getAssignments(): Promise<Assignment[]>;
    addAssignment(assignment: Omit<Assignment, 'id' | 'createdAt' | 'isCompleted'> & { id?: string; createdAt?: string; isCompleted?: boolean }): Promise<string>;
    toggleAssignment(id: string): Promise<void>;
    deleteAssignment(id: string): Promise<void>;
}

// Re-using types from store for now to avoid circular deps or breakage
// Ideally these move to a shared /types folder
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
    councilType: CouncilType;
    notes: Note[];
    reminders: Reminder[];
}

export interface Assignment {
    id: string;
    title: string;
    description?: string;
    assignedToId: string;
    dueDate?: string;
    isCompleted: boolean;
    createdAt: string;
}
