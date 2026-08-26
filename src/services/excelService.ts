import * as XLSX from 'xlsx';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { Platform } from 'react-native';
import { Transaction } from '@/types/accounting';

export const excelService = {
    /**
     * Exports transaction data to an Excel file and opens the sharing dialog.
     * @param transactions List of transactions to export
     * @param monthName Name of the month for the filename
     */
    exportTransactions: async (transactions: Transaction[], monthName: string) => {
        try {
            // 1. Prepare Data for Excel
            const data = transactions.map(t => ({
                'Tarih': new Date(t.date).toLocaleDateString('tr-TR'),
                'Tür': t.type === 'income' ? 'Gelir' : 'Gider',
                'Miktar (TL)': t.amount,
                'Kategori': t.category,
                'Açıklama': t.description || '',
                'Ödeme Yöntemi': t.payment_method === 'cash' ? 'Nakit' :
                    t.payment_method === 'bank_transfer' ? 'Banka Havalesi' : 'Kredi Kartı',
            }));

            // 2. Create Workbook and Sheet
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Muhasebe Kayıtları");

            // 2.1 Append Summary Rows at the bottom
            const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
            const totalExpense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
            const balance = totalIncome - totalExpense;

            const summaryRows = [
                [], // Empty separator
                ['', '', '', '', 'TOPLAM GELİR:', totalIncome + ' ₺'],
                ['', '', '', '', 'TOPLAM GİDER:', totalExpense + ' ₺'],
                ['', '', '', '', 'BAKİYE:', balance + ' ₺'],
            ];

            // Explicitly calculate the starting row (Headers row + data rows)
            const startRow = transactions.length + 1;
            XLSX.utils.sheet_add_aoa(ws, summaryRows, { origin: startRow });

            // 3. Set Column Widths
            const wscols = [
                { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 15 }, { wch: 30 }, { wch: 20 },
            ];
            ws['!cols'] = wscols;

            // 4. Generate Base64
            const wbout = XLSX.write(wb, {
                type: 'base64',
                bookType: 'xlsx'
            });

            // 5. Save and Share using ReactNativeBlobUtil (Already present in native build)
            const timestamp = new Date().getTime();
            const fileName = `Vakif_Muhasebe_${monthName.replace(/\s+/g, '_')}_${timestamp}.xlsx`;
            const cacheDir = ReactNativeBlobUtil.fs.dirs.CacheDir;
            const path = `${cacheDir}/${fileName}`;

            // Clean up old excel files in cache to avoid cluttering storage
            try {
                const files = await ReactNativeBlobUtil.fs.ls(cacheDir);
                const oldExcels = files.filter(f => f.startsWith('Vakif_Muhasebe_') && f.endsWith('.xlsx'));
                for (const oldFile of oldExcels) {
                    // Delete files older than 5 minutes (to avoid deleting the one we are about to open)
                    // but for simplicity, let's just delete everything that isn't the current one if it's older
                    await ReactNativeBlobUtil.fs.unlink(`${cacheDir}/${oldFile}`);
                }
            } catch (e) {
                console.warn('Cache cleanup failed:', e);
            }

            // Write the file
            await ReactNativeBlobUtil.fs.writeFile(path, wbout, 'base64');

            // 6. Share/Open the file
            if (Platform.OS === 'android') {
                // Open file with intent
                await ReactNativeBlobUtil.android.actionViewIntent(
                    path,
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                );
            } else {
                // For iOS
                await ReactNativeBlobUtil.ios.previewDocument(path);
            }
        } catch (error) {
            console.error('Excel export error:', error);
            throw error;
        }
    }
};
