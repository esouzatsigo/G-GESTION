import React from 'react';
import { Printer, X, FileText, Download } from 'lucide-react';
import type { WorkOrder, Cliente, Sucursal, Equipo, User, Franquicia } from '../types';
import { generateGeneralOTReport } from '../utils/generalOTReport';
import { useNotification } from '../context/NotificationContext';

interface OTReportItem {
    ot: WorkOrder;
    cliente?: Cliente;
    sucursal?: Sucursal;
    equipo?: Equipo;
    tecnico?: User;
    franquicia?: Franquicia;
}

interface PrintableGeneralReportProps {
    items: OTReportItem[];
    filters?: {
        search: string;
        status: string;
        sucursal: string;
        tecnico: string;
        desde: string;
        hasta: string;
        tipo?: string;
        prioridad?: string;
        orden?: string;
    };
    onClose: () => void;
    generatorName?: string;
}

export const PrintableGeneralReport: React.FC<PrintableGeneralReportProps> = ({ items, filters, onClose, generatorName = 'Usuario' }) => {
    const { showNotification } = useNotification();

    const handlePrint = () => {
        window.print();
    };

    const handleExportPdf = async () => {
        const result = await generateGeneralOTReport(items, generatorName, filters);
        if (result?.success) {
            showNotification(
                `Reporte de ${items.length} OTs generado exitosamente.`,
                'success',
                result.blobUrl ? { label: 'Abrir ahora', onClick: () => window.open(result.blobUrl, '_blank') } : undefined
            );
        }
    };

    return (
        <div className="print-modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.95)', zIndex: 2000,
            overflow: 'auto',
            padding: '2rem'
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', minWidth: 'fit-content' }}>
                {/* Toolbar */}
                <div className="no-print" style={{
                    width: '100%', maxWidth: '900px', display: 'flex',
                    justifyContent: 'space-between', marginBottom: '1rem',
                    background: '#1e293b', padding: '1rem', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)', position: 'sticky', top: 0, zIndex: 10
                }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={handlePrint} className="btn btn-primary" style={{ background: '#22c55e', fontWeight: 'bold' }}>
                            <Printer size={18} /> IMPRIMIR ({items.length} OTs)
                        </button>
                        <button onClick={handleExportPdf} className="btn" style={{ background: '#3b82f6', color: 'white', fontWeight: 'bold' }}>
                            <Download size={18} /> GENERAR PDF
                        </button>
                    </div>
                    <div style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={20} color="#F59E0B" />
                        <span style={{ fontWeight: '800' }}>VISTA INTERNA: EVIDENCIA FOTOGRÁFICA</span>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* List of OTs */}
                <div className="printable-pages-container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <style>{`
                    @media print {
                        @page { size: landscape; margin: 0; }
                        html, body { background: white !important; margin: 0 !important; width: 279.4mm !important; height: 215.9mm !important; }
                        body * { visibility: hidden; }
                        .print-modal-overlay { position: absolute !important; top: 0 !important; width: 279.4mm !important; height: 215.9mm !important; overflow: visible !important; padding: 0 !important; background: transparent !important; }
                        .printable-pages-container, .printable-pages-container * { visibility: visible; }
                        .ot-page-wrapper { page-break-after: always !important; padding: 6mm 10mm !important; width: 279.4mm !important; height: 215.9mm !important; box-sizing: border-box !important; position: relative !important; }
                        .no-print { display: none !important; }
                    }
                    .ot-page-wrapper { width: 11in; height: 8.5in; background: white; color: #1a1a1a; padding: 0.35in; position: relative; font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; box-sizing: border-box; }
                    .black-ink-signature { 
                        filter: invert(1) contrast(3) brightness(0.4);
                        image-rendering: pixelated; 
                    }
                    .ot-entry-container { height: 48%; display: flex; flex-direction: column; border: 1.5px solid #1e3a8a; padding: 10px; border-radius: 6px; overflow: hidden; margin-bottom: 5px; }
                `}</style>

                    {/* Hoja 0: CARÁTULA */}
                    <div className="ot-page-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                        <div style={{ flex: 1, marginTop: '2rem' }}>
                            <h1 style={{ fontSize: '70px', fontWeight: '950', color: '#1e3a8a', margin: 0, padding: 0, lineHeight: '0.9', letterSpacing: '-2px' }}>T-GESTIÓN</h1>
                            <p style={{ fontSize: '14px', color: '#64748b', margin: '10px 0 0 0', letterSpacing: '4px', fontWeight: '800', textTransform: 'uppercase' }}>Reporte de Evidencia Fotográfica</p>
                        </div>

                        <div style={{ background: '#f8fafc', padding: '2.5rem', borderRadius: '30px', border: '3px solid #1e3a8a', display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '2rem', textAlign: 'left', width: '100%', maxWidth: '900px' }}>
                            <div>
                                <p style={{ fontSize: '10px', color: '#64748b', fontWeight: '900' }}>TOTAL ÓRDENES</p>
                                <p style={{ fontSize: '56px', fontWeight: '900', color: '#1e3a8a', margin: 0 }}>{items.length}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '10px', color: '#64748b', fontWeight: '900' }}>EMISIÓN</p>
                                <p style={{ fontSize: '24px', fontWeight: '800', color: '#1e293b' }}>{new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '10px', color: '#64748b', fontWeight: '900' }}>PARÁMETROS DE REPORTE</p>
                                <div style={{ fontSize: '11px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                    <div><b>Status:</b> {filters?.status || 'Todos'}</div>
                                    <div><b>Tipo:</b> {filters?.tipo || 'Todos'}</div>
                                    <div><b>Sucursal:</b> {filters?.sucursal || 'Todas'}</div>
                                    <div><b>Técnico:</b> {filters?.tecnico || 'Todos'}</div>
                                    <div><b>Prioridad:</b> {filters?.prioridad || 'Todas'}</div>
                                    <div><b>Orden:</b> {filters?.orden || 'Reciente'}</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto', fontSize: '11px', color: '#94a3b8' }}>
                            Generado por: {generatorName} — {new Date().toLocaleTimeString()}
                        </div>
                    </div>

                    {/* Páginas de OTs */}
                    {Array.from({ length: Math.ceil(items.length / 2) }).map((_, pageIdx) => (
                        <div key={pageIdx} className="ot-page-wrapper" style={{ gap: '6px' }}>
                            {items.slice(pageIdx * 2, pageIdx * 2 + 2).map((item) => (
                                <div key={item.ot.id} className="ot-entry-container">
                                    {/* Header OT */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center', borderBottom: '3px solid #1e3a8a', paddingBottom: '4px', marginBottom: '8px' }}>
                                        <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#1e3a8a', margin: 0 }}>T-GESTIÓN</h1>
                                        <h2 style={{ fontSize: '12px', fontWeight: '900', margin: 0, color: '#64748b', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '1px' }}>EVIDENCIA FOTOGRÁFICA</h2>
                                        <div style={{ textAlign: 'right' }}>
                                            <span style={{
                                                fontSize: '22px',
                                                fontWeight: '900',
                                                color: item.ot.prioridad === 'ALTA' ? '#ef4444' :
                                                    item.ot.prioridad === 'MEDIA' ? '#F59E0B' :
                                                        item.ot.prioridad === 'BAJA' ? '#10b981' : '#1e3a8a'
                                            }}>
                                                {item.ot.tipo === 'Preventivo' ? `OT P-${item.ot.numero}` : `OT #${item.ot.numero}`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '10px', flex: 1, minHeight: 0 }}>
                                        {/* Left: Info */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minHeight: 0, height: '100%' }}>
                                            <div style={{ display: 'flex', gap: '2px' }}>
                                                <div style={{ flex: 1, padding: '2px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#f8fafc', overflow: 'hidden' }}>
                                                    <p style={{ fontSize: '7px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>📍 LOCACIÓN / TÉCNICO</p>
                                                    <p style={{ fontSize: '8.2px', margin: 0, fontWeight: '700', whiteSpace: 'nowrap' }}>
                                                        {item.franquicia?.nombre || item.cliente?.nombre} / {item.sucursal?.nombre} — TÉC: {item.tecnico?.nombre || 'S/D'}
                                                    </p>
                                                </div>
                                                <div style={{ width: '85px', padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#eef2ff', textAlign: 'center', overflow: 'hidden' }}>
                                                    <p style={{ fontSize: '6.5px', margin: 0, fontWeight: '800', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                        ⚡ {item.ot.estatus?.toUpperCase().replace('CONCLUIDA.', 'CONCL.')}
                                                    </p>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '55px 65px 1fr', gap: '2px' }}>
                                                <div style={{ padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '3px' }}>
                                                    <p style={{ fontSize: '6.5px', margin: 0 }}>{item.ot.tipo?.toUpperCase() || 'S/D'}</p>
                                                </div>
                                                <div style={{ padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '3px' }}>
                                                    <p style={{ fontSize: '6.5px', margin: 0 }}>📅 {new Date(item.ot.fechas.solicitada).toLocaleDateString()}</p>
                                                </div>
                                                <div style={{ padding: '2px 4px', border: '1px solid #cbd5e1', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <p style={{ fontSize: '6.5px', margin: 0, whiteSpace: 'nowrap' }}>EQ: {item.equipo?.nombre || 'S/D'}</p>
                                                </div>
                                            </div>

                                            {/* Falla Box */}
                                            <div style={{ padding: '2px 5px', border: '1px solid #94a3b8', borderRadius: '4px', height: '28px', overflow: 'hidden', background: '#fff' }}>
                                                <p style={{ fontSize: '6.5px', fontWeight: 'bold', color: '#ef4444', margin: '0 0 1px 0' }}>🚨 FALLA REPORTADA</p>
                                                <p style={{ fontSize: '7.5px', lineHeight: '1', margin: 0 }}>{item.ot.descripcionFalla || 'S/D'}</p>
                                            </div>

                                            {/* Trabajo Box */}
                                            <div style={{ padding: '2px 5px', border: '1px solid #1e3a8a', borderRadius: '4px', height: '32px', overflow: 'hidden', background: '#f1f5f9' }}>
                                                <p style={{ fontSize: '6.5px', fontWeight: 'bold', color: '#1e3a8a', margin: '0 0 1px 0' }}>🔧 TRABAJO REALIZADO</p>
                                                <p style={{ fontSize: '7.5px', lineHeight: '1', margin: 0 }}>{item.ot.descripcionServicio || 'S/D'}</p>
                                            </div>

                                            {/* Refacciones Box */}
                                            <div style={{ padding: '1px 5px', border: '1px solid #64748b', borderRadius: '4px', height: '22px', overflow: 'hidden', background: '#fff' }}>
                                                <p style={{ fontSize: '6px', fontWeight: 'bold', color: '#64748b', margin: 0 }}>📦 REFACCIONES</p>
                                                <p style={{ fontSize: '7px', fontStyle: 'italic', margin: 0 }}>{item.ot.repuestosUtilizados || 'Ninguna'}</p>
                                            </div>

                                            <div style={{
                                                marginTop: 'auto',
                                                display: 'flex',
                                                gap: '6px',
                                                padding: '3px',
                                                border: '1.5px solid #1e3a8a',
                                                background: '#ffffff',
                                                borderRadius: '6px',
                                                position: 'relative',
                                                zIndex: 100,
                                                height: '42px'
                                            }}>
                                                <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid #e2e8f0' }}>
                                                    <div style={{ height: '24px', borderBottom: '1px solid #cbd5e1', marginBottom: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                                                        {item.ot.firmaTecnico && item.ot.firmaTecnico.length > 50 ? (
                                                            <img src={item.ot.firmaTecnico} className="black-ink-signature" alt="Firma Técnico" style={{ height: '22px', objectFit: 'contain' }} />
                                                        ) : (
                                                            <span style={{ fontSize: '7px', color: '#cbd5e1' }}>SIN FIRMA TÉC.</span>
                                                        )}
                                                    </div>
                                                    <p style={{ fontSize: '6px', margin: 0, fontWeight: '900', color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>TÉC: {item.tecnico?.nombre || 'S/D'}</p>
                                                </div>
                                                <div style={{ flex: 1, textAlign: 'center' }}>
                                                    <div style={{ height: '24px', borderBottom: '1px solid #cbd5e1', marginBottom: '1px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
                                                        {item.ot.firmaCliente && item.ot.firmaCliente.length > 50 ? (
                                                            <img src={item.ot.firmaCliente} className="black-ink-signature" alt="Firma Cliente" style={{ height: '22px', objectFit: 'contain' }} />
                                                        ) : (
                                                            <span style={{ fontSize: '7px', color: '#cbd5e1' }}>SIN FIRMA CLIENTE</span>
                                                        )}
                                                    </div>
                                                    <p style={{ fontSize: '6px', margin: 0, fontWeight: '900', color: '#000' }}>CLIENTE / SUCURSAL</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Photos */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', height: '100%' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                <p style={{ fontSize: '9px', fontWeight: '900', color: '#1e3a8a', textAlign: 'center', marginBottom: '2px', textTransform: 'uppercase' }}>Antes del Servicio</p>
                                                <div style={{ flex: 1, border: '1.5px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {item.ot.fotoAntes ? <img src={item.ot.fotoAntes} alt="Antes" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <span style={{ color: '#cbd5e1', fontSize: '10px' }}>SIN FOTO</span>}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                                <p style={{ fontSize: '9px', fontWeight: '900', color: '#059669', textAlign: 'center', marginBottom: '2px', textTransform: 'uppercase' }}>Después del Servicio</p>
                                                <div style={{ flex: 1, border: '1.5px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {item.ot.fotoDespues ? <img src={item.ot.fotoDespues} alt="Después" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <span style={{ color: '#cbd5e1', fontSize: '10px' }}>SIN FOTO</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {/* Page Footer */}
                            <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '10px', color: '#64748b', borderTop: '2.5px solid #1e3a8a', paddingTop: '4px', fontWeight: 'bold' }}>
                                Sistemas de Información T-GESTIÓN — Generado por: {generatorName} — {new Date().toLocaleTimeString()} — Página {pageIdx + 2} de {Math.ceil(items.length / 2) + 1}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
