export interface Announcement {
    id: string;
    title: string;
    content: string;
    date: string; // ISO Date
    priority: 'normal' | 'high';
    isRead: boolean; // Client-side tracking
    location?: string;
}
