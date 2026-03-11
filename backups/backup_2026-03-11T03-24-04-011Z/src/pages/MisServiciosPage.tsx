import React, { useEffect, useState, useCallback } from 'react';
import {
    getDocs,
    where
} from 'firebase/firestore';
import { tenantQuery } from '../services/tenantContext';
import { updateOTStatus } from '../services/dataService';
import { useAuth } from '../hooks/useAuth';
import {
    MapPin,
    Calendar,
    ChevronDown,
    ChevronUp,
    Camera,
    CheckCircle,
    Search,
    X,
    List,
    LayoutDashboard
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import type { WorkOrder, Sucursal, Equipo } from '../types';

import { useNavigate } from 'react-router-dom';

export const MisServiciosPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [ots, setOts] = useState<WorkOrder[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedDates, setExpandedDates] = useState<string[]>([]);
    const [showCompleted, setShowCompleted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Calcular fecha hace 30 días
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const minDate = thirtyDaysAgo.toISOString();

            // Consulta base: Solo este técnico
            const q = tenantQuery('ordenesTrabajo', user,
                where('tecnicoId', '==', user.id)
            );
            const [otSnap, sucSnap, eqSnap] = await Promise.all([
                getDocs(q),
                getDocs(tenantQuery('sucursales', user)),
                getDocs(tenantQuery('equipos', user))
            ]);

            let fetchedOts = otSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkOrder));

            // Filtro local de 30 días y estados según el toggle
            fetchedOts = fetchedOts.filter(ot => {
                const isRecent = ot.fechas.solicitada >= minDate;
                const status = ot.estatus;

                // Si hay búsqueda, ignorar el filtro de 30 días y ver si coincide el número
                if (searchTerm.trim() !== '') {
                    const otDisplay = ot.tipo === 'Preventivo' ? `P-${ot.numero}` : `#${ot.numero}`;
                    return otDisplay.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
                        ot.numero.toString().includes(searchTerm.trim());
                }

                if (showCompleted) {
                    // Mostrar SOLO Concluidas y finalizadas
                    return isRecent && (status === 'Concluida' || status === 'Finalizada');
                } else {
                    // Mostrar SOLO Activas (Asignada, Llegada, Iniciada, Pendiente Firma)
                    return isRecent && (
                        status === 'Asignada' ||
                        status === 'Llegada a Sitio' ||
                        status === 'Iniciada' ||
                        status === 'Concluida. Pendiente Firma Cliente'
                    );
                }
            });

            setOts(fetchedOts);
            setSucursales(sucSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sucursal)));
            setEquipos(eqSnap.docs.map(d => ({ id: d.id, ...d.data() } as Equipo)));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [user, showCompleted, searchTerm]);

    useEffect(() => {
        fetchData();
    }, [user, showCompleted, searchTerm]);

    // Agrupar OTs por fecha programada
    const groupedOTs = ots.reduce((acc: Record<string, WorkOrder[]>, ot) => {
        const date = ot.fechas.programada?.split('T')[0] || 'Sin Fecha';
        if (!acc[date]) acc[date] = [];
        acc[date].push(ot);
        return acc;
    }, {});

    const sortedDates = Object.keys(groupedOTs).sort();

    const toggleDate = (date: string) => {
        setExpandedDates(prev => prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]);
    };

    const handleLlegada = async (otId: string) => {
        if (!navigator.geolocation) {
            showNotification("GPS no soportado en este dispositivo.", "error");
            return;
        }

        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                if (user) {
                    await updateOTStatus(otId, 'Llegada a Sitio', user, {
                        coordsLlegada: { lat: pos.coords.latitude, lng: pos.coords.longitude },
                        'fechas.llegada': new Date().toISOString()
                    });
                }
                fetchData();
                showNotification("Llegada registrada exitosamente.", "success");
            } catch {
                showNotification("Error al validar ubicación.", "error");
            }
        }, () => {
            // Fallback: Registrar sin coordenadas o con mensaje
            showNotification("No se pudo obtener el GPS. Se registrará la llegada basada en antena/red.", "warning");
            if (user) {
                updateOTStatus(otId, 'Llegada a Sitio', user, {
                    'fechas.llegada': new Date().toISOString()
                }).then(() => fetchData());
            }
        });
    };

    return (
        <div className="animate-fade mobile-view" style={{ paddingBottom: '4rem' }}>
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800' }}>Mis Servicios</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.7rem' }}>Listado de OTs asignadas para atención.</p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        onClick={() => setViewMode('calendar')}
                        style={{
                            padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--glass-border)',
                            background: viewMode === 'calendar' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: viewMode === 'calendar' ? 'white' : 'var(--text-muted)', cursor: 'pointer'
                        }}
                    >
                        <LayoutDashboard size={32} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        style={{
                            padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--glass-border)',
                            background: viewMode === 'list' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                            color: viewMode === 'list' ? 'white' : 'var(--text-muted)', cursor: 'pointer'
                        }}
                    >
                        <List size={32} />
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={28} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Buscar OT..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', padding: '1rem 1.25rem 1rem 3rem', borderRadius: '12px',
                            border: '1px solid var(--glass-border)', background: 'var(--bg-input)',
                            color: 'var(--text-main)', fontSize: '1.6rem'
                        }}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            style={{
                                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
                            }}
                        >
                            <X size={26} />
                        </button>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-input)', padding: '0.5rem 0.75rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>FINALIZADAS</span>
                    <button
                        onClick={() => setShowCompleted(!showCompleted)}
                        style={{
                            width: '34px', height: '18px', borderRadius: '20px', background: showCompleted ? 'var(--primary)' : 'var(--bg-switch)',
                            border: '1px solid var(--glass-border)', position: 'relative', cursor: 'pointer'
                        }}
                    >
                        <div style={{
                            width: '12px', height: '12px', borderRadius: '50%', background: '#ffffff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                            position: 'absolute', top: '2px', left: showCompleted ? '19px' : '3px', transition: 'all 0.3s'
                        }} />
                    </button>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                    Mostrando {ots.length} servicio(s) con los filtros actuales
                </span>
            </div>

            {
                loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>Cargando agenda...</div>
                ) : ots.length === 0 ? (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
                        <CheckCircle size={40} color="var(--status-concluida)" style={{ marginBottom: '1rem' }} />
                        <p>No se encontraron servicios.</p>
                    </div>
                ) : viewMode === 'calendar' ? (
                    <div className="scrollable-x custom-scrollbar force-min-width" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem' }}>
                        {sortedDates.map(date => (
                            <div key={date} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <button
                                    onClick={() => toggleDate(date)}
                                    style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        width: '100%', padding: '1rem', background: 'var(--bg-glass)',
                                        border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--text-main)',
                                        fontWeight: '600', fontSize: '1.6rem', cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <Calendar size={28} color="var(--primary)" />
                                        {new Date(date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </div>
                                    {expandedDates.includes(date) || searchTerm.trim() !== '' ? <ChevronUp size={32} /> : <ChevronDown size={32} />}
                                </button>

                                {(expandedDates.includes(date) || searchTerm.trim() !== '') && groupedOTs[date].map((ot: WorkOrder) => {
                                    const suc = sucursales.find(s => s.id === ot.sucursalId);
                                    const eq = equipos.find(e => e.id === ot.equipoId);
                                    const isLlegadaEnSitio = ot.estatus === 'Llegada a Sitio' || ot.estatus === 'Iniciada';

                                    return (
                                        <div key={ot.id} className="glass-card animate-fade" style={{ borderLeft: `4px solid var(--status-${ot.estatus.toLowerCase().replace(/ /g, '')})` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                                <button
                                                    onClick={() => window.open(`/kardex?ot=${ot.numero}`, '_blank')}
                                                    style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-muted)', textDecoration: 'underline' }}
                                                >
                                                    {ot.tipo === 'Preventivo' ? `P-${ot.numero}` : `OT #${ot.numero}`}
                                                </button>
                                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                    {ot.prioridad && (
                                                        <span style={{
                                                            fontSize: '1.3rem', fontWeight: '800', padding: '0.3rem 0.6rem',
                                                            borderRadius: '6px', background: ot.prioridad === 'ALTA' ? '#ef444420' : '#F59E0B20', color: ot.prioridad === 'ALTA' ? '#ef4444' : '#F59E0B'
                                                        }}>
                                                            {ot.prioridad}
                                                        </span>
                                                    )}
                                                    <span style={{
                                                        fontSize: '1.3rem', fontWeight: '700', padding: '0.3rem 0.6rem',
                                                        borderRadius: '6px', background: `var(--status-${ot.estatus.toLowerCase().replace(/ /g, '')})`, color: 'white'
                                                    }}>
                                                        {ot.estatus}
                                                    </span>
                                                </div>
                                            </div>

                                            <h3 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.25rem' }}>{suc?.nombre}</h3>
                                            <p style={{ fontSize: '1.6rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{suc?.direccion}</p>
                                            <p style={{ fontSize: '1.7rem', fontWeight: '600', color: 'var(--accent)' }}>{eq?.nombre}</p>
                                            {ot.descripcionFalla && (
                                                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-glass)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                                    <p style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--primary-light)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Descripción de la Falla:</p>
                                                    <p style={{ fontSize: '1.6rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{ot.descripcionFalla}</p>
                                                </div>
                                            )}

                                            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--glass-border)', display: 'flex', gap: '0.75rem' }}>
                                                {ot.estatus === 'Concluida' || ot.estatus === 'Finalizada' ? (
                                                    <button
                                                        className="btn" style={{ flex: 1, padding: '1.25rem', fontSize: '1.5rem', background: 'var(--bg-glass)', color: 'var(--text-muted)', border: '1px solid var(--glass-border)' }}
                                                        onClick={() => navigate(`/ejecutar-servicio/${ot.id}`)}
                                                    >
                                                        <Search size={28} />
                                                        CONSULTAR SERVICIO
                                                    </button>
                                                ) : ot.estatus === 'Concluida. Pendiente Firma Cliente' ? (
                                                    <button
                                                        className="btn btn-primary" style={{ flex: 1, padding: '1.25rem', fontSize: '1.5rem', background: 'var(--status-concluidapendientefirmacliente)' }}
                                                        onClick={() => navigate(`/ejecutar-servicio/${ot.id}`)}
                                                    >
                                                        <CheckCircle size={28} />
                                                        FIRMA CLIENTE
                                                    </button>
                                                ) : !isLlegadaEnSitio ? (
                                                    <button
                                                        className="btn btn-primary" style={{ flex: 1, padding: '1.25rem', fontSize: '1.5rem' }}
                                                        onClick={() => handleLlegada(ot.id)}
                                                    >
                                                        <MapPin size={28} />
                                                        LLEGADA A SITIO
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="btn btn-primary" style={{ flex: 1, padding: '1.25rem', fontSize: '1.5rem', background: 'var(--status-iniciada)' }}
                                                        onClick={() => navigate(`/ejecutar-servicio/${ot.id}`)}
                                                    >
                                                        <Camera size={28} />
                                                        CONTINUAR SERVICIO
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                ) : (
                    /* Vista Listado OT */
                    <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '400px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                                        <th style={{ padding: '1rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)' }}>#OT/PRIORIDAD</th>
                                        <th style={{ padding: '1rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)' }}>ESTATUS</th>
                                        <th style={{ padding: '1rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)' }}>PROGRAMACIÓN</th>
                                        <th style={{ padding: '1rem', fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', textAlign: 'right' }}>ACCIONES</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...ots].sort((a, b) => b.numero - a.numero).map(ot => {
                                        const prioColor = ot.prioridad === 'ALTA' ? '#ef4444' : (ot.prioridad === 'MEDIA' ? '#F59E0B' : 'var(--primary)');

                                        return (
                                            <tr key={ot.id} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '1rem' }}>
                                                    <button
                                                        onClick={() => window.open(`/kardex?ot=${ot.numero}`, '_blank')}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            padding: 0,
                                                            cursor: 'pointer',
                                                            fontSize: '0.85rem',
                                                            fontWeight: '900',
                                                            color: prioColor,
                                                            textDecoration: 'underline'
                                                        }}
                                                    >
                                                        {ot.tipo === 'Preventivo' ? `P-${ot.numero}` : `#${ot.numero}`}
                                                    </button>
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{
                                                        fontSize: '0.65rem', fontWeight: '800', padding: '0.2rem 0.5rem',
                                                        borderRadius: '4px', background: `var(--status-${ot.estatus.toLowerCase().replace(/ /g, '')})`, color: 'white'
                                                    }}>
                                                        {ot.estatus}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {ot.fechas.programada ? new Date(ot.fechas.programada).toLocaleDateString() : 'Sin fecha'}
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                    <button
                                                        onClick={() => navigate(`/ejecutar-servicio/${ot.id}`)}
                                                        style={{
                                                            background: (ot.estatus === 'Concluida' || ot.estatus === 'Finalizada') ? 'transparent' : 'var(--primary)',
                                                            border: `1px solid ${(ot.estatus === 'Concluida' || ot.estatus === 'Finalizada') ? 'var(--glass-border)' : 'var(--primary)'}`,
                                                            color: (ot.estatus === 'Concluida' || ot.estatus === 'Finalizada') ? 'var(--text-muted)' : 'white',
                                                            fontSize: '0.65rem', fontWeight: '800', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer'
                                                        }}
                                                    >
                                                        {(ot.estatus === 'Concluida' || ot.estatus === 'Finalizada') ? 'CONSULTAR' :
                                                            (ot.estatus === 'Concluida. Pendiente Firma Cliente' ? 'FIRMA CLIENTE' : 'ATENDER')}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
