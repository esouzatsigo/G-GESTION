import React, { useEffect } from 'react';
import { X, FileText, AlertCircle, Info } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import type { WorkOrder } from '../types';

interface BIDrillDownModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    orders: WorkOrder[];
}

export const BIDrillDownModal: React.FC<BIDrillDownModalProps> = ({
    isOpen, onClose, title, subtitle, orders
}) => {

    useEscapeKey(onClose, isOpen);

    useEffect(() => {
        if (!isOpen) return;
        // Bloquear scroll del fondo para que el usuario se enfoque en el detalle
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        /* Contenedor fijo que ocupa TODA la pantalla visible */
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>

            {/* Backdrop con desenfoque profundo */}
            <div
                onClick={onClose}
                style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', transition: 'all 0.3s' }}
            />

            {/* Panel Principal Compacto */}
            <div
                className="animate-scale-up"
                style={{
                    position: 'relative',
                    zIndex: 10,
                    width: '100%',
                    maxWidth: '850px', // Un poco más ancho para evitar scroll horizontal
                    maxHeight: '80vh', // Reducido un poco para no saturar
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '24px',
                    boxShadow: '0 40px 80px -20px rgba(0,0,0,0.85)',
                    overflow: 'hidden'
                }}
            >
                {/* Acento superior sutil */}
                <div style={{ height: '4px', background: 'linear-gradient(90deg, var(--primary), #8b5cf6, #10b981)', flexShrink: 0 }} />

                {/* Header Compacto */}
                <div style={{ padding: '1.25rem 1.75rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ background: 'linear-gradient(135deg, var(--primary), #6366f1)', color: 'white', padding: '0.5rem', borderRadius: '12px', boxShadow: '0 4px 10px rgba(79,70,229,0.2)' }}>
                            <FileText size={18} />
                        </div>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.1rem' }}>
                                <h2 style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--text-main)', letterSpacing: '-0.01em' }}>{title}</h2>
                                <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: 'var(--bg-switch)', color: 'var(--primary-light)', borderRadius: '6px', border: '1px solid var(--glass-border)', fontWeight: '800', display: 'flex', alignItems: 'center' }}>
                                    {orders.length} OT{orders.length !== 1 ? 's' : ''}
                                </span>
                            </div>
                            {subtitle && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.05rem' }}>{subtitle}</p>}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem', borderRadius: '10px', transition: 'all 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body Compacto con Scroll */}
                <div style={{ overflowY: 'auto', flex: 1, padding: '0' }} className="custom-scrollbar">
                    {orders.length === 0 ? (
                        <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                            <AlertCircle size={40} color="var(--text-muted)" style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Sin registros encontrados.</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, tableLayout: 'fixed' }}>
                            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 10 }}>
                                <tr style={{ background: 'rgba(0,0,0,0.15)' }}>
                                    <th style={{ width: '100px', padding: '0.8rem 1.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--glass-border)' }}>Folio</th>
                                    <th style={{ width: '110px', padding: '0.8rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--glass-border)' }}>Tipo</th>
                                    <th style={{ padding: '0.8rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--glass-border)' }}>Estatus</th>
                                    <th style={{ width: '120px', padding: '0.8rem 1.5rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--glass-border)' }}>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((ot, idx) => (
                                    <tr
                                        key={idx}
                                        style={{ transition: 'all 0.1s', cursor: 'default' }}
                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td
                                            onClick={() => window.open(`/kardex?ot=${ot.numero}`, '_blank')}
                                            style={{
                                                padding: '0.75rem 1.5rem',
                                                fontWeight: '900',
                                                color: 'var(--primary)',
                                                fontFamily: 'monospace',
                                                borderBottom: '1px solid rgba(255,255,255,0.02)',
                                                cursor: 'pointer',
                                                textDecoration: 'underline',
                                                textUnderlineOffset: '3px',
                                                fontSize: '0.85rem'
                                            }}
                                            title="Ir al Kardex"
                                        >
                                            {ot.tipo === 'Preventivo' ? `P-${ot.numero}` : (ot.numero || ot.id?.slice(-6))}
                                        </td>
                                        <td style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                            <span style={{
                                                fontSize: '0.62rem',
                                                fontWeight: '900',
                                                padding: '0.2rem 0.5rem',
                                                borderRadius: '6px',
                                                background: ot.tipo === 'Correctivo' ? 'rgba(79,70,229,0.1)' : 'rgba(16,185,129,0.1)',
                                                color: ot.tipo === 'Correctivo' ? '#a5b4fc' : '#6ee7b7',
                                                border: `1px solid ${ot.tipo === 'Correctivo' ? 'rgba(79,70,229,0.15)' : 'rgba(16,185,129,0.15)'}`
                                            }}>
                                                {ot.tipo?.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.75rem', color: 'var(--text-main)', fontWeight: '500', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.02)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: ot.estatus?.includes('concluida') || ot.estatus?.includes('Finalizada') ? '#10b981' : '#F59E0B', flexShrink: 0 }} />
                                                {ot.estatus}
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                            {ot.fechas?.solicitada ? new Date(ot.fechas.solicitada).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer Compacto */}
                <div style={{ padding: '1rem 1.75rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                        <Info size={12} />
                        <span>ESC para cerrar</span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'linear-gradient(135deg, var(--primary), #4f46e5)',
                            color: 'white',
                            border: 'none',
                            padding: '0.5rem 1.5rem',
                            borderRadius: '10px',
                            fontWeight: '900',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 10px rgba(79,70,229,0.2)',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        LISTO
                    </button>
                </div>
            </div>
        </div>
    );
};
