import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { downloadPDF, fileTimestamp } from './fileDownload';

interface InsightData {
    flujo: any;
    estatus: any;
    factor: any;
    carga: any;
    kpi: any;
}

export const generateExecutiveReport = async (startDate: string, endDate: string, data: InsightData) => {
    // Initialize PDF in landscape mode (16:9 feel)
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // 1. Corporate Theming (Indigo)
    doc.setFillColor(30, 41, 59); // var(--bg-main)
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header Panel
    doc.setFillColor(79, 70, 229); // var(--primary)
    doc.rect(0, 0, pageWidth, 25, 'F');

    // Branding / Titles
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('T-GESTIÓN: REPORTE EJECUTIVO SMART BI', 15, 15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período de Análisis: ${startDate} al ${endDate}`, 15, 22);

    // Date Generated Right Aligned
    const textGen = `Generado: ${format(new Date(), "PPpp", { locale: es })}`;
    doc.text(textGen, pageWidth - 15 - doc.getTextWidth(textGen), 15);

    // 2. Overview Section
    let currentY = 40;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255); // text-main in dark mode
    doc.text('REPORTE DE HALLAZGOS ESTRATÉGICOS (ALGORITMO DE MINERÍA DE DATOS V3)', 15, currentY);
    currentY += 10;

    // A helper to draw a "Smart Insight" Card block onto the PDF
    const drawInsightCard = (x: number, y: number, w: number, title: string, value: string, insightText: string, isPositive: boolean) => {
        // Card Background
        doc.setFillColor(45, 55, 72);
        doc.setDrawColor(isPositive ? 16 : 239, isPositive ? 185 : 68, isPositive ? 129 : 68);
        doc.setLineWidth(0.5);
        doc.roundedRect(x, y, w, 35, 3, 3, 'FD');

        // Title
        doc.setTextColor(148, 163, 184); // text-muted
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(title.toUpperCase(), x + 5, y + 8);

        // Value
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.text(value, x + 5, y + 16);

        // Insight Text
        if (isPositive) doc.setTextColor(16, 185, 129); // Emerald
        else doc.setTextColor(239, 68, 68); // Red

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');

        const splitText = doc.splitTextToSize(insightText, w - 10);
        doc.text(splitText, x + 5, y + 23);
    };

    // Card Layout (2 rows of 3 constraints)
    const cardWidth = (pageWidth - 40) / 3;
    const gap = 5;

    // Row 1
    // 1. Dinamica
    drawInsightCard(
        15, currentY, cardWidth,
        'PATRÓN DE INGRESO',
        data.flujo.insight.peakDayName,
        `Registra el mayor volumen de trabajo (${data.flujo.insight.peakVolume} OTs). ${data.flujo.insight.isWarning ? 'Pico de demanda inusual.' : 'Distribución estable.'}`,
        !data.flujo.insight.isWarning
    );

    // 2. Cuello Botella
    let bottleneckTitle = 'ANÁLISIS DE CUELLO DE BOTELLA';
    let bottleneckVal = data.estatus.insight.bottleneckStatus ? data.estatus.insight.bottleneckStatus.toUpperCase() : 'N/A';
    let bottleneckInsight = `Concentra el ${data.estatus.insight.bottleneckP}% del volumen total (${data.estatus.insight.maxInProgress} OTs retenidas aquí).`;
    drawInsightCard(15 + cardWidth + gap, currentY, cardWidth, bottleneckTitle, bottleneckVal, bottleneckInsight, false);

    // 3. Estrategia (Factor)
    drawInsightCard(
        15 + (cardWidth * 2) + (gap * 2), currentY, cardWidth,
        'EVALUACIÓN ESTRATÉGICA (FACTOR)',
        data.factor.insight.trendMessage,
        data.factor.insight.isPositive ? 'La proporción preventiva ayuda a contener fallas mayores.' : 'Sugiere incrementar rondas preventivas para mitigar las correcciones de emergencia.',
        data.factor.insight.isPositive
    );

    currentY += 40;

    // Row 2
    // 4. Saturacion
    drawInsightCard(
        15, currentY, cardWidth,
        'RIESGO DE SATURACIÓN',
        data.carga.insight.overloadedTech,
        data.carga.insight.isOverloaded
            ? `Acumula ${data.carga.insight.maxActive} OTs, excediendo el promedio del equipo en más del 50%.`
            : `Lidera la carga con ${data.carga.insight.maxActive} OTs asigandas en equilibrio razonable.`,
        !data.carga.insight.isOverloaded
    );

    // 5. Eficiencia SLA
    drawInsightCard(
        15 + cardWidth + gap, currentY, cardWidth,
        'IMPACTO SLA (PEOR DESEMPEÑO)',
        data.kpi.insight.worstBranch,
        `Promedia ${data.kpi.insight.worstAvg}h por servicio (El promedio global es de ${data.kpi.insight.globalAvg}h). Requiere revisión operativa.`,
        false
    );

    // Resumen Rapido Box
    const isHealthyVolume = data.factor.insight.isPositive;

    if (isHealthyVolume) {
        doc.setFillColor(16, 185, 129); // Emerald Success block
        doc.setDrawColor(16, 185, 129);
    } else {
        doc.setFillColor(220, 38, 38); // Crimson Red Alert block
        doc.setDrawColor(220, 38, 38);
    }

    doc.roundedRect(15 + (cardWidth * 2) + (gap * 2), currentY, cardWidth, 35, 3, 3, 'FD');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('VOLUMEN GLOBAL DE PERÍODO', 15 + (cardWidth * 2) + (gap * 2) + 5, currentY + 8);

    doc.setFontSize(16);
    doc.text(`${data.factor.corr} Correctivas / ${data.factor.prev} Preventivas`, 15 + (cardWidth * 2) + (gap * 2) + 5, currentY + 18);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    const volumeComment = isHealthyVolume
        ? "Operación saludable. El mantenimiento preventivo domina el flujo."
        : "Alerta: Operación reactiva. Alto riesgo de indisponibilidad por fallas no previstas.";
    doc.text(doc.splitTextToSize(volumeComment, cardWidth - 10), 15 + (cardWidth * 2) + (gap * 2) + 5, currentY + 25);

    // Footer - Outside cards
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Generado Automáticamente por IA Antigravity - T-GESTIÓN BI Analytics', 15, pageHeight - 10);


    // Save the PDF
    return await downloadPDF(doc, `Reporte_Ejecutivo_BI_${startDate}_a_${endDate}_${fileTimestamp()}.pdf`);
};
