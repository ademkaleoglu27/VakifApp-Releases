import AsyncStorage from '@react-native-async-storage/async-storage';
import { CouncilRepositorySQLite } from './CouncilRepositorySQLite';
import { CouncilRepositoryAsyncStorage } from './CouncilRepositoryAsyncStorage';

const STORAGE_KEY = 'council-storage';

interface Counts {
    people: number;
    assignments: number;
    notes?: number;
}

export const VerifyCouncil = {
    async getLegacyCounts(): Promise<Counts> {
        try {
            const repo = new CouncilRepositoryAsyncStorage();
            const people = await repo.getPeople();
            const assignments = await repo.getAssignments();

            // Count notes manually
            let notesCount = 0;
            people.forEach(p => notesCount += (p.notes ? p.notes.length : 0));

            return {
                people: people.length,
                assignments: assignments.length,
                notes: notesCount
            };
        } catch (e) {
            console.error('VerifyLegacy failed', e);
            return { people: -1, assignments: -1 };
        }
    },

    async getSQLiteCounts(): Promise<Counts> {
        try {
            const repo = new CouncilRepositorySQLite();
            const people = await repo.getPeople();
            const assignments = await repo.getAssignments();

            let notesCount = 0;
            people.forEach(p => notesCount += (p.notes ? p.notes.length : 0));

            return {
                people: people.length,
                assignments: assignments.length,
                notes: notesCount
            };
        } catch (e) {
            console.error('VerifySQLite failed', e);
            return { people: -1, assignments: -1 };
        }
    },

    async compare(): Promise<{ match: boolean; legacy: Counts; sqlite: Counts }> {
        const legacy = await this.getLegacyCounts();
        const sqlite = await this.getSQLiteCounts();

        const match = (
            legacy.people === sqlite.people &&
            legacy.assignments === sqlite.assignments &&
            // Note: Notes count might mismatch if migration didn't support notes initially, checking anyway
            (legacy.notes === undefined || sqlite.notes === undefined || legacy.notes === sqlite.notes)
        );

        return { match, legacy, sqlite };
    }
};
