import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Check, CheckCheck, X, AlertCircle, Clipboard, Calendar, Pencil, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
    getNotificacionesNoLeidas,
    getNotificacionesLeidas,
    marcarComoLeida,
    marcarTodasComoLeidas,
} from '../services/notificationService';
import { useEscapeKey } from '../hooks/useEscapeKey';
import type { Notificacion } from '../services/notificationService';

const TIPO_CONFIG: Record<string, { color: string; icon: React.ElementType; bg: string }> = {
    NUEVA_OT: { color: '#ef4444', icon: AlertCircle, bg: 'rgba(239, 68, 68, 0.08)' },
    ASIGNACION_OT: { color: '#10b981', icon: Clipboard, bg: 'rgba(16, 185, 129, 0.08)' },
    MASIVA_PREVENTIVA: { color: '#6366f1', icon: Calendar, bg: 'rgba(99, 102, 241, 0.08)' },
    CAMBIO_OT: { color: '#f59e0b', icon: Pencil, bg: 'rgba(245, 158, 11, 0.08)' },
};

const formatFecha = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatFechaCompleta = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// ============================================================
// Tarjeta individual de notificación
// ============================================================
const NotifCard: React.FC<{
    notif: Notificacion;
    onMarcarLeida: (id: string) => void;
    onExpandir: (notif: Notificacion) => void;
    onClosePanel?: () => void;
}> = ({ notif, onMarcarLeida, onExpandir, onClosePanel }) => {
    const cfg = TIPO_CONFIG[notif.tipo] || TIPO_CONFIG.NUEVA_OT;
    const Icon = cfg.icon;

    const renderTitulo = () => {
        if (!notif.otNumero) return notif.titulo;
        
        // Buscamos si el título contiene el número de OT con el formato #1234
        const target = `#${notif.otNumero}`;
        if (!notif.titulo.includes(target)) return notif.titulo;

        const parts = notif.titulo.split(target);
        return (
            <>
                {parts[0]}
                <Link
                    to={`/kardex?ot=${notif.otNumero}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onClosePanel?.();
                    }}
                    style={{
                        color: cfg.color,
                        fontWeight: '800',
                        textDecoration: 'underline',
                        margin: '0 2px'
                    }}
                >
                    {target}
                </Link>
                {parts[1]}
            </>
        );
    };

    return (
        <div
            style={{
                display: 'flex',
                gap: '0.75rem',
                padding: '0.875rem 1rem',
                borderRadius: '12px',
                background: notif.leida ? 'transparent' : cfg.bg,
                borderLeft: `3px solid ${cfg.color}`,
                transition: 'all 0.2s',
                cursor: 'pointer',
                position: 'relative',
                opacity: notif.leida ? 0.75 : 1,
            }}
            onClick={() => onExpandir(notif)}
            onMouseOver={e => { if (!notif.leida) (e.currentTarget.style.background = `${cfg.bg.replace('0.08', '0.14')}`); }}
            onMouseOut={e => { if (!notif.leida) (e.currentTarget.style.background = cfg.bg); }}
        >
            <div style={{
                minWidth: '36px', height: '36px',
                borderRadius: '10px',
                background: `${cfg.color}22`,
                color: cfg.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
            }}>
                <Icon size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <p style={{
                        fontSize: '0.8rem',
                        fontWeight: notif.leida ? '500' : '700',
                        color: 'var(--text-main)',
                        margin: 0,
                        lineHeight: 1.3
                    }}>{renderTitulo()}</p>
                    <span style={{
                        fontSize: '0.6rem',
                        color: 'var(--text-muted)',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                    }}>{formatFecha(notif.fecha)}</span>
                </div>
                <p style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    margin: '4px 0 0',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical' as any,
                    overflow: 'hidden',
                }}>{notif.mensaje}</p>
                {notif.usuarioOrigenNombre && (
                    <p style={{ fontSize: '0.6rem', color: cfg.color, margin: '3px 0 0', fontWeight: '600' }}>
                        — {notif.usuarioOrigenNombre}
                    </p>
                )}
            </div>
            {!notif.leida && (
                <button
                    onClick={(e) => { e.stopPropagation(); onMarcarLeida(notif.id!); }}
                    title="Marcar como leída"
                    style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#10b981',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        fontSize: '0.6rem',
                        fontWeight: '700',
                        display: 'flex', alignItems: 'center', gap: '3px',
                        flexShrink: 0, alignSelf: 'center',
                        transition: 'all 0.15s'
                    }}
                >
                    <Check size={12} /> Leída
                </button>
            )}
        </div>
    );
};

// ============================================================
// Vista expandida (pantalla completa para móvil)
// ============================================================
const NotifExpandida: React.FC<{
    notif: Notificacion;
    onClose: () => void;
    onMarcarLeida: (id: string) => void;
    onFotoStateChange?: (isOpen: boolean) => void;
    onClosePanel?: () => void;
}> = ({ notif, onClose, onMarcarLeida, onFotoStateChange, onClosePanel }) => {
    const cfg = TIPO_CONFIG[notif.tipo] || TIPO_CONFIG.NUEVA_OT;
    const Icon = cfg.icon;
    const [fotoAbierta, setFotoAbierta] = React.useState<string | null>(null);

    const handleSetFotoAbierta = (url: string | null) => {
        setFotoAbierta(url);
        if (onFotoStateChange) onFotoStateChange(!!url);
    };

    // Esc para cerrar foto si está abierta
    useEscapeKey(() => handleSetFotoAbierta(null), !!fotoAbierta);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 20000,
            background: 'var(--bg-main)',
            display: 'flex', flexDirection: 'column',
            animation: 'slideInFromRight 0.25s ease'
        }}>
            {/* Header */}
            <div style={{
                padding: '1rem 1.25rem',
                background: 'var(--bg-card)',
                borderBottom: '1px solid var(--glass-border)',
                display: 'flex', alignItems: 'center', gap: '1rem'
            }}>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: '600' }}>
                    <X size={20} /> Volver
                </button>
                <h3 style={{ flex: 1, fontSize: '1rem', fontWeight: '700' }}>Detalle de Notificación</h3>
                {!notif.leida && (
                    <button
                        onClick={() => onMarcarLeida(notif.id!)}
                        style={{
                            background: '#10b981', border: 'none', color: 'white', borderRadius: '8px',
                            padding: '0.5rem 1rem', fontWeight: '700', fontSize: '0.8rem', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.4rem'
                        }}
                    >
                        <Check size={16} /> MARCAR COMO LEÍDA
                    </button>
                )}
            </div>

            {/* Cuerpo */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                {/* Encabezado */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '16px',
                        background: `${cfg.color}22`, color: cfg.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <Icon size={28} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: '800', margin: 0 }}>{notif.titulo}</h2>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                            {formatFechaCompleta(notif.fechaRegistro || notif.fecha)}
                        </p>
                    </div>
                </div>

                {/* Chips de metadata */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.5rem' }}>
                    {notif.otNumero && (
                        <Link 
                            to={`/kardex?ot=${notif.otNumero}`}
                            onClick={() => {
                                onClose();
                                onClosePanel?.();
                            }}
                            style={{ textDecoration: 'none' }}
                        >
                            <div style={{ ...metaChipStyle, borderColor: cfg.color, cursor: 'pointer', background: `${cfg.color}11` }}>
                                <span style={{ fontWeight: '700', color: cfg.color }}>OT #{notif.otNumero}</span>
                            </div>
                        </Link>
                    )}
                    {notif.sucursalNombre && <div style={metaChipStyle}>📍 {notif.sucursalNombre}</div>}
                    {notif.equipoNombre && <div style={metaChipStyle}>🔧 {notif.equipoNombre}</div>}
                    {notif.familiaNombre && <div style={metaChipStyle}>📂 {notif.familiaNombre}</div>}
                    {notif.usuarioOrigenNombre && <div style={metaChipStyle}>👤 {notif.usuarioOrigenNombre}</div>}
                    <div style={metaChipStyle}>{notif.leida ? '✅ Leída' : '🔴 No leída'}</div>
                </div>

                {/* DESCRIPCIÓN DE LA FALLA */}
                {notif.descripcionFalla && (
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: '16px', padding: '1.25rem',
                        border: '1px solid var(--glass-border)', marginBottom: '1rem',
                        borderLeft: `4px solid ${cfg.color}`
                    }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: '800', color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.5rem' }}>
                            DESCRIPCIÓN DE LA FALLA
                        </label>
                        <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-main)', margin: 0 }}>
                            {notif.descripcionFalla}
                        </p>
                    </div>
                )}

                {/* JUSTIFICACIÓN */}
                {notif.justificacion && (
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: '16px', padding: '1.25rem',
                        border: '1px solid var(--glass-border)', marginBottom: '1rem',
                        borderLeft: '4px solid #f59e0b'
                    }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: '800', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.5rem' }}>
                            JUSTIFICACIÓN DEL GERENTE
                        </label>
                        <p style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--text-main)', margin: 0, fontStyle: 'italic' }}>
                            "{notif.justificacion}"
                        </p>
                    </div>
                )}

                {/* FECHA Y HORA DE REGISTRO */}
                <div style={{
                    background: 'var(--bg-card)', borderRadius: '16px', padding: '1rem 1.25rem',
                    border: '1px solid var(--glass-border)', marginBottom: '1rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div>
                        <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>
                            FECHA Y HORA DE REGISTRO
                        </label>
                        <p style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                            {formatFechaCompleta(notif.fechaRegistro || notif.fecha)}
                        </p>
                    </div>
                </div>

                {/* RESUMEN/MENSAJE (para notifs que no tienen campos enriquecidos) */}
                {!notif.descripcionFalla && (
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: '16px', padding: '1.25rem',
                        border: '1px solid var(--glass-border)', marginBottom: '1rem'
                    }}>
                        <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-main)', margin: 0 }}>
                            {notif.mensaje}
                        </p>
                    </div>
                )}

                {/* FOTOS DE EVIDENCIA */}
                {notif.fotosUrls && notif.fotosUrls.length > 0 && (
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: '16px', padding: '1.25rem',
                        border: '1px solid var(--glass-border)', marginBottom: '1rem'
                    }}>
                        <label style={{ fontSize: '0.7rem', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '0.75rem' }}>
                            📷 EVIDENCIA FOTOGRÁFICA ({notif.fotosUrls.length})
                        </label>
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {notif.fotosUrls.map((url, i) => (
                                <div
                                    key={i}
                                    onClick={() => handleSetFotoAbierta(url)}
                                    style={{
                                        width: '120px', height: '90px', borderRadius: '12px',
                                        overflow: 'hidden', cursor: 'pointer',
                                        border: '2px solid var(--glass-border)',
                                        transition: 'all 0.2s',
                                        position: 'relative'
                                    }}
                                    onMouseOver={e => e.currentTarget.style.borderColor = '#6366f1'}
                                    onMouseOut={e => e.currentTarget.style.borderColor = 'var(--glass-border)'}
                                >
                                    <img src={url} alt={`Evidencia ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div style={{
                                        position: 'absolute', bottom: 0, left: 0, right: 0,
                                        background: 'rgba(0,0,0,0.6)', color: 'white',
                                        fontSize: '0.6rem', textAlign: 'center', padding: '2px',
                                        fontWeight: '700'
                                    }}>Foto {i + 1}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Visor de foto ampliada */}
            {fotoAbierta && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 25000,
                        background: 'rgba(0,0,0,0.95)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer'
                    }}
                    onClick={() => handleSetFotoAbierta(null)}
                >
                    <button
                        onClick={() => handleSetFotoAbierta(null)}
                        style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', padding: '0.5rem', cursor: 'pointer' }}
                    >
                        <X size={24} />
                    </button>
                    <img
                        src={fotoAbierta}
                        alt="Evidencia ampliada"
                        style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '12px' }}
                        onClick={e => e.stopPropagation()}
                    />
                    <button
                        onClick={(e) => { e.stopPropagation(); window.open(fotoAbierta!, '_blank'); }}
                        style={{
                            position: 'absolute', bottom: '1.5rem',
                            background: '#6366f1', border: 'none', color: 'white', borderRadius: '12px',
                            padding: '0.75rem 1.5rem', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer'
                        }}
                    >
                        Abrir en nueva pestaña
                    </button>
                </div>
            )}

            <style>{`
                @keyframes slideInFromRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

const metaChipStyle: React.CSSProperties = {
    padding: '0.4rem 0.75rem',
    borderRadius: '8px',
    background: 'var(--bg-glass)',
    border: '1px solid var(--glass-border)',
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'var(--text-main)',
};

// ============================================================
// COMPONENTE PRINCIPAL: NotificationsPanel (la campanita)
// ============================================================
export const NotificationsPanel: React.FC = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'no_leidas' | 'leidas'>('no_leidas');
    const [noLeidas, setNoLeidas] = useState<Notificacion[]>([]);
    const [leidas, setLeidas] = useState<Notificacion[]>([]);
    const [loading, setLoading] = useState(false);
    const [expandida, setExpandida] = useState<Notificacion | null>(null);
    const [fotoEnDetalleAbierta, setFotoEnDetalleAbierta] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Escapando stack: 
    // Si hay foto abierta en el detalle, no hacer nada aquí (el detalle lo maneja)
    // Si no hay foto but hay detalle, el Escape aquí cierra el detalle
    // Si no hay detalle but está la lista de notificaciones abierta, cierra la lista
    useEscapeKey(() => setExpandida(null), !!expandida && !fotoEnDetalleAbierta);
    useEscapeKey(() => setIsOpen(false), isOpen && !expandida);

    const cargarNotificaciones = useCallback(async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const [nl, l] = await Promise.all([
                getNotificacionesNoLeidas(user.id),
                getNotificacionesLeidas(user.id),
            ]);
            // Detectar nuevas notificaciones para push nativo
            if (nl.length > noLeidas.length && noLeidas.length > 0) {
                const newest = nl[0];
                if (newest && 'Notification' in window && Notification.permission === 'granted') {
                    new Notification(newest.titulo, {
                        body: newest.mensaje,
                        icon: '/favicon.ico',
                        tag: `ot-${newest.otNumero || 'new'}`,
                        requireInteraction: true,
                    } as NotificationOptions);
                }
            }
            setNoLeidas(nl);
            setLeidas(l);
        } catch (e) {
            console.error('Error cargando notificaciones:', e);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    // Cargar al abrir y cada 30 segundos + solicitar permiso de notificaciones
    useEffect(() => {
        cargarNotificaciones();
        const interval = setInterval(cargarNotificaciones, 30000);

        // Solicitar permiso de notificaciones nativas al montar
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        return () => clearInterval(interval);
    }, [cargarNotificaciones]);

    // Cerrar al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleMarcarLeida = async (id: string) => {
        await marcarComoLeida(id);
        setNoLeidas(prev => prev.filter(n => n.id !== id));
        const moved = noLeidas.find(n => n.id === id);
        if (moved) setLeidas(prev => [{ ...moved, leida: true }, ...prev]);
        if (expandida?.id === id) setExpandida({ ...expandida, leida: true });
    };

    const handleMarcarTodas = async () => {
        if (!user?.id) return;
        await marcarTodasComoLeidas(user.id);
        const ahora = new Date().toISOString();
        setLeidas(prev => [...noLeidas.map(n => ({ ...n, leida: true, leidaEn: ahora })), ...prev]);
        setNoLeidas([]);
    };

    const count = noLeidas.length;

    return (
        <div ref={panelRef} style={{ position: 'relative' }}>
            {/* Campanita */}
            <button
                onClick={() => { setIsOpen(!isOpen); if (!isOpen) cargarNotificaciones(); }}
                style={{
                    position: 'relative', background: 'transparent', border: 'none',
                    color: count > 0 ? '#ef4444' : 'var(--text-muted)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    transition: 'all 0.2s',
                    animation: count > 0 ? 'bellShake 2s infinite' : 'none'
                }}
                title={`${count} notificaciones sin leer`}
            >
                <Bell size={20} fill={count > 0 ? '#ef4444' : 'none'} />
                {count > 0 && (
                    <div style={{
                        position: 'absolute', top: '-6px', right: '-6px',
                        minWidth: '18px', height: '18px',
                        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                        borderRadius: '9px', color: 'white',
                        fontSize: '0.6rem', fontWeight: '800',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '0 4px',
                        boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                        animation: 'pulse 2s infinite'
                    }}>
                        {count > 99 ? '99+' : count}
                    </div>
                )}
            </button>

            {/* Panel desplegable */}
            {isOpen && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 12px)', right: '-12px',
                    width: 'min(420px, 92vw)',
                    maxHeight: '70vh',
                    background: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: '1px solid var(--glass-border)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(20px)',
                    zIndex: 10000,
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'fadeInScale 0.2s ease'
                }}>
                    {/* Header del panel */}
                    <div style={{
                        padding: '1rem 1.25rem 0.75rem',
                        borderBottom: '1px solid var(--glass-border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: '800', margin: 0, letterSpacing: '-0.01em' }}>
                            🔔 Notificaciones
                        </h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {count > 0 && (
                                <button
                                    onClick={handleMarcarTodas}
                                    style={{
                                        background: 'rgba(16, 185, 129, 0.1)', border: 'none',
                                        color: '#10b981', borderRadius: '6px', padding: '4px 8px',
                                        fontSize: '0.6rem', fontWeight: '700', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '3px'
                                    }}
                                >
                                    <CheckCheck size={12} /> Leer todas
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)' }}>
                        {(['no_leidas', 'leidas'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    flex: 1, padding: '0.6rem', border: 'none', cursor: 'pointer',
                                    background: activeTab === tab ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                                    color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
                                    fontWeight: activeTab === tab ? '700' : '500',
                                    fontSize: '0.72rem',
                                    borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {tab === 'no_leidas' ? <EyeOff size={14} /> : <Eye size={14} />}
                                {tab === 'no_leidas' ? `No leídas (${count})` : `Leídas (${leidas.length})`}
                            </button>
                        ))}
                    </div>

                    {/* Lista */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                        {loading ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                Cargando...
                            </div>
                        ) : (
                            <>
                                {activeTab === 'no_leidas' && noLeidas.length === 0 && (
                                    <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                                        <Bell size={32} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: '0.75rem' }} />
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '500' }}>
                                            ¡Todo al día! No tienes notificaciones pendientes.
                                        </p>
                                    </div>
                                )}
                                {activeTab === 'leidas' && leidas.length === 0 && (
                                    <div style={{ padding: '2.5rem 1rem', textAlign: 'center' }}>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin leídas en los últimos 15 días.</p>
                                    </div>
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    {(activeTab === 'no_leidas' ? noLeidas : leidas).map(n => (
                                        <NotifCard
                                            key={n.id}
                                            notif={n}
                                            onMarcarLeida={handleMarcarLeida}
                                            onExpandir={(notif) => { setExpandida(notif); }}
                                            onClosePanel={() => setIsOpen(false)}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Vista expandida (pantalla completa para móvil) */}
            {expandida && (
                <NotifExpandida
                    notif={expandida}
                    onClose={() => setExpandida(null)}
                    onMarcarLeida={handleMarcarLeida}
                    onFotoStateChange={setFotoEnDetalleAbierta}
                    onClosePanel={() => setIsOpen(false)}
                />
            )}

            <style>{`
                @keyframes bellShake {
                    0%, 100% { transform: rotate(0); }
                    10% { transform: rotate(12deg); }
                    20% { transform: rotate(-10deg); }
                    30% { transform: rotate(8deg); }
                    40% { transform: rotate(-6deg); }
                    50% { transform: rotate(0); }
                }
                @keyframes fadeInScale {
                    from { opacity: 0; transform: scale(0.95) translateY(-8px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.15); }
                }
            `}</style>
        </div>
    );
};
