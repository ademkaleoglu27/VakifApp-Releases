function ingestContent(db, workSlug, data, options) {
    const { insertSection, insertParagraph } = options;
    const legacyMode = options.legacyMode || false;
    const useFullSchema = options.useFullSchema || false;

    // allowedTypes: if null, allow ALL types as paragraphs (unless heading)
    const allowedTypes = options.allowedTypes || null;
    const skipIntro = options.skipIntro || false;

    const sectionIndexStrategy = options.sectionIndexStrategy || 'after';
    const sectionIdSeparator = options.sectionIdSeparator || '-';
    const globalParagraphIndex = options.globalParagraphIndex || false;
    const paragraphIdPattern = options.paragraphIdPattern || null;

    // Paragraph Index Base: 0 or 1.
    const paragraphIndexBase = options.paragraphIndexBase !== undefined ? options.paragraphIndexBase : 1;

    // Arabic Alias: If true, 'arabic' block type is treated as is_arabic=1.
    // If false (Legacy Lemalar), 'arabic' type is treated as text (0), only 'arabic_block' is 1.
    const arabicAlias = options.arabicAlias !== undefined ? options.arabicAlias : true;

    const sectionType = options.sectionType || 'chapter';
    const introType = options.introType || 'chapter';
    const ignoreSectionText = options.ignoreSectionText || false;
    const titleFallback = options.titleFallback || null;

    let sectionIndex = 0;

    // Initialize paragraphIndex based on strategy?
    let paragraphIndex = 0;

    let currentSectionId = `${workSlug}${sectionIdSeparator}intro`;
    let currentSectionTitle = 'Mukaddime';
    let currentSectionUid = `${workSlug}_intro`;

    const logTitle = data.meta && data.meta.title ? data.meta.title : workSlug;

    if (!skipIntro) {
        const introArgs = [
            currentSectionId,
            workSlug,
            currentSectionTitle,
            sectionIndex, // Use 0
            introType,
            null,
            currentSectionUid
        ];

        sectionIndex++;

        if (!legacyMode || useFullSchema) {
            introArgs.push(data.meta.bookId);
            if (useFullSchema) introArgs.push('v1');
        }

        insertSection.run(...introArgs);
    } else {
        currentSectionId = null;
    }

    const transaction = db.transaction(() => {
        for (const block of data.blocks) {
            if (block.type === 'heading' || block.type === 'section') {
                let cleanTitle = '';
                if (!ignoreSectionText && block.text) {
                    cleanTitle = block.text.trim();
                } else if (block.title) {
                    cleanTitle = block.title.trim();
                }

                if (sectionIndexStrategy === 'before') {
                    sectionIndex++;
                }

                if (!cleanTitle && titleFallback) {
                    cleanTitle = titleFallback.replace('${index}', sectionIndex);
                }

                currentSectionId = `${workSlug}${sectionIdSeparator}${sectionIndex}`;
                currentSectionUid = `${workSlug}_${sectionIndex}`;
                currentSectionTitle = cleanTitle;

                const args = [
                    currentSectionId,
                    workSlug,
                    currentSectionTitle,
                    sectionIndex,
                    sectionType,
                    null,
                    currentSectionUid
                ];

                if (!legacyMode || useFullSchema) {
                    args.push(data.meta.bookId);
                    if (useFullSchema) args.push('v1');
                }

                insertSection.run(...args);

                if (sectionIndexStrategy === 'after') {
                    sectionIndex++;
                }

                if (!globalParagraphIndex) {
                    paragraphIndex = 0;
                }
                continue;
            }

            if (allowedTypes) {
                if (!allowedTypes.includes(block.type)) {
                    continue;
                }
            }

            if (!currentSectionId) continue;

            let pId;
            let pIndexToInsert;

            if (paragraphIndexBase === 1) {
                paragraphIndex++;
                pIndexToInsert = paragraphIndex;
            } else {
                pIndexToInsert = paragraphIndex;
                paragraphIndex++;
            }

            if (paragraphIdPattern) {
                pId = paragraphIdPattern(workSlug, currentSectionId, pIndexToInsert);
            } else {
                pId = `${currentSectionId}-${pIndexToInsert}`;
            }

            const isArabic = (block.type === 'arabic_block' || (arabicAlias && block.type === 'arabic')) ? 1 : 0;

            insertParagraph.run(
                pId,
                currentSectionId,
                block.text,
                pIndexToInsert,
                isArabic,
                0
            );
        }
    });

    transaction();
    console.log(`✅ Imported ${logTitle}: ${sectionIndex} sections.`);
    return sectionIndex;
}

module.exports = {
    ingestContent
};
