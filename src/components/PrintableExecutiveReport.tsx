import React from 'react';
import { Download, Printer, X, Sparkles, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface InsightData {
    flujo: any;
    estatus: any;
    factor: any;
    carga: any;
    kpi: any;
}

interface PrintableExecutiveReportProps {
    startDate: string;
    endDate: string;
    data: InsightData;
    onClose: () => void;
    onExportPdf: () => void | Promise<void>;
}

export const PrintableExecutiveReport: React.FC<PrintableExecutiveReportProps> = ({
    startDate, endDate, data, onClose, onExportPdf
}) => {
    const handlePrint = () => {
        window.print();
    };

    const isHealthyVolume = data.factor.insight.isPositive;

    const InsightCard = ({ title, value, insight, isPositive }: any) => (
        <div style={{
            background: '#f8fafc',
            border: `1.5px solid ${isPositive ? '#10b981' : '#ef4444'}`,
            borderRadius: '12px',
            padding: '1.2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            height: '100%',
            boxSizing: 'border-box'
        }}>
            <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px' }}>{title}</p>
            <p style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b', margin: '2px 0' }}>{value}</p>
            <p style={{ fontSize: '11px', color: isPositive ? '#059669' : '#dc2626', margin: 0, lineHeight: '1.4', fontWeight: '500' }}>
                {insight}
            </p>
        </div>
    );

    return (
        <div className="print-modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.95)', zIndex: 3000,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '2rem', overflowY: 'auto'
        }}>
            {/* Toolbar */}
            <div className="no-print" style={{
                width: '100%', maxWidth: '1000px', display: 'flex',
                justifyContent: 'space-between', marginBottom: '1.5rem',
                background: '#1e293b', padding: '1rem', borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)', position: 'sticky', top: 0, zIndex: 10
            }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={handlePrint} className="btn btn-primary" style={{ background: '#22c55e' }}>
                        <Printer size={18} /> IMPRIMIR (PDF Paisaje)
                    </button>
                    <button onClick={onExportPdf} className="btn" style={{ background: '#3b82f6', color: 'white' }}>
                        <Download size={18} /> DESCARGAR PDF
                    </button>
                </div>
                <div style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Sparkles size={20} color="#F59E0B" />
                    <span style={{ fontWeight: '800' }}>VISTA PREVIA: REPORTE EJECUTIVO BI</span>
                </div>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                    <X size={24} />
                </button>
            </div>

            {/* Page Canvas (Landscape A4-ish) */}
            <div id="executive-pdf-page" style={{
                width: '297mm',
                height: '210mm',
                background: 'white',
                color: '#1a1a1a',
                padding: '0',
                boxShadow: '0 0 50px rgba(0,0,0,0.8)',
                position: 'relative',
                fontFamily: 'Arial, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxSizing: 'border-box'
            }}>
                <style>{`
                    @media print {
                        @page {
                            size: landscape;
                            margin: 0;
                        }
                        body * { visibility: hidden; }
                        .print-modal-overlay {
                            position: absolute !important;
                            top: 0 !important; left: 0 !important;
                            width: 297mm !important; height: 210mm !important;
                            overflow: hidden !important;
                            padding: 0 !important; margin: 0 !important;
                            background: white !important;
                        }
                        #executive-pdf-page, #executive-pdf-page * { visibility: visible; }
                        #executive-pdf-page {
                            position: absolute !important;
                            top: 0 !important; left: 0 !important;
                            width: 297mm !important; height: 210mm !important;
                            box-shadow: none !important;
                            margin: 0 !important;
                            border: none !important;
                        }
                        .no-print { display: none !important; }
                    }
                `}</style>

                {/* Header Strip - Limpio y Profesional */}
                <div style={{ borderBottom: '3mm solid #1e3a8a', padding: '12mm 15mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <div>
                        <h1 style={{ fontSize: '30px', fontWeight: '900', margin: 0, color: '#1e3a8a', lineHeight: '1' }}>T-GESTIÓN</h1>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0 0', fontWeight: '800', letterSpacing: '1px' }}>BUSINESS INTELLIGENCE & ANALYTICS</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h2 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#334155' }}>REPORTE EJECUTIVO CONSOLIDADO</h2>
                        <p style={{ fontSize: '13px', margin: '4px 0 0 0', color: '#475569' }}>
                            Período: <b>{startDate}</b> al <b>{endDate}</b>
                        </p>
                    </div>
                </div>

                {/* Content Area */}
                <div style={{ padding: '12mm 15mm', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.6rem' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '900', color: '#1e3a8a', margin: 0, textTransform: 'uppercase' }}>
                            Hallazgos Estratégicos (Minería de Datos v3)
                        </h3>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>Generado: {format(new Date(), "Pp", { locale: es })}</span>
                    </div>

                    {/* Grid of 6 Cards (2 rows of 3) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', gap: '1rem', flex: 1 }}>
                        <InsightCard
                            title="PATRÓN DE INGRESO"
                            value={data.flujo.insight.peakDayName}
                            insight={`Registra el mayor volumen de trabajo (${data.flujo.insight.peakVolume} OTs). ${data.flujo.insight.isWarning ? 'Pico de demanda inusual detectado.' : 'Distribución operativa estable.'}`}
                            isPositive={!data.flujo.insight.isWarning}
                        />
                        <InsightCard
                            title="FACTOR ESTRATÉGICO"
                            value={data.factor.insight.trendMessage}
                            insight={data.factor.insight.isPositive ? 'La proporción preventiva domina el flujo, reduciendo el riesgo de paros críticos.' : 'Se recomienda incrementar rondas preventivas para mitigar reparaciones emergentes.'}
                            isPositive={data.factor.insight.isPositive}
                        />
                        <InsightCard
                            title="ANÁLISIS DE CUELLO DE BOTELLA"
                            value={data.estatus.insight.bottleneckStatus?.toUpperCase() || 'N/A'}
                            insight={`Concentra el ${data.estatus.insight.bottleneckP}% del volumen total (${data.estatus.insight.maxInProgress} OTs en este estatus).`}
                            isPositive={false}
                        />

                        <InsightCard
                            title="EQUILIBRIO DE CARGA"
                            value={data.carga.insight.overloadedTech}
                            insight={data.carga.insight.isOverloaded
                                ? `Saturación detectada: Acumula ${data.carga.insight.maxActive} OTs, excediendo el promedio del equipo significativamente.`
                                : `Lidera la carga con ${data.carga.insight.maxActive} OTs asignadas dentro de rangos operativos saludables.`}
                            isPositive={!data.carga.insight.isOverloaded}
                        />
                        <InsightCard
                            title="DESEMPEÑO SLA (CRÍTICO)"
                            value={data.kpi.insight.worstBranch}
                            insight={`Sucursal con mayor tiempo de respuesta: ${data.kpi.insight.worstAvg}h (Promedio Global: ${data.kpi.insight.globalAvg}h).`}
                            isPositive={false}
                        />

                        {/* Global Status Final Card - Printer Friendly */}
                        <div style={{
                            background: isHealthyVolume ? '#f0fdf4' : '#fef2f2',
                            border: `2px solid ${isHealthyVolume ? '#10b981' : '#ef4444'}`,
                            borderRadius: '12px',
                            padding: '1.25rem',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: '0.4rem'
                        }}>
                            <p style={{ fontSize: '10px', fontWeight: '800', color: isHealthyVolume ? '#166534' : '#991b1b', textTransform: 'uppercase', margin: 0 }}>VOLUMEN GLOBAL DE PERÍODO</p>
                            <p style={{ fontSize: '20px', fontWeight: '900', color: '#1e293b', margin: '0.2rem 0' }}>{data.factor.corr} Correctivas / {data.factor.prev} Preventivas</p>
                            <p style={{ fontSize: '11px', color: isHealthyVolume ? '#15803d' : '#b91c1c', fontWeight: '700', margin: 0, fontStyle: 'italic' }}>
                                {isHealthyVolume
                                    ? "Diagnóstico: Operación Saludable. Predominio de mantenimiento preventivo."
                                    : "Alerta: Operación Reactiva. Alto riesgo de indisponibilidad por fallas no previstas."}
                            </p>
                        </div>
                    </div>

                    {/* Footer Row */}
                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                        <div style={{ display: 'flex', gap: '2.5rem', fontSize: '11px', fontWeight: '700', color: '#475569' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle2 size={14} color="#10b981" /> {data.kpi.hechas} Completadas</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><AlertTriangle size={14} color="#f59e0b" /> {data.kpi.pendientes} Pendientes</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><TrendingUp size={14} color="#3b82f6" /> Eficiencia SLA: {data.kpi.promedioHoras}h</div>
                        </div>
                        <p style={{ fontSize: '9px', color: '#94a3b8', margin: 0, fontWeight: '600' }}>T-GESTIÓN BI Analytics — Confidencial — Generado por IA Antigravity</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
