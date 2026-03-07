import { jsPDF } from 'jspdf';
import type { WorkOrder, Cliente, Sucursal, Equipo, User, Franquicia } from '../types';
import { downloadPDF } from './fileDownload';

export const generateServiceReport = async (
    ot: WorkOrder,
    cliente: Cliente,
    sucursal: Sucursal,
    equipo: Equipo,
    tecnico?: User,
    franquicia?: Franquicia
) => {
    // ======== IMAGE LOADER (Fetch directo — Firebase Storage URLs incluyen token de acceso) ========
    const loadImage = async (url: string, isSignature: boolean = false): Promise<string> => {
        if (!url || typeof url !== 'string') return '';

        // Si ya es base64, procesarlo directamente
        if (url.startsWith('data:')) {
            return isSignature ? processSignature(url) : url;
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!response.ok) {
                console.warn('[PDF] Respuesta no OK para imagen:', url, response.status);
                return '';
            }

            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => resolve('');
                reader.readAsDataURL(blob);
            });

            if (!base64) return '';
            return isSignature ? processSignature(base64) : base64;
        } catch (e: any) {
            if (e.name === 'AbortError') {
                console.warn('[PDF] Timeout al cargar imagen:', url);
            } else {
                console.warn('[PDF] Error al cargar imagen:', url, e.message);
            }
            return '';
        }
    };

    // Procesar firma para convertir trazos a tinta negra sólida
    const processSignature = (base64: string): Promise<string> => {
        return new Promise<string>((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(base64); return; }

                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                for (let i = 0; i < data.length; i += 4) {
                    const alpha = data[i + 3];
                    const r = data[i], g = data[i + 1], b = data[i + 2];
                    const isColor = (r < 240 || g < 240 || b < 240);

                    if (alpha > 40 || isColor) {
                        data[i] = 0; data[i + 1] = 0; data[i + 2] = 0;
                        data[i + 3] = 255;
                    } else {
                        data[i] = 255; data[i + 1] = 255; data[i + 2] = 255;
                        data[i + 3] = 255;
                    }
                }
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.onerror = () => resolve(base64);
            img.src = base64;
        });
    };

    const doc = new jsPDF({ unit: 'mm', format: 'letter' });
    const margin = 12;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);
    const blueNavy = [30, 58, 138];
    const borderColor = [203, 213, 225];
    const lightGrey = [248, 250, 252];

    // --- HEADER ---
    doc.setTextColor(blueNavy[0], blueNavy[1], blueNavy[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.text('T-GESTION', margin, 20);

    doc.setFontSize(10);
    doc.setTextColor(102, 102, 102);
    doc.text('SOLUCIONES DE LOGÍSTICA Y TRANSPORTE', margin, 26);

    doc.setTextColor(51, 65, 85);
    doc.setFontSize(22);
    doc.text('HOJA DE SERVICIO', pageWidth - margin, 18, { align: 'right' });

    doc.setTextColor(239, 68, 68);
    doc.setFontSize(18);
    doc.text(`OT #${ot.numero}`, pageWidth - margin, 26, { align: 'right' });

    doc.setDrawColor(blueNavy[0], blueNavy[1], blueNavy[2]);
    doc.setLineWidth(0.8);
    doc.line(margin, 30, pageWidth - margin, 30);

    let currentY = 38;

    // --- SECTION BOX HELPER ---
    const drawBox = (x: number, y: number, w: number, h: number, title: string) => {
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.setFillColor(lightGrey[0], lightGrey[1], lightGrey[2]);
        doc.roundedRect(x, y, w, h, 1, 1, 'FD');

        doc.setTextColor(blueNavy[0], blueNavy[1], blueNavy[2]);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(title, x + 3, y + 6);
        doc.setDrawColor(226, 232, 240);
        doc.line(x + 3, y + 8, x + w - 3, y + 8);
        return y + 13;
    };

    // --- CLIENT & SERVICE INFO ---
    const colW = (contentWidth - 6) / 2;
    drawBox(margin, currentY, colW, 28, 'FRANQUICIA Y SUCURSAL');
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold'); doc.text('FRANQUICIA:', margin + 3, currentY + 14);
    doc.setFont('helvetica', 'normal'); doc.text(franquicia?.nombre || cliente.nombre || '—', margin + 22, currentY + 14);
    doc.setFont('helvetica', 'bold'); doc.text('SUCURSAL:', margin + 3, currentY + 20);
    doc.setFont('helvetica', 'normal'); doc.text(sucursal.nombre || '—', margin + 25, currentY + 20);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold'); doc.text('DIRECCIÓN:', margin + 3, currentY + 25);
    const dirTxt = doc.splitTextToSize(sucursal.direccion || '—', colW - 25);
    doc.setFont('helvetica', 'normal'); doc.text(dirTxt, margin + 23, currentY + 25);

    drawBox(margin + colW + 6, currentY, colW, 28, 'INFORMACIÓN DEL SERVICIO');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold'); doc.text('FECHA SOLICITUD:', margin + colW + 9, currentY + 14);
    doc.setFont('helvetica', 'normal'); doc.text(ot.fechas.solicitada ? new Date(ot.fechas.solicitada).toLocaleDateString() : '—', margin + colW + 45, currentY + 14);
    doc.setFont('helvetica', 'bold'); doc.text('ESTATUS:', margin + colW + 9, currentY + 20);
    doc.setFont('helvetica', 'normal'); doc.text((ot.estatus || '—').toUpperCase(), margin + colW + 28, currentY + 20);
    doc.setFont('helvetica', 'bold'); doc.text('TIPO:', margin + colW + 9, currentY + 25);
    doc.setFont('helvetica', 'normal'); doc.text(ot.tipo || 'CORECCIÓN', margin + colW + 20, currentY + 25);

    currentY += 33;

    // --- EQUIPMENT ---
    drawBox(margin, currentY, contentWidth, 20, 'DETALLES DEL EQUIPO ATENDIDO');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold'); doc.text('NOMBRE:', margin + 3, currentY + 14);
    doc.setFont('helvetica', 'normal'); doc.text(equipo.nombre || '—', margin + 22, currentY + 14);
    doc.setFont('helvetica', 'bold'); doc.text('FAMILIA:', margin + 100, currentY + 14);
    doc.setFont('helvetica', 'normal'); doc.text(equipo.familia || '—', margin + 118, currentY + 14);
    doc.setFont('helvetica', 'bold'); doc.text('ID:', margin + contentWidth - 30, currentY + 14);
    doc.setFont('helvetica', 'normal'); doc.text(String(equipo.id || '—'), margin + contentWidth - 24, currentY + 14);

    currentY += 25;

    // --- WORK DESCRIPTION ---
    const workW = colW * 1.25;
    const spareW = contentWidth - workW - 6;
    drawBox(margin, currentY, workW, 35, 'DESCRIPCIÓN DEL TRABAJO REALIZADO');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const workTxt = doc.splitTextToSize(ot.descripcionServicio || 'Sin comentarios.', workW - 6);
    doc.text(workTxt, margin + 3, currentY + 13);

    drawBox(margin + workW + 6, currentY, spareW, 35, 'REPUESTOS / MATERIALES');
    const spareTxt = doc.splitTextToSize(ot.repuestosUtilizados || 'N/A', spareW - 6);
    doc.text(spareTxt, margin + workW + 9, currentY + 13);

    currentY += 40;

    // --- PHOTOS ---
    doc.setTextColor(blueNavy[0], blueNavy[1], blueNavy[2]);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('REGISTRO FOTOGRÁFICO DE EVIDENCIA', margin, currentY);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currentY + 2, pageWidth - margin, currentY + 2);

    currentY += 6;
    const photoSlots = [
        { label: 'ANTES DEL SERVICIO', url: ot.fotoAntes },
        { label: 'DESPUÉS DEL SERVICIO', url: ot.fotoDespues },
        { label: 'EVIDENCIA ADICIONAL', url: ot.fotoExtra }
    ];
    const sW = (contentWidth - 12) / 3;
    const sH = 40;

    for (let i = 0; i < photoSlots.length; i++) {
        const slot = photoSlots[i];
        const x = margin + (i * (sW + 6));
        doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(x, currentY, sW, sH, 1, 1, 'FD');

        if (slot.url) {
            const b64 = await loadImage(slot.url);
            if (b64) doc.addImage(b64, 'JPEG', x + 1, currentY + 1, sW - 2, sH - 2, undefined, 'FAST');
        } else {
            doc.setTextColor(148, 163, 184); doc.setFontSize(8);
            doc.text('SIN FOTO', x + (sW / 2), currentY + (sH / 2), { align: 'center' });
        }
        doc.setTextColor(71, 85, 105); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        doc.text(slot.label, x + (sW / 2), currentY + sH + 5, { align: 'center' });
    }

    // --- SIGNATURES ---
    const sigY = 245;
    const sigW = 65;

    // Firma Técnico
    if (ot.firmaTecnico) {
        const f = await loadImage(ot.firmaTecnico, true);
        if (f) doc.addImage(f, 'JPEG', margin + 5, sigY - 32, sigW - 10, 30);
    }
    doc.setDrawColor(30, 41, 59); doc.setLineWidth(0.6);
    doc.line(margin, sigY, margin + sigW, sigY);
    doc.setTextColor(30, 41, 59); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text(tecnico?.nombre || 'TÉCNICO ASIGNADO', margin + (sigW / 2), sigY + 5, { align: 'center' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('FIRMA DEL TÉCNICO', margin + (sigW / 2), sigY + 9, { align: 'center' });

    // Firma Cliente
    if (ot.firmaCliente) {
        const f = await loadImage(ot.firmaCliente, true);
        if (f) doc.addImage(f, 'JPEG', pageWidth - margin - sigW + 5, sigY - 32, sigW - 10, 30);
    }
    doc.line(pageWidth - margin - sigW, sigY, pageWidth - margin, sigY);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    const cliLabel = doc.splitTextToSize(ot.comentariosCliente || 'CLIENTE / RECEPCIÓN', sigW);
    doc.text(cliLabel, pageWidth - margin - (sigW / 2), sigY + 5, { align: 'center' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('FIRMA DE CONFORMIDAD', pageWidth - margin - (sigW / 2), sigY + 12 + (cliLabel.length > 1 ? 4 : 0), { align: 'center' });

    // Footer
    doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text(`Documento original de T-GESTION - Generado el ${new Date().toLocaleString()}`, pageWidth / 2, 272, { align: 'center' });

    try {
        const fileName = `Servicio_OT_${ot.numero}_${(sucursal.nombre || 'Sin_Nombre').replace(/[^a-z0-9]/gi, '_')}.pdf`;
        return await downloadPDF(doc, fileName);
    } catch (err) {
        console.error("[PDF] Error al guardar:", err);
        return { success: false };
    }
};
