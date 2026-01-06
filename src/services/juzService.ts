import { JuzAssignment } from '@/types/juz';

// Mock Data
let MOCK_ASSIGNMENTS: JuzAssignment[] = [
    {
        id: '1',
        juzNumber: 1,
        assignedTo: '1',
        assignedBy: 'admin',
        dueDate: new Date().toISOString(),
        status: 'pending',
    },
    {
        id: '2',
        juzNumber: 2,
        assignedTo: '1',
        assignedBy: 'admin',
        dueDate: new Date().toISOString(),
        status: 'completed',
        completedDate: new Date().toISOString(),
    },
];

const WAIT_TIME = 800;

export const juzService = {
    getMyAssignments: async (): Promise<JuzAssignment[]> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(MOCK_ASSIGNMENTS);
            }, WAIT_TIME);
        });
    },

    completeJuz: async (id: string): Promise<void> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                MOCK_ASSIGNMENTS = MOCK_ASSIGNMENTS.map((juz) =>
                    juz.id === id
                        ? { ...juz, status: 'completed', completedDate: new Date().toISOString() }
                        : juz
                );
                resolve();
            }, WAIT_TIME);
        });
    },
};
