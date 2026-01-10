#!/usr/bin/env node
/**
 * validate-meta.mjs
 * Validates all meta JSON files against their respective schemas.
 * Usage: node scripts/validate-meta.mjs
 */

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// Initialize Ajv with 2020-12 draft support
const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);

// Load schemas
const schemas = {
    manifest: JSON.parse(readFileSync(join(ROOT, 'schema', 'manifest.schema.json'), 'utf8')),
    book: JSON.parse(readFileSync(join(ROOT, 'schema', 'book.schema.json'), 'utf8')),
    sections: JSON.parse(readFileSync(join(ROOT, 'schema', 'sections.schema.json'), 'utf8')),
    page: JSON.parse(readFileSync(join(ROOT, 'schema', 'page.schema.json'), 'utf8')),
    lugat: JSON.parse(readFileSync(join(ROOT, 'schema', 'lugat.schema.json'), 'utf8')),
};

// Compile validators
const validators = {
    manifest: ajv.compile(schemas.manifest),
    book: ajv.compile(schemas.book),
    sections: ajv.compile(schemas.sections),
    page: ajv.compile(schemas.page),
    lugat: ajv.compile(schemas.lugat),
};

let errors = [];

function validateFile(filePath, validator, schemaName) {
    if (!existsSync(filePath)) {
        errors.push(`❌ File not found: ${filePath}`);
        return false;
    }

    try {
        const data = JSON.parse(readFileSync(filePath, 'utf8'));
        const valid = validator(data);

        if (!valid) {
            errors.push(`❌ ${schemaName} validation failed: ${filePath}`);
            validator.errors.forEach(err => {
                errors.push(`   → ${err.instancePath || '/'}: ${err.message}`);
            });
            return false;
        }

        console.log(`✅ ${schemaName}: ${filePath}`);
        return true;
    } catch (err) {
        errors.push(`❌ Failed to parse ${filePath}: ${err.message}`);
        return false;
    }
}

function validateBook(bookPath) {
    const bookDir = join(ROOT, 'meta', bookPath);

    // Validate book.json
    validateFile(join(bookDir, 'book.json'), validators.book, 'book');

    // Validate sections.json
    validateFile(join(bookDir, 'sections.json'), validators.sections, 'sections');

    // Validate all pages
    const pagesDir = join(bookDir, 'pages');
    if (existsSync(pagesDir)) {
        const pageFiles = readdirSync(pagesDir).filter(f => f.endsWith('.json'));
        for (const pageFile of pageFiles) {
            validateFile(join(pagesDir, pageFile), validators.page, 'page');
        }
    }
}

// Main validation
console.log('🔍 Validating meta files...\n');

// 1. Validate manifest
const manifestPath = join(ROOT, 'meta', 'manifest.json');
if (!validateFile(manifestPath, validators.manifest, 'manifest')) {
    console.error('\n❌ Manifest validation failed. Cannot continue.');
    process.exit(1);
}

// 2. Read manifest and validate each book
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
for (const book of manifest.books) {
    console.log(`\n📖 Validating book: ${book.title}`);
    validateBook(book.path);
}

// 3. Validate lugat if exists
const lugatPath = join(ROOT, 'meta', 'lugat', 'lugat.json');
if (existsSync(lugatPath)) {
    console.log('\n📚 Validating lugat...');
    validateFile(lugatPath, validators.lugat, 'lugat');
}

// Summary
console.log('\n' + '='.repeat(50));
if (errors.length > 0) {
    console.error(`\n❌ Validation failed with ${errors.length} error(s):\n`);
    errors.forEach(e => console.error(e));
    process.exit(1);
} else {
    console.log('\n✅ All meta files validated successfully!');
    process.exit(0);
}
