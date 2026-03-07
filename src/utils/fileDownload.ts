/**
 * HELPER UNIVERSAL DE DESCARGA DE ARCHIVOS
 * =========================================
 * Unifica todos los mecanismos de descarga del sistema en un solo punto.
 * 
 * Estrategia de 2 capas:
 *   1. File System Access API (Chrome/Edge moderno → diálogo nativo "Guardar como")
 *   2. Blob URL + <a>.click() (fallback universal → Safari, Firefox, móvil)
 * 
 * Reemplaza: doc.save(), XLSX.writeFile(), saveAs(), showSaveFilePicker()
 */

export async function downloadFile(
    blob: Blob,
    fileName: string,
    mimeType?: string
): Promise<boolean> {
    // ── Capa 1: File System Access API (diálogo nativo) ──
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        try {
            const ext = fileName.split('.').pop() || '';
            const acceptMap: Record<string, string[]> = {};
            const effectiveMime = mimeType || blob.type || 'application/octet-stream';
            acceptMap[effectiveMime] = [`.${ext}`];

            const handle = await (window as any).showSaveFilePicker({
                suggestedName: fileName,
                types: [{
                    description: `Archivo ${ext.toUpperCase()}`,
                    accept: acceptMap
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return true;
        } catch (err: any) {
            // User cancelled → no es un error
            if (err.name === 'AbortError') return false;
            // Cualquier otro error → intentar fallback
            console.warn('[downloadFile] showSaveFilePicker falló, usando fallback:', err.message);
        }
    }

    // ── Capa 2: Blob URL + <a>.click() (fallback universal) ──
    try {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();

        // Cleanup después de un breve delay para permitir la descarga
        setTimeout(() => {
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
        }, 250);

        return true;
    } catch (err) {
        console.error('[downloadFile] Todos los mecanismos fallaron:', err);
        return false;
    }
}

/**
 * Helper especializado para PDFs generados por jsPDF.
 * Descarga el archivo Y retorna un blobUrl que el caller puede usar
 * para ofrecer un botón "Abrir ahora" en la notificación.
 */
export async function downloadPDF(
    doc: { output: (type: 'blob') => Blob },
    fileName: string
): Promise<{ success: boolean; blobUrl?: string }> {
    try {
        const blob = doc.output('blob');
        const blobUrl = URL.createObjectURL(blob);
        const success = await downloadFile(blob, fileName, 'application/pdf');

        if (success) {
            // Retornar el blobUrl para que el caller pueda ofrecer "Abrir ahora"
            // Se limpia después de 2 minutos
            setTimeout(() => URL.revokeObjectURL(blobUrl), 120000);
            return { success: true, blobUrl };
        }
        URL.revokeObjectURL(blobUrl);
        return { success: false };
    } catch (err) {
        console.error('[downloadPDF] Error al generar blob:', err);
        return { success: false };
    }
}

/**
 * Helper especializado para descargar archivos Excel.
 * Recibe el array generado por XLSX.write() y usa el helper universal.
 */
export async function downloadExcel(
    wboutArray: ArrayBuffer,
    fileName: string
): Promise<boolean> {
    try {
        const blob = new Blob([new Uint8Array(wboutArray)], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        return await downloadFile(blob, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } catch (err) {
        console.error('[downloadExcel] Error:', err);
        return false;
    }
}

/**
 * Helper especializado para descargar archivos CSV.
 * Reemplaza file-saver saveAs().
 */
export async function downloadCSV(
    csvContent: string,
    fileName: string
): Promise<boolean> {
    try {
        // BOM UTF-8 para que Excel abra con acentos correctos
        const blob = new Blob(['\ufeff', csvContent], {
            type: 'text/csv;charset=utf-8;'
        });
        return await downloadFile(blob, fileName, 'text/csv');
    } catch (err) {
        console.error('[downloadCSV] Error:', err);
        return false;
    }
}
