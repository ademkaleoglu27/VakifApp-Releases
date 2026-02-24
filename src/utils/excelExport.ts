import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

/**
 * Converts an array of objects to an Excel file and opens the share dialog.
 * 
 * @param data Array of objects (JSON)
 * @param fileName The name of the exported file (without .xlsx extension)
 * @param sheetName The name of the sheet inside the Excel file
 */
export const exportToExcel = async (data: any[], fileName: string, sheetName: string = 'Sheet1') => {
    try {
        if (!data || data.length === 0) {
            console.warn('Excel export failed: No data provided.');
            return;
        }

        // 1. Create a new workbook and worksheet
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        // 2. Generate Excel file in base64 format
        const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

        // 3. Define file path in document directory
        const excelPath = `${FileSystem.documentDirectory}${fileName}.xlsx`;

        // 4. Write file
        await FileSystem.writeAsStringAsync(excelPath, wbout, {
            encoding: FileSystem.EncodingType.Base64,
        });

        // 5. Check if sharing is available and share
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(excelPath, {
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                dialogTitle: 'Excel Dosyasını Kaydet veya Paylaş'
            });
        } else {
            console.warn('Sharing is not available on this device');
        }
    } catch (error) {
        console.error('Error generating or sharing Excel file:', error);
        throw error; // Re-throw if caller wants to show a UI error
    }
};
