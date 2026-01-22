import { CouncilRepository, Person, Assignment, Note, CouncilType } from './CouncilRepository';
import { RisaleUserDb } from '../risaleUserDb';

export class CouncilRepositorySQLite implements CouncilRepository {
    async initialize(): Promise<void> {
        // Migration handled by databaseMigration.ts on app start
    }

    async getPeople(): Promise<Person[]> {
        const contacts = await RisaleUserDb.getContacts();

        // Fetch notes for all contacts (N+1 query but acceptable for Council size)
        const contactsWithNotes = await Promise.all(contacts.map(async (c) => {
            const dbNotes = await RisaleUserDb.getContactNotes(c.id);
            const notes: Note[] = dbNotes.map((n: any) => ({
                id: n.id,
                text: n.text,
                createdAt: n.created_at
            }));

            return {
                id: c.id,
                name: c.name,
                surname: c.surname || '',
                phoneNumber: c.phone || '',
                address: c.address || '',
                councilType: (c.group_type === 'MESVERET' ? 'mesveret' : 'sohbet') as CouncilType,
                notes: notes,
                reminders: [] // reminders not yet supported in DB schema
            };
        }));

        return contactsWithNotes;
    }

    async addPerson(person: Omit<Person, 'id' | 'notes' | 'reminders'> & { id?: string }): Promise<string> {
        return await RisaleUserDb.addContact({
            id: person.id,
            name: person.name,
            surname: person.surname,
            phone: person.phoneNumber,
            address: person.address,
            group_type: person.councilType === 'mesveret' ? 'MESVERET' : 'SOHBET'
        });
    }

    async updatePerson(id: string, data: Partial<Person>): Promise<void> {
        // We need to fetch existing to respect current fields if partial? 
        // RisaleUserDb.updateContact expects full object.
        // We should first get the contact.
        // But wait, the previous code didn't do that properly either, it just passed partials which might set undefined.
        // Let's rely on RisaleUserDb.getContactByUserId(id) ? No, that's by USER ID.
        // We need getContactById.
        // Since RisaleUserDb doesn't have getContactById exposed nicely (it uses getAll), 
        // let's assume valid data is passed or implement getContactById in RisaleUserDb?
        // Actually, we can just fetch all and find it (inefficient).
        // Let's stick to what we have but be careful.
        // Wait, RisaleUserDb.updateContact SQL: "UPDATE ... SET name = ?, surname = ? ..."
        // It blindly updates. If we pass undefined, it sets NULL or text "undefined".
        // We should really fetch first.

        // For now, let's just Fix addNote as requested.
        const existing = await RisaleUserDb.getContacts(); // Inefficient fallback
        const target = existing.find(c => c.id === id);
        if (!target) return; // Fail soft

        await RisaleUserDb.updateContact({
            id,
            name: data.name ?? target.name,
            surname: data.surname ?? target.surname,
            phone: data.phoneNumber ?? target.phone,
            address: data.address ?? target.address,
            group_type: (data.councilType ? (data.councilType === 'mesveret' ? 'MESVERET' : 'SOHBET') : target.group_type)
        });
    }

    async deletePerson(id: string): Promise<void> {
        await RisaleUserDb.deleteContact(id);
    }

    async addNote(personId: string, text: string): Promise<Note> {
        const note = await RisaleUserDb.addContactNote(personId, text);
        return {
            id: note.id,
            text: note.text,
            createdAt: note.created_at
        };
    }

    async getAssignments(): Promise<Assignment[]> {
        const rows = await RisaleUserDb.getAssignments();
        return rows.map(r => ({
            id: r.id,
            title: r.title,
            description: r.description,
            assignedToId: r.assigned_to_id,
            dueDate: r.due_date,
            isCompleted: !!r.is_completed,
            createdAt: r.created_at
        }));
    }

    async addAssignment(assignment: Omit<Assignment, 'id' | 'createdAt' | 'isCompleted'> & { id?: string; createdAt?: string; isCompleted?: boolean }): Promise<string> {
        return await RisaleUserDb.addAssignment({
            id: assignment.id,
            title: assignment.title,
            description: assignment.description,
            assigned_to_id: assignment.assignedToId,
            due_date: assignment.dueDate,
            created_at: assignment.createdAt,
            is_completed: assignment.isCompleted ? 1 : 0
        });
    }

    async toggleAssignment(id: string): Promise<void> {
        await RisaleUserDb.toggleAssignmentComplete(id);
    }

    async deleteAssignment(id: string): Promise<void> {
        await RisaleUserDb.deleteAssignment(id);
    }
}
