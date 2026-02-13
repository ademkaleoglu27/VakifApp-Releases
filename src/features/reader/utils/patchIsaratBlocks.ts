import { RisaleChunk } from '@/types/risale';

/**
 * İşârâtü’l-İ’caz özel patch:
 * label("Ezcümle:") + next paragraph => tek paragraph("Ezcümle: ...")
 */

const normalizeSpaces = (s: string) =>
    (s || '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

const isEzcumleLabel = (c: RisaleChunk) => {
    if (!c) return false;
    if (c.type !== 'label') return false;
    // Check both text and text_tr for robustness, though text_tr is canonical in app types
    const t = normalizeSpaces(c.text_tr || (c as any).text || '');
    return /^Ezcümle\s*:\s*$/i.test(t);
};

const isParagraph = (c: RisaleChunk) => c?.type === 'paragraph' && normalizeSpaces(c.text_tr || (c as any).text || '').length > 0;

export function patchIsaratBlocks(bookId: string | undefined, blocks: RisaleChunk[]): RisaleChunk[] {
    if (!blocks || blocks.length === 0) return blocks || [];
    // Strict check as requested
    if (bookId !== 'risale.isaratul_icaz@diyanet.tr') return blocks;

    const out: RisaleChunk[] = [];
    let patchedCount = 0;

    for (let i = 0; i < blocks.length; i++) {
        const c = blocks[i];

        if (isEzcumleLabel(c)) {
            // sonraki anlamlı paragraph’ı ara (arada boş/whitespace chunk varsa atla)
            let j = i + 1;
            while (j < blocks.length) {
                const n = blocks[j];
                // Eğer paragraph değilse ama boş label vb ise geç; başka anlamlı tipe denk gelirse merge yapma
                const nt = normalizeSpaces(n?.text_tr || (n as any).text || '');
                if (isParagraph(n)) break;

                // Boş/önemsiz satır ise atla (text yoksa veya boşsa)
                if (!nt) { j++; continue; }

                // Anlamlı ama paragraph değil => merge iptal
                j = -1;
                break;
            }

            if (j > i && j !== -1 && j < blocks.length) {
                const nextP = blocks[j];
                const cleanText = normalizeSpaces(nextP.text_tr || (nextP as any).text || '');
                const mergedText = `Ezcümle: ${cleanText}`;

                out.push({
                    ...nextP,
                    type: 'paragraph',
                    text_tr: mergedText,
                    // If 'text' exists in the object, update it too to be safe
                    ...((nextP as any).text ? { text: mergedText } : {})
                });

                patchedCount++;
                i = j; // consumed
                continue;
            }

            // merge edilemezse fallback: label’ı olduğu gibi bırak (stabilite)
            out.push(c);
            continue;
        }

        out.push(c);
    }

    if (patchedCount > 0) {
        console.log(`[ISARAT PATCH] Merged ${patchedCount} Ezcumle blocks in page.`);
    }

    return out;
}
