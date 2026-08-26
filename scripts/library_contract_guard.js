#!/usr/bin/env node
/**
 * Library Contract Guard Script (v1.1)
 * 
 * Prevents modifications to FROZEN files/paths defined in LIBRARY_CONTRACT.md
 * unless CONTRACT_EXCEPTION_TOKEN is present in commit message or environment.
 * 
 * Usage:
 *   npm run contract:check
 *   node scripts/library_contract_guard.js
 * 
 * Exit codes:
 *   0 = OK (no violations or exception granted)
 *   1 = VIOLATION (FROZEN file modified without exception)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const CONTRACT_EXCEPTION_TOKEN = 'CONTRACT_EXCEPTION_TOKEN';

// FROZEN paths - modifications require exception token
const FROZEN_PATHS = [
    'src/features/quran-pdf/',
    'src/features/reader/html_pilot/',
    'assets/content/',
    'src/features/library/screens/LibraryHomeScreen.tsx',
    'src/config/quranMaps.ts',
];

// Files that need FROZEN_BLOCK check (not entire file frozen)
const FROZEN_BLOCK_FILES = [
    'src/config/booksRegistry.ts',
];

// Allowed modifications (documentation, etc.)
const ALLOWED_PATHS = [
    'docs/',
    '.md',
    'README',
    'CHANGELOG',
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN LOGIC
// ═══════════════════════════════════════════════════════════════════════════

function getGitDiff() {
    try {
        // Get staged files
        const staged = execSync('git diff --cached --name-only', { encoding: 'utf-8' })
            .trim()
            .split('\n')
            .filter(Boolean);

        // Get unstaged but tracked files
        const unstaged = execSync('git diff --name-only', { encoding: 'utf-8' })
            .trim()
            .split('\n')
            .filter(Boolean);

        return [...new Set([...staged, ...unstaged])];
    } catch (e) {
        console.error('⚠️  Git not available or not in a git repository');
        return [];
    }
}

function getCommitMessage() {
    // Check environment variable
    if (process.env[CONTRACT_EXCEPTION_TOKEN]) {
        return CONTRACT_EXCEPTION_TOKEN;
    }

    // Check if we're in a commit (COMMIT_EDITMSG exists)
    const commitMsgPath = path.join(process.cwd(), '.git', 'COMMIT_EDITMSG');
    if (fs.existsSync(commitMsgPath)) {
        return fs.readFileSync(commitMsgPath, 'utf-8');
    }

    return '';
}

function hasExceptionToken(commitMessage) {
    return commitMessage.includes(CONTRACT_EXCEPTION_TOKEN);
}

function isAllowedPath(filePath) {
    return ALLOWED_PATHS.some(allowed => filePath.includes(allowed));
}

function isFrozenPath(filePath) {
    return FROZEN_PATHS.some(frozen => filePath.startsWith(frozen));
}

function isFrozenBlockFile(filePath) {
    return FROZEN_BLOCK_FILES.some(file => filePath === file);
}

function checkFrozenBlockModification(filePath) {
    // For FROZEN_BLOCK files, we need to check if modifications are within the block
    // This is a simplified check - in practice, you'd parse the diff more carefully

    try {
        const diff = execSync(`git diff --cached -U0 "${filePath}"`, { encoding: 'utf-8' });

        // Check if diff touches lines between FROZEN_BLOCK_START and FROZEN_BLOCK_END
        if (diff.includes('FROZEN_BLOCK_START') || diff.includes('FROZEN_BLOCK_END')) {
            return true; // Modifying the markers themselves
        }

        // Read the file and check line numbers
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n');

        let frozenStart = -1;
        let frozenEnd = -1;

        lines.forEach((line, idx) => {
            if (line.includes('FROZEN_BLOCK_START')) frozenStart = idx;
            if (line.includes('FROZEN_BLOCK_END')) frozenEnd = idx;
        });

        if (frozenStart === -1 || frozenEnd === -1) {
            return false; // No frozen block markers found
        }

        // Parse diff to get modified line numbers
        const lineMatches = diff.match(/@@ -(\d+)/g);
        if (!lineMatches) return false;

        for (const match of lineMatches) {
            const lineNum = parseInt(match.replace('@@ -', ''), 10);
            if (lineNum > frozenStart && lineNum < frozenEnd) {
                return true; // Modification within frozen block
            }
        }

        return false;
    } catch (e) {
        return false; // If we can't check, assume OK
    }
}

function main() {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║           📚 Library Contract Guard (v1.1)                   ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');

    const modifiedFiles = getGitDiff();
    const commitMessage = getCommitMessage();
    const hasException = hasExceptionToken(commitMessage);

    if (hasException) {
        console.log('✅ CONTRACT_EXCEPTION_TOKEN detected - Exception granted');
        console.log('');
        process.exit(0);
    }

    if (modifiedFiles.length === 0) {
        console.log('✅ No modified files detected');
        console.log('');
        process.exit(0);
    }

    console.log(`📋 Checking ${modifiedFiles.length} modified file(s)...`);
    console.log('');

    const violations = [];

    for (const file of modifiedFiles) {
        // Skip allowed paths
        if (isAllowedPath(file)) {
            console.log(`   ✓ ${file} (allowed)`);
            continue;
        }

        // Check completely frozen paths
        if (isFrozenPath(file)) {
            violations.push({
                file,
                reason: 'FROZEN_PATH',
                message: `File is in FROZEN path: ${FROZEN_PATHS.find(p => file.startsWith(p))}`
            });
            console.log(`   ❌ ${file} (FROZEN PATH)`);
            continue;
        }

        // Check frozen block files
        if (isFrozenBlockFile(file)) {
            if (checkFrozenBlockModification(file)) {
                violations.push({
                    file,
                    reason: 'FROZEN_BLOCK',
                    message: 'Modification detected within FROZEN_BLOCK markers'
                });
                console.log(`   ❌ ${file} (FROZEN BLOCK modified)`);
            } else {
                console.log(`   ✓ ${file} (outside FROZEN_BLOCK)`);
            }
            continue;
        }

        console.log(`   ✓ ${file}`);
    }

    console.log('');

    if (violations.length > 0) {
        console.log('╔═══════════════════════════════════════════════════════════════╗');
        console.log('║           🚨 LIBRARY_CONTRACT_VIOLATION                       ║');
        console.log('╚═══════════════════════════════════════════════════════════════╝');
        console.log('');
        console.log('The following FROZEN files/paths have been modified:');
        console.log('');

        for (const v of violations) {
            console.log(`  ❌ ${v.file}`);
            console.log(`     Reason: ${v.message}`);
            console.log('');
        }

        console.log('To proceed, you must include CONTRACT_EXCEPTION_TOKEN in your commit message:');
        console.log('');
        console.log('  git commit -m "fix: critical update CONTRACT_EXCEPTION_TOKEN"');
        console.log('');
        console.log('Or set the environment variable:');
        console.log('');
        console.log('  set CONTRACT_EXCEPTION_TOKEN=true && git commit -m "..."');
        console.log('');

        process.exit(1);
    }

    console.log('✅ All checks passed - No contract violations');
    console.log('');
    process.exit(0);
}

main();
