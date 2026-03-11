import React from 'react';
import { Printer, X, Download } from 'lucide-react';
import type { WorkOrder, Cliente, Sucursal, Equipo, User, Franquicia } from '../types';

interface PrintableServiceReportProps {
    ot: WorkOrder;
    cliente: Cliente;
    sucursal: Sucursal;
    franquicia?: Franquicia;
    equipo: Equipo;
    tecnico?: User;
    onClose: () => void;
    onGeneratePdf?: () => void;
    generating?: boolean;
}

export const PrintableServiceReport: React.FC<PrintableServiceReportProps> = ({
    ot, cliente, sucursal, franquicia, equipo, tecnico, onClose, onGeneratePdf, generating
}) => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="print-modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)', zIndex: 2000,
            overflow: 'auto',
            padding: '2rem'
        }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', minWidth: 'fit-content' }}>
                {/* Toolbar */}
                <div className="no-print" style={{
                    width: '100%', maxWidth: '800px', display: 'flex',
                    justifyContent: 'space-between', marginBottom: '1rem',
                    background: '#1e293b', padding: '1rem', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.1)', position: 'sticky', top: 0, zIndex: 10
                }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button onClick={handlePrint} className="btn btn-primary" style={{ background: '#22c55e' }}>
                            <Printer size={18} /> IMPRIMIR (CARTA)
                        </button>
                        {onGeneratePdf && (
                            <button
                                onClick={onGeneratePdf}
                                className="btn btn-primary"
                                style={{ background: '#2563eb', opacity: generating ? 0.6 : 1 }}
                                disabled={generating}
                            >
                                <Download size={18} /> {generating ? 'GENERANDO...' : 'GENERA PDF'}
                            </button>
                        )}
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Hoja Tamaño Carta */}
                <div id="printable-area" style={{
                    width: '8.5in', height: '11in',
                    boxSizing: 'border-box',
                    background: 'white', color: '#1a1a1a',
                    padding: '0.4in 0.5in', boxShadow: '0 0 30px rgba(0,0,0,0.5)',
                    position: 'relative', fontFamily: 'Arial, sans-serif',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    <style>{`
                    @media print {
                        @page {
                            size: letter;
                            margin: 0; /* Sin márgenes del navegador para no generar hojas extra */
                        }
                        
                        /* Esta regla es CRÍTICA para matar las 2 hojas extra en blanco */
                        html, body { 
                            background: white !important; 
                            margin: 0 !important; 
                            padding: 0 !important; 
                            width: 215.9mm !important;
                            height: 279.4mm !important; 
                            overflow: hidden !important; 
                            page-break-inside: avoid !important;
                        }

                        body * { visibility: hidden; }
                        
                        .print-modal-overlay {
                            position: absolute !important;
                            top: 0 !important;
                            left: 0 !important;
                            width: 215.9mm !important;
                            height: 279.4mm !important;
                            overflow: hidden !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            background: transparent !important;
                        }
                        
                        #printable-area, #printable-area * { visibility: visible; }
                        #printable-area { 
                            position: absolute !important; 
                            /* Restauramos el título al área visible */
                            left: 0 !important; 
                            top: 0 !important; 
                            
                            /* Escala estándar para evitar que se salga del área */
                            transform: scale(1.0) !important;
                            transform-origin: top left !important;
                            
                            width: 215.9mm !important; 
                            height: 279.4mm !important;
                            
                            box-sizing: border-box !important;
                            margin: 0 !important; 
                            padding: 5mm 15mm 10mm 15mm !important; 
                            box-shadow: none !important;
                            display: flex !important; 
                            flex-direction: column !important;
                            overflow: hidden !important;
                        }
                        .no-print { display: none !important; height: 0 !important; overflow: hidden !important; }
                    }
                    .black-ink-signature {
                        filter: invert(1) contrast(3) brightness(0.4);
                        image-rendering: pixelated;
                    }
                `}</style>

                    {/* Encabezado */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3mm solid #1e3a8a', paddingBottom: '5mm', marginBottom: '8mm', marginTop: 0 }}>
                        <div style={{ flex: 1 }}>
                            <h1 style={{ fontSize: '32px', fontWeight: '950', color: '#1e3a8a', margin: 0, padding: 0, lineHeight: '0.8', letterSpacing: '-1px' }}>T-GESTIÓN</h1>
                            <p style={{ fontSize: '9px', color: '#64748b', margin: '5px 0 0 1px', letterSpacing: '1.5px', fontWeight: '800', textTransform: 'uppercase' }}>Logística y Mantenimiento</p>
                        </div>
                        <div style={{ flex: 1, textAlign: 'center' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: '#334155' }}>HOJA DE SERVICIO</h2>
                        </div>
                        <div style={{ flex: 1, textAlign: 'right', display: 'flex', justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: '20px', fontWeight: '900', color: ot.prioridad === 'ALTA' ? '#ef4444' : ot.prioridad === 'MEDIA' ? '#F59E0B' : '#22c55e' }}>{ot.tipo === 'Preventivo' ? `OT P-${ot.numero}` : `OT #${ot.numero}`}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {/* Bloque de Datos Generales */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.8rem' }}>
                            <div style={{ padding: '0.5rem 0.8rem', border: '1.5px solid #cbd5e1', borderRadius: '4px', background: '#f8fafc' }}>
                                <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '6px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '3px' }}>FRANQUICIA Y SUCURSAL</p>
                                <p style={{ fontSize: '14px', margin: '6px 0', display: 'flex', gap: '8px' }}>
                                    <span style={{ fontWeight: 'bold', minWidth: '95px' }}>FRANQUICIA:</span>
                                    <span>{franquicia?.nombre || cliente.nombre}</span>
                                </p>
                                <p style={{ fontSize: '14px', margin: '6px 0', display: 'flex', gap: '8px' }}>
                                    <span style={{ fontWeight: 'bold', minWidth: '95px' }}>SUCURSAL:</span>
                                    <span>{sucursal.nombre}</span>
                                </p>
                                <p style={{ fontSize: '12px', margin: '6px 0', color: '#334155', display: 'flex', gap: '8px' }}>
                                    <span style={{ fontWeight: 'bold', minWidth: '95px' }}>DIRECCIÓN:</span>
                                    <span>{sucursal.direccion}</span>
                                </p>
                            </div>
                            <div style={{ padding: '0.5rem 0.8rem', border: '1.5px solid #cbd5e1', borderRadius: '4px', background: '#f8fafc' }}>
                                <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '6px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '3px' }}>INFORMACIÓN DEL SERVICIO</p>
                                <p style={{ fontSize: '14px', margin: '6px 0', display: 'flex', gap: '8px' }}>
                                    <span style={{ fontWeight: 'bold', minWidth: '130px' }}>FECHA SOLICITUD:</span>
                                    <span>{new Date(ot.fechas.solicitada).toLocaleDateString()}</span>
                                </p>
                                <p style={{ fontSize: '14px', margin: '6px 0', display: 'flex', gap: '8px' }}>
                                    <span style={{ fontWeight: 'bold', minWidth: '130px' }}>ESTATUS:</span>
                                    <span style={{ fontWeight: '800' }}>{ot.estatus?.toUpperCase()}</span>
                                </p>
                                <p style={{ fontSize: '14px', margin: '6px 0', display: 'flex', gap: '8px' }}>
                                    <span style={{ fontWeight: 'bold', minWidth: '130px' }}>TIPO:</span>
                                    <span>{ot.tipo || 'CORRECTIVO'}</span>
                                </p>
                            </div>
                        </div>

                        {/* Bloque de Equipo */}
                        <div style={{ padding: '0.6rem 0.8rem', border: '1.5px solid #cbd5e1', borderRadius: '4px' }}>
                            <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '6px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '3px' }}>DETALLES DEL EQUIPO ATENDIDO</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                                <p style={{ fontSize: '14px', margin: '2px 0' }}><b>NOMBRE:</b> {equipo.nombre}</p>
                                <p style={{ fontSize: '14px', margin: '2px 0' }}><b>FAMILIA:</b> {(() => {
                                    const map: Record<string, string> = {
                                        'ESP_REFRIGERACION': 'Refrigeración',
                                        'ESP_COCCION': 'Cocción',
                                        'ESP_GENERADORES': 'Generadores',
                                        'ESP_AGUA': 'Agua',
                                        'ESP_AIRES': 'Aires',
                                        'ESP_COCINA': 'Cocina',
                                        'ESP_RESTAURANTE': 'Restaurante',
                                        'ESP_LOCAL': 'Local'
                                    };
                                    return map[equipo.familia] || equipo.familia;
                                })()}</p>
                            </div>
                        </div>

                        {/* Reporte Técnico */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '0.8rem' }}>
                            <div style={{ padding: '0.4rem 0.6rem', border: '1.5px solid #cbd5e1', borderRadius: '4px', display: 'flex', flexDirection: 'column' }}>
                                <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '4px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '2px' }}>DESCRIPCIÓN DEL TRABAJO REALIZADO</p>
                                <p style={{ fontSize: '12px', lineHeight: '1.3', whiteSpace: 'pre-wrap', color: '#1e293b' }}>{ot.descripcionServicio || 'No se registraron comentarios técnicos.'}</p>
                            </div>
                            <div style={{ padding: '0.4rem 0.6rem', border: '1.5px solid #cbd5e1', borderRadius: '4px', display: 'flex', flexDirection: 'column' }}>
                                <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '4px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '2px' }}>REPUESTOS / MATERIALES</p>
                                <p style={{ fontSize: '12px', lineHeight: '1.3', whiteSpace: 'pre-wrap', color: '#1e293b' }}>{ot.repuestosUtilizados || 'N/A'}</p>
                            </div>
                        </div>

                        {/* Evidencia Fotográfica */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <p style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '4px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '2px' }}>EVIDENCIA FOTOGRÁFICA</p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
                                {[
                                    { url: ot.fotoAntes },
                                    { url: ot.fotoDespues },
                                    { url: ot.fotoExtra }
                                ].map((photo, i) => (
                                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                                        <div style={{
                                            width: '100%', height: '220px', border: '1.5px solid #cbd5e1',
                                            background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {photo.url ? (
                                                <img src={photo.url} alt="Evidencia" style={{ width: '100%', height: '100%', objectFit: 'contain', imageOrientation: 'from-image' }} />
                                            ) : (
                                                <p style={{ fontSize: '9px', color: '#94a3b8' }}>SIN FOTO</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Firmas de Conformidad */}
                    <div style={{ marginTop: '0', paddingTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '4rem', padding: '0 1rem' }}>
                        <div style={{ textAlign: 'center', width: '200px' }}>
                            <div style={{ height: '80px', borderBottom: '2px solid #1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {ot.firmaTecnico && <img src={ot.firmaTecnico} alt="Firma Técnico" className="black-ink-signature" style={{ height: '75px', maxWidth: '180px', objectFit: 'contain', imageOrientation: 'from-image' }} />}
                            </div>
                            <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>{tecnico?.nombre || 'TÉCNICO ASIGNADO'}</p>
                            <p style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>FIRMA DEL TÉCNICO</p>
                        </div>
                        <div style={{ textAlign: 'center', width: '200px' }}>
                            <div style={{ height: '80px', borderBottom: '2px solid #1e293b', marginBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {ot.firmaCliente && <img src={ot.firmaCliente} alt="Firma Cliente" className="black-ink-signature" style={{ height: '75px', maxWidth: '180px', objectFit: 'contain', imageOrientation: 'from-image' }} />}
                            </div>
                            <p style={{ fontSize: '12px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>{ot.comentariosCliente || 'CLIENTE / RECEPCIÓN'}</p>
                            <p style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>FIRMA DE CONFORMIDAD</p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{
                        marginTop: '0.5rem',
                        fontSize: '11px', color: '#94a3b8', textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '8px', fontWeight: '500'
                    }}>
                        Documento original de T-GESTION - Generado el {new Date().toLocaleString()}
                    </div>
                </div>
            </div>
        </div>
    );
};
