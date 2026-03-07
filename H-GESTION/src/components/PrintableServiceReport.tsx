import React from 'react';
import { Printer, X } from 'lucide-react';
import type { WorkOrder, Cliente, Sucursal, Equipo, User } from '../types';

interface PrintableServiceReportProps {
    ot: WorkOrder;
    cliente: Cliente;
    sucursal: Sucursal;
    equipo: Equipo;
    tecnico?: User;
    onClose: () => void;
}

export const PrintableServiceReport: React.FC<PrintableServiceReportProps> = ({
    ot, cliente, sucursal, equipo, tecnico, onClose
}) => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="print-modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.9)', zIndex: 2000,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '2rem', overflowY: 'auto'
        }}>
            {/* Toolbar */}
            <div style={{
                width: '100%', maxWidth: '800px', display: 'flex',
                justifyContent: 'space-between', marginBottom: '1rem',
                background: '#1e293b', padding: '1rem', borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)', position: 'sticky', top: 0, zIndex: 10
            }}>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={handlePrint} className="btn btn-primary" style={{ background: '#22c55e' }}>
                        <Printer size={18} /> IMPRIMIR REPORTE (CARTA)
                    </button>
                </div>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
                    <X size={24} />
                </button>
            </div>

            {/* Hoja Tamaño Carta */}
            <div id="printable-area" style={{
                width: '210mm', minHeight: '297mm',
                background: 'white', color: '#1a1a1a',
                padding: '10mm 12mm', boxShadow: '0 0 30px rgba(0,0,0,0.5)',
                position: 'relative', fontFamily: 'Arial, sans-serif',
                display: 'flex', flexDirection: 'column'
            }}>
                <style>{`
                    @media print {
                        @page {
                            size: letter;
                            margin: 0;
                        }
                        body { background: white !important; }
                        body * { visibility: hidden; }
                        #printable-area, #printable-area * { visibility: visible; }
                        #printable-area { 
                            position: fixed; left: 0; top: 0; width: 216mm; height: 279mm;
                            margin: 0; padding: 8mm 10mm; box-shadow: none;
                            display: flex !important; flex-direction: column !important;
                        }
                        .no-print { display: none !important; }
                    }
                    .black-ink-signature {
                        filter: invert(1) grayscale(1) contrast(5);
                        mix-blend-mode: multiply;
                    }
                `}</style>

                {/* Encabezado */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '3px solid #1e3a8a', paddingBottom: '0.75rem', marginBottom: '1.5rem' }}>
                    <div>
                        <h1 style={{ fontSize: '32px', fontWeight: '900', color: '#1e3a8a', margin: 0, lineHeight: '1' }}>H-GESTION</h1>
                        <p style={{ fontSize: '11px', color: '#666', margin: '6px 0', letterSpacing: '1.5px', fontWeight: '700' }}>SOLUCIONES DE LOGÍSTICA Y TRANSPORTE</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <h2 style={{ fontSize: '22px', fontWeight: '700', margin: 0, color: '#334155' }}>HOJA DE SERVICIO</h2>
                        <p style={{ fontSize: '18px', fontWeight: '900', color: '#ef4444', margin: '2px 0' }}>OT #{ot.numero}</p>
                    </div>
                </div>

                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Bloque de Datos Generales */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ padding: '0.875rem', border: '1.5px solid #cbd5e1', borderRadius: '4px', background: '#f8fafc' }}>
                            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '4px' }}>DATOS DEL CLIENTE</p>
                            <p style={{ fontSize: '14px', margin: '4px 0' }}><b>CLIENTE:</b> {cliente.nombre}</p>
                            <p style={{ fontSize: '14px', margin: '4px 0' }}><b>SUCURSAL:</b> {sucursal.nombre}</p>
                            <p style={{ fontSize: '12px', margin: '4px 0', color: '#334155' }}><b>DIRECCIÓN:</b> {sucursal.direccion}</p>
                        </div>
                        <div style={{ padding: '0.875rem', border: '1.5px solid #cbd5e1', borderRadius: '4px', background: '#f8fafc' }}>
                            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '4px' }}>INFORMACIÓN DEL SERVICIO</p>
                            <p style={{ fontSize: '14px', margin: '4px 0' }}><b>FECHA SOLICITUD:</b> {new Date(ot.fechas.solicitada).toLocaleDateString()}</p>
                            <p style={{ fontSize: '14px', margin: '4px 0' }}><b>ESTATUS:</b> {ot.estatus?.toUpperCase()}</p>
                            <p style={{ fontSize: '14px', margin: '4px 0' }}><b>TIPO:</b> {ot.tipo || 'CORECCIÓN'}</p>
                        </div>
                    </div>

                    {/* Bloque de Equipo */}
                    <div style={{ padding: '0.875rem', border: '1.5px solid #cbd5e1', borderRadius: '4px' }}>
                        <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '4px' }}>DETALLES DEL EQUIPO ATENDIDO</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1.5rem' }}>
                            <p style={{ fontSize: '14px', margin: '2px 0' }}><b>NOMBRE:</b> {equipo.nombre}</p>
                            <p style={{ fontSize: '14px', margin: '2px 0' }}><b>FAMILIA:</b> {equipo.familia}</p>
                            <p style={{ fontSize: '14px', margin: '2px 0' }}><b>ID:</b> {equipo.id}</p>
                        </div>
                    </div>

                    {/* Reporte Técnico */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', flexGrow: 0.3 }}>
                        <div style={{ padding: '0.875rem', border: '1.5px solid #cbd5e1', borderRadius: '4px', display: 'flex', flexDirection: 'column' }}>
                            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '4px' }}>DESCRIPCIÓN DEL TRABAJO REALIZADO</p>
                            <p style={{ fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: '#1e293b', flexGrow: 1 }}>{ot.descripcionServicio || 'No se registraron comentarios técnicos.'}</p>
                        </div>
                        <div style={{ padding: '0.875rem', border: '1.5px solid #cbd5e1', borderRadius: '4px', display: 'flex', flexDirection: 'column' }}>
                            <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '8px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '4px' }}>REPUESTOS / MATERIALES</p>
                            <p style={{ fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', color: '#1e293b', flexGrow: 1 }}>{ot.repuestosUtilizados || 'N/A'}</p>
                        </div>
                    </div>

                    {/* Evidencia Fotográfica */}
                    <div style={{ flexGrow: 0.5, display: 'flex', flexDirection: 'column' }}>
                        <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#1e3a8a', textTransform: 'uppercase', marginBottom: '10px', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '4px' }}>REGISTRO FOTOGRÁFICO DE EVIDENCIA</p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', flexGrow: 1 }}>
                            {[
                                { label: 'ANTES DEL SERVICIO', url: ot.fotoAntes },
                                { label: 'DESPUÉS DEL SERVICIO', url: ot.fotoDespues },
                                { label: 'EVIDENCIA ADICIONAL', url: ot.fotoExtra }
                            ].map((photo, i) => (
                                <div key={i} style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{
                                        width: '100%', flexGrow: 1, minHeight: '160px', border: '1px solid #cbd5e1',
                                        background: '#f1f5f9', borderRadius: '6px', overflow: 'hidden',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {photo.url ? (
                                            <img src={photo.url} alt={photo.label} style={{ width: '95%', height: '95%', objectFit: 'contain' }} />
                                        ) : (
                                            <p style={{ fontSize: '11px', color: '#94a3b8' }}>SIN FOTO</p>
                                        )}
                                    </div>
                                    <p style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '6px', color: '#475569' }}>{photo.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Firmas de Conformidad */}
                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-around', gap: '2rem', padding: '0 1rem' }}>
                    <div style={{ textAlign: 'center', width: '200px' }}>
                        <div style={{ height: '110px', borderBottom: '2.5px solid #1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {ot.firmaTecnico && <img src={ot.firmaTecnico} alt="Firma Técnico" className="black-ink-signature" style={{ height: '105px', maxWidth: '180px', objectFit: 'contain' }} />}
                        </div>
                        <p style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>{tecnico?.nombre || 'TÉCNICO ASIGNADO'}</p>
                        <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>FIRMA DEL TÉCNICO</p>
                    </div>
                    <div style={{ textAlign: 'center', width: '200px' }}>
                        <div style={{ height: '110px', borderBottom: '2.5px solid #1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {ot.firmaCliente && <img src={ot.firmaCliente} alt="Firma Cliente" className="black-ink-signature" style={{ height: '105px', maxWidth: '180px', objectFit: 'contain' }} />}
                        </div>
                        <p style={{ fontSize: '13px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>{ot.comentariosCliente || 'CLIENTE / RECEPCIÓN'}</p>
                        <p style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>FIRMA DE CONFORMIDAD</p>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    marginTop: '2rem',
                    fontSize: '11px', color: '#94a3b8', textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px', fontWeight: '500'
                }}>
                    Documento original de H-GESTION - Generado el {new Date().toLocaleString()}
                </div>
            </div>
        </div>
    );
};
