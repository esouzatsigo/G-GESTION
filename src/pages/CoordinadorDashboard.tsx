import React, { useEffect, useState } from 'react';

import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc
} from 'firebase/firestore';
import { updateOTStatus, updateOTWithAudit } from '../services/dataService';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { tenantQuery } from '../services/tenantContext';
import {
    Clock,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    X,
    History,
    AlertCircle
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useEscapeKey } from '../hooks/useEscapeKey';
import type { WorkOrder, User, Sucursal, Equipo, Franquicia } from '../types';

// Carrusel Infinito para evidencia del Gerente
const EvidenceCarousel: React.FC<{ photos: string[] }> = ({ photos }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!photos || photos.length === 0) return <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-input)', borderRadius: '12px', color: 'var(--text-muted)' }}>Sin fotos de evidencia</div>;

    const next = () => setCurrentIndex((currentIndex + 1) % photos.length);
    const prev = () => setCurrentIndex((currentIndex - 1 + photos.length) % photos.length);

    return (
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', borderRadius: '12px' }}>
            <img
                src={encodeURI(photos[currentIndex])}
                alt="Evidencia"
                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                onClick={() => window.open(encodeURI(photos[currentIndex]), '_blank')}
                title="Click para ver en pantalla completa"
            />
            <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-switch)', padding: '4px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-main)' }}>
                {currentIndex + 1} / {photos.length}
            </div>
            <button onClick={prev} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', background: 'var(--bg-input)', border: 'none', color: 'var(--text-main)', borderRadius: '50%', padding: '8px', cursor: 'pointer' }}>
                <ChevronLeft size={20} />
            </button>
            <button onClick={next} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'var(--bg-input)', border: 'none', color: 'var(--text-main)', borderRadius: '50%', padding: '8px', cursor: 'pointer' }}>
                <ChevronRight size={20} />
            </button>
        </div>
    );
};

export const CoordinadorDashboard: React.FC = () => {
    const [ots, setOts] = useState<WorkOrder[]>([]);
    const [tecnicos, setTecnicos] = useState<User[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [franquicias, setFranquicias] = useState<Franquicia[]>([]);
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [loading, setLoading] = useState(true);
    const [bitacora, setBitacora] = useState<any[]>([]);
    const [asignando, setAsignando] = useState(false);

    const { showNotification } = useNotification();
    const { user, activeClienteId } = useAuth();

    // Asignación State
    const [selectedOT, setSelectedOT] = useState<WorkOrder | null>(null);
    const [prioridad, setPrioridad] = useState<WorkOrder['prioridad']>('MEDIA');
    const [tecnicoId, setTecnicoId] = useState('');
    const [fechaProgramada, setFechaProgramada] = useState('');
    const [horaProgramada, setHoraProgramada] = useState('');

    // Flexibilidad de Norma
    const [flexibilidadRequiereJustif, setFlexibilidadRequiereJustif] = useState(false);
    const [justificacionFlexibilidad, setJustificacionFlexibilidad] = useState('');

    const fetchData = React.useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [otSnap, userSnap, sucSnap, fSnap, eqSnap] = await Promise.all([
                getDocs(tenantQuery('ordenesTrabajo', user, where('estatus', '==', 'Pendiente'))),
                getDocs(tenantQuery('usuarios', user, where('rol', 'in', ['Tecnico', 'TecnicoExterno', 'ROL_TECNICO', 'ROL_TECNICO_EXTERNO']))),
                getDocs(tenantQuery('sucursales', user)),
                getDocs(tenantQuery('franquicias', user)),
                getDocs(tenantQuery('equipos', user))
            ]);

            const fetchedOts = otSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkOrder));
            // Ordenar cronológicamente (más antigua primero)
            fetchedOts.sort((a, b) => new Date(a.fechas.solicitada).getTime() - new Date(b.fechas.solicitada).getTime());
            setOts(fetchedOts);
            setTecnicos(userSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
            setSucursales(sucSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sucursal)));
            setFranquicias(fSnap.docs.map(d => ({ id: d.id, ...d.data() } as Franquicia)));
            setEquipos(eqSnap.docs.map(d => ({ id: d.id, ...d.data() } as Equipo)));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [user, activeClienteId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEscapeKey(() => setSelectedOT(null), !!selectedOT);

    useEffect(() => {
        const fetchAudit = async () => {
            if (!selectedOT) {
                setBitacora([]);
                return;
            }
            const q = query(collection(db, 'bitacora'), where('otId', '==', selectedOT.id));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            setBitacora(data);
        };
        fetchAudit();
    }, [selectedOT]);

    const handleAssign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOT) return;

        // VALIDACIÓN DE CAMPOS MANDATORIOS
        if (!tecnicoId) {
            showNotification("Seleccione un técnico responsable para la orden.", "warning");
            return;
        }
        if (!fechaProgramada) {
            showNotification("Debe asignar una fecha programada para el servicio.", "warning");
            return;
        }
        if (!horaProgramada) {
            showNotification("Debe asignar una hora programada para el servicio.", "warning");
            return;
        }

        setAsignando(true);

        try {
            // --- REGLA DE NEGOCIO: Especialidad de Técnico ---
            const tec = tecnicos.find(t => t.id === tecnicoId);
            const equipo = equipos.find(e => e.id === selectedOT.equipoId);

            const normalize = (s: string | undefined) => s?.trim().toLowerCase() || '';
            const tecSpec = normalize(tec?.especialidad);
            const eqFam = normalize(equipo?.familia);

            if (tecSpec && tecSpec !== eqFam) {
                if (!flexibilidadRequiereJustif) {
                    setAsignando(false);
                    setFlexibilidadRequiereJustif(true);
                    return;
                }
                if (flexibilidadRequiereJustif && justificacionFlexibilidad.trim().length < 5) {
                    showNotification("Debe ingresar una justificación válida para flexibilizar la norma.", "warning");
                    setAsignando(false);
                    return;
                }
            }

            // CONTROL DE CONCURRENCIA: Verificar que la OT no haya cambiado mientras el Coordinador la revisaba
            const currentOTSnap = await getDoc(doc(db, 'ordenesTrabajo', selectedOT.id));
            if (currentOTSnap.exists()) {
                const currentOT = { id: currentOTSnap.id, ...currentOTSnap.data() } as WorkOrder;
                const fieldChanged = (
                    currentOT.descripcionFalla !== selectedOT.descripcionFalla ||
                    currentOT.justificacion !== selectedOT.justificacion ||
                    JSON.stringify(currentOT.fotosGerente) !== JSON.stringify(selectedOT.fotosGerente)
                );

                if (fieldChanged) {
                    showNotification("¡ALTO! El Gerente modificó esta OT mientras estaba en pantalla. Se ha recargado con la nueva información. Por favor, revise de nuevo.", "error");
                    setSelectedOT(currentOT); // Actualiza la pantalla para que lo vea
                    setAsignando(false);
                    return; // Abortar guardado
                }
            }

            if (user) {
                // Si hubo flexibilidad, lo registramos en audito especial
                const auditMensaje = flexibilidadRequiereJustif
                    ? `Asignación por Flexibilidad: ${justificacionFlexibilidad} (Técnico: ${tec?.nombre} [${tec?.especialidad}], Familia Equipo: ${equipo?.familia})`
                    : 'Asignación de Técnico y Horario';

                // Primero actualizar campos programados y técnico
                await updateOTWithAudit(selectedOT.id, selectedOT, {
                    prioridad: prioridad,
                    tecnicoId,
                    fechas: {
                        ...selectedOT.fechas,
                        programada: `${fechaProgramada}T${horaProgramada}:00`
                    }
                }, user, auditMensaje);

                // Luego cambiar estatus
                await updateOTStatus(selectedOT.id, 'Asignada', user, {
                    'fechas.asignada': new Date().toISOString()
                });
            }
            setSelectedOT(null);
            setFlexibilidadRequiereJustif(false);
            setJustificacionFlexibilidad('');
            fetchData();
            showNotification("OT Asignada correctamente.", "success");
        } catch (error) {
            showNotification("Error al asignar OT.", "error");
        } finally {
            setAsignando(false);
        }
    };

    // Reset flex modal when changing tech
    useEffect(() => {
        setFlexibilidadRequiereJustif(false);
        setJustificacionFlexibilidad('');
    }, [tecnicoId]);

    return (
        <div className="animate-fade">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Asignaciones Pendientes</h1>
                <p style={{ color: 'var(--text-muted)' }}>Órdenes de trabajo esperando prioridad y técnico.</p>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando asignaciones...</div>
            ) : ots.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <CheckCircle2 size={48} color="var(--status-concluida)" style={{ marginBottom: '1rem' }} />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>¡Todo al día!</h2>
                    <p style={{ color: 'var(--text-muted)' }}>No hay solicitudes de mantenimiento pendientes de asignar.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
                    {ots.map(ot => {
                        const suc = sucursales.find(s => s.id === ot.sucursalId);
                        const fran = franquicias.find(f => f.id === suc?.franquiciaId);
                        const eq = equipos.find(e => e.id === ot.equipoId);
                        return (
                            <div key={ot.id} className="glass-card animate-fade" style={{ borderLeft: '4px solid var(--primary)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <button
                                        onClick={() => window.open(`/kardex?ot=${ot.numero}`, '_blank')}
                                        style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)', textDecoration: 'underline' }}
                                    >
                                        {ot.tipo === 'Preventivo' ? `P-${ot.numero}` : `OT #${ot.numero}`}
                                    </button>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                            <Clock size={12} />
                                            {new Date(ot.fechas.solicitada).toLocaleDateString()}
                                        </div>
                                        {(() => {
                                            const start = new Date(ot.fechas.solicitada);
                                            const now = new Date();
                                            const diffMs = now.getTime() - start.getTime();
                                            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                            const diffDays = Math.floor(diffHours / 24);
                                            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                                            let timeStr = "";
                                            if (diffDays > 0) timeStr = `${diffDays}d ${diffHours % 24}h`;
                                            else if (diffHours > 0) timeStr = `${diffHours}h ${diffMins}m`;
                                            else timeStr = `${diffMins}m`;

                                            const color = diffHours > 48 ? '#ef4444' : diffHours > 24 ? '#f59e0b' : '#10b981';

                                            return (
                                                <div style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: '900',
                                                    color: color,
                                                    background: `${color}15`,
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    border: `1px solid ${color}30`
                                                }}>
                                                    ⏱ {timeStr}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '0.5rem' }}>{suc?.nombre} • {fran?.nombre || 'Franquicia'}</h3>
                                <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent)', marginBottom: '1rem' }}>{eq?.nombre}</p>

                                <div style={{ background: 'var(--bg-input)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>FALLA:</p>
                                    <p style={{ fontSize: '0.875rem', lineHeight: '1.5', color: 'var(--text-main)' }}>{ot.descripcionFalla}</p>
                                </div>

                                <button
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                    onClick={() => {
                                        setSelectedOT(ot);
                                        setPrioridad('MEDIA');
                                        setTecnicoId('');
                                    }}
                                >
                                    Asignar Prioridad y Técnico
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Asignación */}
            {selectedOT && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(16px)',
                    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                    padding: '70px 1rem 2rem 1rem', zIndex: 99999, overflowY: 'auto'
                }} onClick={() => setSelectedOT(null)}>
                    <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '1000px', minHeight: '80vh', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3rem', background: 'var(--bg-card)', marginBottom: '4rem', padding: '2.5rem' }} onClick={e => e.stopPropagation()}>
                        {/* Left: Evidence & Details */}
                        <div style={{ color: 'var(--text-main)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                                <h2 style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--primary-light)', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>Detalles {selectedOT.tipo === 'Preventivo' ? `OT P-${selectedOT.numero}` : `OT #${selectedOT.numero}`}</h2>
                                <button onClick={() => setSelectedOT(null)} className="mobile-only" style={{ background: 'transparent', border: 'none', color: 'var(--text-main)' }}><X size={28} /></button>
                            </div>

                            <EvidenceCarousel photos={selectedOT.fotosGerente} />

                            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary-light)', display: 'block', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>DESCRIPCIÓN DE LA FALLA</label>
                                    <div style={{ fontSize: '1rem', lineHeight: '1.6', background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--glass-border)', color: 'var(--text-main)', borderLeft: '4px solid var(--primary-light)' }}>
                                        {selectedOT.descripcionFalla}
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--glass-border)' }}>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary-light)', display: 'block', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>JUSTIFICACIÓN DEL GERENTE</label>
                                    <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-main)', fontStyle: 'italic' }}>"{selectedOT.justificacion}"</p>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase' }}>FECHA SOLICITADA</label>
                                        <p style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: '700' }}>{new Date(selectedOT.fechas.solicitada).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Bitácora completa de la OT */}
                            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                                <h3 style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', letterSpacing: '0.1em' }}>
                                    <History size={16} /> HISTORIAL COMPLETO DE LA OT ({bitacora.length})
                                </h3>
                                {bitacora.length === 0 ? (
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin movimientos registrados.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                        {bitacora.map((b: any, index: number) => {
                                            const isCreacion = b.accion?.includes('Nueva OT');
                                            const isAsignacion = b.accion?.includes('Asignación');
                                            const borderColor = isCreacion ? '#10b981' : isAsignacion ? '#6366f1' : 'var(--primary)';
                                            return (
                                                <div key={index} style={{
                                                    background: 'rgba(255,255,255,0.02)',
                                                    padding: '0.65rem 0.85rem',
                                                    borderRadius: '8px',
                                                    fontSize: '0.75rem',
                                                    borderLeft: `3px solid ${borderColor}`,
                                                    transition: 'background 0.2s'
                                                }}
                                                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                                        <span style={{ fontWeight: '700', color: borderColor }}>{b.accion}</span>
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{new Date(b.fecha).toLocaleString()}</span>
                                                    </div>
                                                    {b.campo && b.campo !== 'General' && (
                                                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                            <strong>{b.campo}:</strong> {String(b.valorAnterior).substring(0, 30)} → {String(b.valorNuevo).substring(0, 30)}
                                                        </div>
                                                    )}
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginTop: '2px' }}>👤 {b.usuarioNombre}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Assignment Form */}
                        <div style={{ borderLeft: '1px solid var(--glass-border)', paddingLeft: '2rem', color: 'var(--text-main)' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }} className="desktop-only">
                                <button onClick={() => setSelectedOT(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%' }}><X size={24} /></button>
                            </div>

                            <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '1rem', fontSize: '0.8rem', fontWeight: '950', color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>1. ASIGNAR PRIORIDAD</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                                        {(['ALTA', 'MEDIA', 'BAJA'] as WorkOrder['prioridad'][]).map(p => (
                                            <button
                                                key={p} type="button"
                                                onClick={() => setPrioridad(p)}
                                                style={{
                                                    padding: '1.25rem 0.5rem', borderRadius: '14px', fontSize: '0.85rem', fontWeight: '900', border: '2px solid transparent',
                                                    background: prioridad === p ? (p === 'ALTA' ? 'var(--priority-alta)' : p === 'MEDIA' ? 'var(--priority-media)' : 'var(--priority-baja)') : 'rgba(255,255,255,0.05)',
                                                    color: prioridad === p ? '#ffffff' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    boxShadow: prioridad === p ? '0 8px 24px rgba(0,0,0,0.5)' : 'none',
                                                    transform: prioridad === p ? 'scale(1.05)' : 'scale(1)',
                                                    borderColor: prioridad === p ? 'rgba(255,255,255,0.3)' : 'transparent'
                                                }}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.8rem', fontWeight: '950', color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>2. TÉCNICO RESPONSABLE</label>
                                    <select
                                        value={tecnicoId} onChange={e => setTecnicoId(e.target.value)} required
                                        style={{ width: '100%', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.4)', color: 'var(--text-main)', fontSize: '1rem', fontWeight: '700' }}
                                    >
                                        <option value="" style={{ color: 'black' }}>Seleccione Técnico...</option>
                                        {tecnicos
                                            .filter(t => {
                                                // REGLA INQUEBRANTABLE: Solo técnicos asignados a la sucursal de la OT
                                                const permisos = t.sucursalesPermitidas || [];
                                                return permisos.includes('TODAS') || permisos.includes(selectedOT.sucursalId);
                                            })
                                            .map(t => (
                                                <option key={t.id} value={t.id} style={{ color: 'black' }}>{t.nombre} ({t.rol}) {t.especialidad ? `• ${t.especialidad}` : ''}</option>
                                            ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '1rem', fontSize: '0.8rem', fontWeight: '950', color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>3. PROGRAMACIÓN</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem' }}>
                                        <div>
                                            <input
                                                type="date" value={fechaProgramada} onChange={e => setFechaProgramada(e.target.value)} required
                                                style={{ width: '100%', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.4)', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: '700' }}
                                            />
                                        </div>
                                        <div>
                                            <input
                                                type="time" value={horaProgramada} onChange={e => setHoraProgramada(e.target.value)} required
                                                style={{ width: '100%', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.4)', color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: '700' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {flexibilidadRequiereJustif && (
                                    <div className="animate-fade" style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#fca5a5' }}>
                                            <AlertCircle size={20} />
                                            <span style={{ fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.85rem' }}>JUSTIFICACIÓN PARA FLEXIBILIZAR NORMA</span>
                                        </div>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '1rem', lineHeight: '1.5' }}>
                                            Has seleccionado un técnico cuya especialidad no coincide con la del equipo. Por regla, debes capturar el motivo de esta excepción antes de asignar.
                                        </p>
                                        <input
                                            type="text"
                                            value={justificacionFlexibilidad}
                                            onChange={e => setJustificacionFlexibilidad(e.target.value)}
                                            placeholder="Ingresa la justificación operativa (emergencia, falta de personal, etc)..."
                                            style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(239, 68, 68, 0.5)', color: 'white' }}
                                            autoFocus
                                        />
                                    </div>
                                )}

                                <button type="submit" disabled={asignando} className="btn btn-primary" style={{ marginTop: '1.5rem', padding: '1.4rem', fontSize: '1.1rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em', boxShadow: '0 10px 30px rgba(37, 99, 235, 0.3)', opacity: asignando ? 0.7 : 1 }}>
                                    {asignando ? 'Verificando y Asignando...' : 'Finalizar Asignación'}
                                    <CheckCircle2 size={24} />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        @media (max-width: 768px) {
          .glass-card { grid-template-columns: 1fr !important; }
          div[style*="borderLeft"] { border-left: none !important; padding-left: 0 !important; margin-top: 1.5rem; border-top: 1px solid var(--glass-border); padding-top: 1.5rem; }
          .desktop-only { display: none; }
        }
        @media (min-width: 769px) {
          .mobile-only { display: none; }
        }
      `}</style>
        </div>
    );
};
