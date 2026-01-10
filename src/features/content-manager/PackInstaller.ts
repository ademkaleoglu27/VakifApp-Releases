import * as FileSystem from 'expo-file-system';
import { ReaderDatabase } from '../../services/ReaderDatabase';
import { PackStatus, PackErrorCode, PackManifest, IndexJobStatus } from '../../modules/native-reader/types';
import { unzip } from 'react-native-zip-archive';
import throttle from 'lodash/throttle';

// Constants
const PACKS_ROOT = `${FileSystem.documentDirectory}packs/`;
const CACHE_DIR = `${FileSystem.cacheDirectory}packs/`;
const STAGING_DIR = `${PACKS_ROOT}.staging/`;
const INSTALLED_DIR = `${PACKS_ROOT}installed/`;
const TRASH_DIR = `${PACKS_ROOT}.trash/`;

export const PackInstaller = {
    /**
     * Call this on app startup to clean old staging/trash files
     */
    async janitor() {
        try {
            await this.ensureDirs();
            const now = Date.now();
            const ONE_DAY = 24 * 60 * 60 * 1000;

            const cleanupDir = async (dir: string) => {
                const files = await FileSystem.readDirectoryAsync(dir);
                for (const file of files) {
                    const path = `${dir}${file}`;
                    const info = await FileSystem.getInfoAsync(path);

                    if (!info.exists || info.modificationTime === undefined) continue;

                    if (now - (info.modificationTime * 1000) > ONE_DAY) {
                        console.log(`Janitor: Cleaning stale ${path}`);
                        await FileSystem.deleteAsync(path, { idempotent: true });
                    }
                }
            };

            await cleanupDir(STAGING_DIR);
            await cleanupDir(TRASH_DIR);
        } catch (e) {
            console.warn('Janitor failed', e);
        }
    },

    async installPack(url: string, packId: string, expectedSha256: string): Promise<void> {
        const db = ReaderDatabase.getDb();
        const downloadPath = `${CACHE_DIR}${packId}_temp.zip`;
        let manifest: PackManifest | null = null;
        let stagingPath = '';

        // Throttled update function to prevent DB spam
        const throttledUpdate = throttle((bytesWritten: number, totalBytes: number) => {
            this.updateStatus(packId, null, PackStatus.DOWNLOADING, {
                bytes_downloaded: bytesWritten,
                bytes_total: totalBytes
            });
        }, 250);

        try {
            await this.ensureDirs();

            // 1. Downloading
            // Send 0 for downloaded, but total might be unknown initially
            await this.updateStatus(packId, null, PackStatus.DOWNLOADING, { bytes_downloaded: 0 });

            const downloadRes = await FileSystem.createDownloadResumable(
                url,
                downloadPath,
                {},
                (progress) => {
                    throttledUpdate(progress.totalBytesWritten, progress.totalBytesExpectedToWrite);
                }
            ).downloadAsync();

            throttledUpdate.flush();
            throttledUpdate.cancel();

            if (!downloadRes || downloadRes.status !== 200) {
                throw { code: PackErrorCode.DOWNLOAD_FAILED, message: `HTTP ${downloadRes?.status}` };
            }

            // 2. Verifying Zip Integrity
            await this.updateStatus(packId, null, PackStatus.VERIFYING);
            const zipSha = await FileSystem.getDigestAsync(downloadPath, FileSystem.DigestAlgorithm.SHA256);

            if (zipSha.toLowerCase() !== expectedSha256.toLowerCase()) {
                throw { code: PackErrorCode.ZIP_SHA_MISMATCH, message: `Expected ${expectedSha256}, got ${zipSha}` };
            }

            // 3. Unzip to Staging
            await this.updateStatus(packId, null, PackStatus.INSTALLING);
            stagingPath = `${STAGING_DIR}${packId}_${Date.now()}`;
            await FileSystem.makeDirectoryAsync(stagingPath, { intermediates: true });

            try {
                await unzip(downloadPath, stagingPath);
            } catch (e) {
                throw { code: PackErrorCode.UNZIP_FAILED, message: String(e) };
            }

            // 4. Parse & Verify Manifest
            const manifestPath = `${stagingPath}/manifest.json`;
            const manifestInfo = await FileSystem.getInfoAsync(manifestPath);
            if (!manifestInfo.exists) {
                throw { code: PackErrorCode.MANIFEST_MISSING, message: 'manifest.json not found' };
            }

            const manifestContent = await FileSystem.readAsStringAsync(manifestPath);
            manifest = JSON.parse(manifestContent) as PackManifest;

            // Strict Validation
            if (manifest.packId !== packId) {
                throw { code: PackErrorCode.MANIFEST_INVALID, message: `Pack ID mismatch: expected ${packId}, got ${manifest.packId}` };
            }
            if (!manifest.packVersion) {
                throw { code: PackErrorCode.MANIFEST_INVALID, message: `Missing packVersion in manifest` };
            }

            // 5. Verify Content Files
            if (manifest.integrity && manifest.integrity.files) {
                for (const file of manifest.integrity.files) {
                    const filePath = `${stagingPath}/${file.path}`;
                    const fileInfo = await FileSystem.getInfoAsync(filePath);
                    if (!fileInfo.exists) {
                        throw { code: PackErrorCode.CORRUPT_PACK, message: `Missing file: ${file.path}` };
                    }
                    const fileSha = await FileSystem.getDigestAsync(filePath, FileSystem.DigestAlgorithm.SHA256);
                    if (fileSha.toLowerCase() !== file.sha256.toLowerCase()) {
                        throw { code: PackErrorCode.FILE_SHA_MISMATCH, message: `Integrity fail for ${file.path}` };
                    }
                }
            }

            // 6. Atomic Move (Swapping directories)
            const installedPath = `${INSTALLED_DIR}${packId}`;
            const installedInfo = await FileSystem.getInfoAsync(installedPath);

            if (installedInfo.exists) {
                const trashPath = `${TRASH_DIR}${packId}_${Date.now()}`;
                await FileSystem.makeDirectoryAsync(TRASH_DIR, { intermediates: true });
                await FileSystem.moveAsync({ from: installedPath, to: trashPath });
                FileSystem.deleteAsync(trashPath, { idempotent: true }).catch(console.warn);
            }

            await FileSystem.makeDirectoryAsync(INSTALLED_DIR, { intermediates: true });
            await FileSystem.moveAsync({ from: stagingPath, to: installedPath });

            // 7. DB Update (Atomic Transaction)
            await db.withTransactionAsync(async () => {
                // Clear Books
                await db.runAsync(`DELETE FROM books WHERE pack_id = ?`, [packId]);

                // Insert Books
                for (const book of manifest!.books) {
                    await db.runAsync(
                        `INSERT INTO books (id, pack_id, title, sort_order) VALUES (?, ?, ?, ?)`,
                        [book.bookId, packId, book.title, book.sortOrder]
                    );
                }

                // Finalize Status -> INSTALLED
                const sql = `
                    INSERT INTO installed_packs (id, version, status, local_path, installed_at, updated_at, error_code, error_message)
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL, NULL)
                    ON CONFLICT(id) DO UPDATE SET
                        version = excluded.version,
                        status = excluded.status,
                        local_path = excluded.local_path,
                        installed_at = CURRENT_TIMESTAMP,
                        updated_at = CURRENT_TIMESTAMP,
                        error_code = NULL,
                        error_message = NULL
                `;
                await db.runAsync(sql, [packId, manifest!.packVersion, PackStatus.INSTALLED, installedPath]);

                // Queue Index Job
                await db.runAsync(
                    `INSERT INTO index_jobs (job_id, pack_id, pack_version, status, updated_at)
                     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [`idx_${packId}_${Date.now()}`, packId, manifest!.packVersion, IndexJobStatus.PENDING]
                );
            });

        } catch (error: any) {
            throttledUpdate.flush();
            throttledUpdate.cancel();
            console.error('Pack Install Error:', error);
            const errCode = error.code || PackErrorCode.UNKNOWN;
            const errMsg = error.message || String(error);

            await this.updateStatus(packId, null, PackStatus.FAILED, {
                error_code: errCode,
                error_message: errMsg
            });

            if (stagingPath) FileSystem.deleteAsync(stagingPath, { idempotent: true }).catch(console.warn);
            throw error;

        } finally {
            FileSystem.deleteAsync(downloadPath, { idempotent: true }).catch(console.warn);
        }
    },

    async updateStatus(packId: string, version: string | null, status: PackStatus, extra: any = {}) {
        const db = ReaderDatabase.getDb();
        const { bytes_total, bytes_downloaded, error_code, error_message, local_path } = extra;

        // SAFE BYTES MANAGEMENT:
        // Use ?? null to ensure we don't accidentally write 0 if undefined.
        // If we want to write 0, we must pass 0 explicitly.

        const sql = `
            INSERT INTO installed_packs (id, version, status, bytes_total, bytes_downloaded, error_code, error_message, local_path, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(id) DO UPDATE SET
                version = COALESCE(?, version),
                status = ?,
                bytes_total = COALESCE(?, bytes_total),
                bytes_downloaded = COALESCE(?, bytes_downloaded),
                error_code = COALESCE(?, error_code),
                error_message = COALESCE(?, error_message),
                local_path = COALESCE(?, local_path),
                updated_at = CURRENT_TIMESTAMP
        `;

        const pVersion = version ?? null;
        const pBytesTotal = bytes_total ?? null;
        const pBytesDown = bytes_downloaded ?? null;
        const pErrCode = error_code ?? null;
        const pErrMsg = error_message ?? null;
        const pLocPath = local_path ?? null;

        const params = [
            // VALUES (For NEW rows, we write what we have. If null, SQLite writes NULL)
            packId, pVersion || '0.0.0', status,
            pBytesTotal, pBytesDown,  // No forced || 0 here
            pErrCode, pErrMsg,
            pLocPath,

            // UPDATE COALESCE PARAMS
            pVersion, status,
            pBytesTotal,
            pBytesDown,
            pErrCode,
            pErrMsg,
            pLocPath
        ];

        await db.runAsync(sql, params);
    },

    async ensureDirs() {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
        await FileSystem.makeDirectoryAsync(STAGING_DIR, { intermediates: true });
        await FileSystem.makeDirectoryAsync(INSTALLED_DIR, { intermediates: true });
        await FileSystem.makeDirectoryAsync(TRASH_DIR, { intermediates: true });
    }
};
