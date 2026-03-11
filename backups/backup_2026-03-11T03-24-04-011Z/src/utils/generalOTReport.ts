import { jsPDF } from 'jspdf';
import type { WorkOrder, Cliente, Sucursal, Equipo, User, Franquicia } from '../types';
import { downloadPDF, fileTimestamp } from './fileDownload';

interface OTReportData {
    ot: WorkOrder;
    cliente?: Cliente;
    sucursal?: Sucursal;
    equipo?: Equipo;
    tecnico?: User;
    franquicia?: Franquicia;
}

/**
 * REPORTE GENERAL DE OTs — Pendiente #10
 * Genera UN SOLO PDF con TODAS las OTs proporcionadas.
 * Cada página muestra 2 OTs (Par de OTs por hoja).
 */
export const generateGeneralOTReport = async (
    items: OTReportData[],
    generatorName: string = 'Usuario',
    filters?: {
        desde: string;
        hasta: string;
        status: string;
        tecnico: string;
        sucursal: string;
        search: string;
        tipo?: string;
        prioridad?: string;
        orden?: string;
    },
    reportTitle?: string
) => {
    if (items.length === 0) return { success: false };

    // ======== IMAGE LOADER (Fetch directo — Firebase Storage URLs incluyen token de acceso) ========
    const loadImage = async (url: string): Promise<string> => {
        if (!url || typeof url !== 'string') return '';
        if (url.startsWith('data:')) return url;

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!response.ok) return '';

            const blob = await response.blob();
            return await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => resolve('');
                reader.readAsDataURL(blob);
            });
        } catch (e: any) {
            console.warn('[PDF General] Error al cargar imagen:', url, e.name === 'AbortError' ? 'Timeout' : e.message);
            return '';
        }
    };

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const margin = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (margin * 2);

    // Colores
    const navy = [30, 58, 138];
    const grey = [100, 116, 139];
    const lightBg = [248, 250, 252];
    const borderC = [203, 213, 225];

    let currentY = 0;

    // =====================================
    // ── HOJA 1: CARÁTULA EJECUTIVA ──
    // =====================================
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(60);
    doc.text('T-GESTION', pageWidth / 2, 60, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(grey[0], grey[1], grey[2]);
    doc.text('REPORTE DE EVIDENCIA FOTOGRÁFICA', pageWidth / 2, 70, { align: 'center' });

    doc.setDrawColor(navy[0], navy[1], navy[2]);
    doc.setLineWidth(1.5);
    doc.line(margin + 20, 85, pageWidth - margin - 20, 85);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(32);
    doc.text(reportTitle || 'REPORTE GENERAL', pageWidth / 2, 105, { align: 'center' });

    doc.line(margin + 20, 115, pageWidth - margin - 20, 115);

    // Bloque Unificado
    const blockY = 135;
    const blockH = 45;
    const blockW = contentWidth - 20;
    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(navy[0], navy[1], navy[2]);
    doc.roundedRect(pageWidth / 2 - blockW / 2, blockY, blockW, blockH, 4, 4, 'FD');

    const subW = blockW / 3;
    doc.setFontSize(10); doc.setTextColor(grey[0], grey[1], grey[2]);
    doc.text('TOTAL ÓRDENES', margin + 20, blockY + 12);
    doc.setFontSize(36); doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.text(String(items.length), margin + 20, blockY + 30);

    doc.setFontSize(10); doc.setTextColor(grey[0], grey[1], grey[2]);
    doc.text('EMISIÓN', margin + 20 + subW, blockY + 12);
    doc.setFontSize(18); doc.setTextColor(30, 41, 59);
    doc.text(new Date().toLocaleDateString('es-MX'), margin + 20 + subW, blockY + 28);

    doc.setFontSize(9); doc.setTextColor(grey[0], grey[1], grey[2]);
    doc.text('FILTROS APLICADOS', margin + 20 + (subW * 2), blockY + 12);
    doc.setFontSize(7.5); doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    if (filters) {
        doc.text(`Estatus: ${filters.status || 'Todos'}`, margin + 20 + (subW * 2), blockY + 18);
        doc.text(`Tipo: ${filters.tipo || 'Todos'}`, margin + 20 + (subW * 2), blockY + 22);
        doc.text(`Sucursal: ${filters.sucursal || 'Todas'}`, margin + 20 + (subW * 2), blockY + 26);
        doc.text(`Técnico: ${filters.tecnico || 'Todos'}`, margin + 20 + (subW * 2), blockY + 30);
        doc.text(`Prioridad: ${filters.prioridad || 'Todas'}`, margin + 20 + (subW * 2), blockY + 34);
        doc.text(`Orden: ${filters.orden || 'Reciente'}`, margin + 20 + (subW * 2), blockY + 38);
    } else {
        doc.text('Sin filtros específicos aplicados.', margin + 20 + (subW * 2), blockY + 20);
    }

    doc.setFontSize(10);
    doc.setTextColor(grey[0], grey[1], grey[2]);
    doc.text(`Sistemas de Información T-SIGO — Generado por: ${generatorName} — ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 15, { align: 'center' });

    // =====================================
    // ITERAR SOBRE CADA OT (2 POR PÁGINA)
    // =====================================
    for (let i = 0; i < items.length; i++) {
        const { ot, cliente, sucursal, equipo, tecnico, franquicia } = items[i];
        if (i % 2 === 0) { doc.addPage(); currentY = 12; } else { currentY = 112; doc.setDrawColor(navy[0], navy[1], navy[2]); doc.setLineWidth(0.5); doc.line(margin, 107, pageWidth - margin, 107); }

        // Header
        // Header Row
        doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
        doc.setTextColor(navy[0], navy[1], navy[2]);
        doc.text('T-GESTION', margin, currentY + 4);
        doc.setFontSize(10); doc.setTextColor(grey[0], grey[1], grey[2]);
        doc.text('EVIDENCIA FOTOGRÁFICA', pageWidth / 2, currentY + 3.5, { align: 'center' });

        const pColor = ot.prioridad === 'ALTA' ? [239, 68, 68] :
            ot.prioridad === 'MEDIA' ? [245, 158, 11] :
                ot.prioridad === 'BAJA' ? [16, 185, 129] : [30, 58, 138];

        doc.setTextColor(pColor[0], pColor[1], pColor[2]); doc.setFontSize(16);
        doc.text(ot.tipo === 'Preventivo' ? `OT P-${ot.numero}` : `OT #${ot.numero}`, pageWidth - margin, currentY + 4, { align: 'right' });

        currentY += 3;
        doc.setDrawColor(navy[0], navy[1], navy[2]); doc.setLineWidth(0.6);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 6;

        const col1W = 100;
        const entryStart = currentY;

        // Row 1: Locacion/Tecnico (75%) + Estatus (25%)
        const row1H = 10;
        const box1W = col1W * 0.75;
        const box2W = col1W * 0.25;

        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]); doc.roundedRect(margin, currentY, box1W - 1, row1H, 1, 1, 'FD');
        doc.setFontSize(6); doc.setTextColor(navy[0], navy[1], navy[2]); doc.text('📍 LOCACIÓN / TÉCNICO', margin + 2, currentY + 3);
        doc.setFontSize(7.5); doc.setTextColor(0, 0, 0);
        doc.text(`${franquicia?.nombre || cliente?.nombre} / ${sucursal?.nombre} — TÉC: ${tecnico?.nombre || 'S/D'}`.substring(0, 50), margin + 2, currentY + 7);

        doc.setFillColor(240, 249, 255); doc.roundedRect(margin + box1W, currentY, box2W, row1H, 1, 1, 'FD');
        doc.setFontSize(6); doc.setTextColor(navy[0], navy[1], navy[2]); doc.text('⚡ ESTATUS', margin + box1W + 2, currentY + 3);
        doc.setFontSize(6.5); doc.setTextColor(0, 0, 0);
        doc.text(ot.estatus?.toUpperCase().replace('CONCLUIDA.', 'CONCL.').substring(0, 26) || 'S/D', margin + box1W + 2, currentY + 7);

        currentY += row1H + 2;

        // Row 2: Tipo (20%) + Fecha (25%) + Equipo (55%)
        const row2H = 8;
        const b21W = col1W * 0.2;
        const b22W = col1W * 0.25;
        const b23W = col1W * 0.55;

        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]); doc.roundedRect(margin, currentY, b21W - 1, row2H, 1, 1, 'FD');
        doc.setFontSize(5); doc.text(ot.tipo?.toUpperCase() || 'S/D', margin + 1.5, currentY + row2H / 1.5);

        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]); doc.roundedRect(margin + b21W, currentY, b22W - 1, row2H, 1, 1, 'FD');
        doc.setFontSize(5); doc.text('📅 ' + new Date(ot.fechas.solicitada).toLocaleDateString(), margin + b21W + 1.5, currentY + row2H / 1.5);

        doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]); doc.roundedRect(margin + b21W + b22W, currentY, b23W, row2H, 1, 1, 'FD');
        doc.setFontSize(6.5); doc.setTextColor(0, 0, 0);
        doc.text(`EQ: ${equipo?.nombre || 'S/D'}`.substring(0, 48), margin + b21W + b22W + 2, currentY + row2H / 1.5);

        currentY += row2H + 2;

        // Falla (Compact)
        doc.setDrawColor(borderC[0], borderC[1], borderC[2]); doc.rect(margin, currentY, col1W, 10);
        doc.setFontSize(6); doc.setTextColor(239, 68, 68); doc.text('🚨 FALLA REPORTADA', margin + 2, currentY + 3);
        doc.setFontSize(7); doc.setTextColor(0, 0, 0);
        const txtFalla = doc.splitTextToSize(ot.descripcionFalla || 'S/D', col1W - 4);
        doc.text(txtFalla.slice(0, 2), margin + 2, currentY + 6.5);
        currentY += 12;

        // Trabajo (Compact)
        doc.setFillColor(241, 245, 249); doc.rect(margin, currentY, col1W, 14, 'FD');
        doc.setFontSize(6); doc.setTextColor(navy[0], navy[1], navy[2]); doc.text('🔧 TRABAJO REALIZADO', margin + 2, currentY + 3);
        doc.setFontSize(7); doc.setTextColor(0, 0, 0);
        const txtSrv = doc.splitTextToSize(ot.descripcionServicio || 'S/D', col1W - 4);
        doc.text(txtSrv.slice(0, 3), margin + 2, currentY + 6.5);
        currentY += 16;

        // Refacciones
        doc.setDrawColor(borderC[0], borderC[1], borderC[2]); doc.rect(margin, currentY, col1W, 10);
        doc.setFontSize(6); doc.setTextColor(grey[0], grey[1], grey[2]); doc.text('📦 REFACCIONES', margin + 2, currentY + 4);
        doc.setFontSize(7); doc.text(doc.splitTextToSize(ot.repuestosUtilizados || 'Ninguna', col1W - 4).slice(0, 2), margin + 2, currentY + 7.5);
        currentY += 11;

        // Signatures Block (Reduced to 12mm)
        const sigH = 12;
        doc.setDrawColor(navy[0], navy[1], navy[2]); doc.setLineWidth(0.4); doc.roundedRect(margin, currentY, col1W, sigH, 1, 1, 'D');
        const sigW = col1W / 2;
        doc.line(margin + 5, currentY + 8.5, margin + sigW - 5, currentY + 8.5);
        doc.line(margin + sigW + 5, currentY + 8.5, margin + col1W - 5, currentY + 8.5);
        doc.setFontSize(5.5); doc.text(`TÉC: ${tecnico?.nombre || 'S/D'}`, margin + sigW / 2, currentY + 11, { align: 'center' });
        doc.text('CLIENTE / SUCURSAL', margin + sigW + sigW / 2, currentY + 11, { align: 'center' });

        if (ot.firmaTecnico && ot.firmaTecnico.length > 50) {
            const f1 = await loadImage(ot.firmaTecnico);
            if (f1) doc.addImage(f1, 'PNG', margin + 10, currentY + 0.5, sigW - 20, 7.5, undefined, 'FAST');
        }
        if (ot.firmaCliente && ot.firmaCliente.length > 50) {
            const f2 = await loadImage(ot.firmaCliente);
            if (f2) doc.addImage(f2, 'PNG', margin + sigW + 10, currentY + 0.5, sigW - 20, 7.5, undefined, 'FAST');
        }

        // Photos Side (Matched to Image proportions)
        const photoW = (pageWidth - margin * 2 - col1W - 8) / 2;
        const photoH = 75;
        const photoX = margin + col1W + 5;

        doc.setFontSize(8.5); doc.setTextColor(navy[0], navy[1], navy[2]);
        doc.text('Antes del Servicio', photoX + photoW / 2, entryStart + 5, { align: 'center' });
        doc.setDrawColor(borderC[0], borderC[1], borderC[2]); doc.rect(photoX, entryStart + 7, photoW, photoH);
        if (ot.fotoAntes && ot.fotoAntes.length > 5) {
            const b1 = await loadImage(ot.fotoAntes);
            if (b1) {
                try { doc.addImage(b1, 'JPEG', photoX + 0.5, entryStart + 7.5, photoW - 1, photoH - 1, undefined, 'FAST'); } catch (err) { }
            }
        }

        doc.setTextColor(16, 185, 129);
        doc.text('Después del Servicio', photoX + photoW + 4 + photoW / 2, entryStart + 5, { align: 'center' });
        doc.rect(photoX + photoW + 4, entryStart + 7, photoW, photoH);
        if (ot.fotoDespues && ot.fotoDespues.length > 5) {
            const b2 = await loadImage(ot.fotoDespues);
            if (b2) {
                try { doc.addImage(b2, 'JPEG', photoX + photoW + 4.5, entryStart + 7.5, photoW - 1, photoH - 1, undefined, 'FAST'); } catch (err) { }
            }
        }
    }

    // Footers
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(6.5); doc.setTextColor(grey[0], grey[1], grey[2]);
        doc.text(
            `Sistemas de Información T-SIGO — Generado por: ${generatorName} — ${new Date().toLocaleTimeString('es-MX')} — Página ${p}/${totalPages}`,
            pageWidth / 2, pageHeight - 7, { align: 'center' }
        );
    }

    try {
        const fileName = `ReporteGeneral_${items.length}_OTs_${fileTimestamp()}.pdf`;
        return await downloadPDF(doc, fileName);
    } catch (err) { return { success: false }; }
};
