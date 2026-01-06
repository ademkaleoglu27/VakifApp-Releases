export interface Decision {
    id: string;
    title: string;
    summary: string;
    date: string;
    category: string;
    attachmentUrl?: string; // Placeholder for PDF/Image
    created_by: string | null;
    created_at: string;
}
