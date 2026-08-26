export type AssignmentStatus = 'pending' | 'completed' | 'overdue';

export interface JuzAssignment {
    id: string;
    juzNumber: number; // 1-30
    assignedTo: string; // UserId
    assignedBy: string; // AdminId
    dueDate: string; // ISO Date String
    status: AssignmentStatus;
    completedDate?: string;
}

export interface TeamJuzSummary {
    teamId: string;
    period: string; // '2023-12'
    totalCompleted: number;
    totalPending: number;
    assignments: JuzAssignment[];
}
