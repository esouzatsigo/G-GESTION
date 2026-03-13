import React, { useEffect, useState, useCallback } from 'react';
import {
    getDocs
} from 'firebase/firestore';
import { getActiveProjectKey } from '../services/firebase';
import { tenantQuery } from '../services/tenantContext';
import { updateOTStatus } from '../services/dataService';
import { useAuth } from '../hooks/useAuth';
import {
    Calendar,
    ChevronDown,
    ChevronUp,
    Camera,
    CheckCircle,
    Search,
    List,
    LayoutDashboard,
    Navigation,
    Phone
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import type { WorkOrder, Sucursal, Equipo } from '../types';

import { useNavigate } from 'react-router-dom';

export const MisServiciosPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const [ots, setOts] = useState<WorkOrder[]>(() => {
        try { return JSON.parse(sessionStorage.getItem('ms_ots_cache') || '[]'); } catch { return []; }
    });
    const [sucursales, setSucursales] = useState<Sucursal[]>(() => {
        try { return JSON.parse(sessionStorage.getItem('ms_suc_cache') || '[]'); } catch { return []; }
    });
    const [equipos, setEquipos] = useState<Equipo[]>(() => {
        try { return JSON.parse(sessionStorage.getItem('ms_eq_cache') || '[]'); } catch { return []; }
    });
    // Solo mostrar spinner si no hay NADA en el caché de sesión
    const [loading, setLoading] = useState(() => {
        const cached = sessionStorage.getItem('ms_ots_cache');
        return !cached || cached === '[]';
    });
    
    // Estado Persistente para que al volver todo esté como se dejó
    const [expandedDates, setExpandedDates] = useState<string[]>(() => {
        const saved = localStorage.getItem('ms_expanded_dates');
        return saved ? JSON.parse(saved) : [];
    });
    const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('ms_search') || '');
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>(() => 
        (localStorage.getItem('ms_view_mode') as 'calendar' | 'list') || 'calendar'
    );
    const [showCompleted, setShowCompleted] = useState(() => localStorage.getItem('ms_show_completed') === 'true');

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        
        const currentProject = getActiveProjectKey();
        const lastProject = localStorage.getItem('ms_last_project');
        if (currentProject !== lastProject) {
            sessionStorage.removeItem('ms_ots_cache');
            sessionStorage.removeItem('ms_suc_cache');
            sessionStorage.removeItem('ms_eq_cache');
        }

        try {
            // CONSULTA BLINDADA: Bajamos todo del cliente y filtramos en memoria
            // Esto evita errores de índices, discrepancias de UIDs o fechas mal formateadas
            const qOts = tenantQuery('ordenesTrabajo', user);
            const promises: any[] = [getDocs(qOts)];
            
            // Catálogos
            if (sucursales.length === 0) promises.push(getDocs(tenantQuery('sucursales', user)));
            if (equipos.length === 0) promises.push(getDocs(tenantQuery('equipos', user)));

            const results = await Promise.all(promises);
            const allDocs = results[0].docs.map((d: any) => ({ id: d.id, ...d.data() } as WorkOrder));
            
            console.log(`[DEBUG] Servicios totales en ${currentProject}: ${allDocs.length}`);

            // Filtrado por Técnico y Estatus
            const myOts = allDocs.filter((ot: WorkOrder) => ot.tecnicoId === user.id);
            
            const fetchedOts = myOts.filter((ot: WorkOrder) => {
                const isFinal = ot.estatus === 'Finalizada' || ot.estatus === 'CANCELADA';
                return showCompleted ? isFinal : !isFinal;
            });

            setOts(fetchedOts);
            sessionStorage.setItem('ms_ots_cache', JSON.stringify(myOts)); // Cacheamos solo lo del técnico
            
            if (results[1]) setSucursales(results[1].docs.map((d: any) => ({ id: d.id, ...d.data() } as Sucursal)));
            if (results[2]) setEquipos(results[2].docs.map((d: any) => ({ id: d.id, ...d.data() } as Equipo)));

            localStorage.setItem('ms_last_project', currentProject);
        } catch (error: any) {
            console.error("Error crítico en MisServicios:", error);
            showNotification("Error al sincronizar servicios: " + error.message, "error");
        } finally {
            setLoading(false);
        }
    }, [user, showCompleted, sucursales.length, equipos.length]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        localStorage.setItem('ms_expanded_dates', JSON.stringify(expandedDates));
    }, [expandedDates]);

    useEffect(() => {
        localStorage.setItem('ms_search', searchTerm);
    }, [searchTerm]);

    useEffect(() => {
        localStorage.setItem('ms_view_mode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        localStorage.setItem('ms_show_completed', showCompleted.toString());
    }, [showCompleted]);

    // Filtrado Local Instantáneo (Sin Red)
    const filteredOts = ots.filter(ot => {
        if (!searchTerm.trim()) return true;
        const search = searchTerm.toLowerCase().trim();
        const otDisplay = ot.tipo === 'Preventivo' ? `P-${ot.numero}` : `#${ot.numero}`;
        const suc = sucursales.find(s => s.id === ot.sucursalId)?.nombre?.toLowerCase() || '';
        const eq = equipos.find(e => e.id === ot.equipoId)?.nombre?.toLowerCase() || '';
        
        return otDisplay.toLowerCase().includes(search) || 
               ot.numero.toString().includes(search) ||
               suc.includes(search) ||
               eq.includes(search);
    });

    // Agrupar OTs por fecha programada (Usando la data filtrada localmente)
    const groupedOTs = filteredOts.reduce((acc: Record<string, WorkOrder[]>, ot) => {
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
            showNotification("Tu dispositivo no tiene GPS disponible, pero puedes continuar sin problema. 😊", "info");
            return;
        }

        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                if (user) {
                    await updateOTStatus(otId, 'Llegada a Sitio', user, {
                        coordsLlegada: { lat: pos.coords.latitude, lng: pos.coords.longitude },
                        'fechas.llegada': new Date().toISOString()
                    });

                    // ACTUALIZACIÓN DE ESTADO LOCAL INMEDIATA
                    setOts(prev => prev.map(ot => 
                        ot.id === otId ? { ...ot, estatus: 'Llegada a Sitio' } : ot
                    ));
                    
                    showNotification("¡Llegada registrada! Que te vaya excelente en este servicio. 👍", "success");
                }
            } catch {
                showNotification("Ups, algo salió mal. Intenta de nuevo en un momento.", "info");
            }
        }, () => {
            showNotification("Registramos tu llegada.", "info");
            if (user) {
                updateOTStatus(otId, 'Llegada a Sitio', user, {
                    'fechas.llegada': new Date().toISOString()
                }).then(() => {
                    setOts(prev => prev.map(ot => 
                        ot.id === otId ? { ...ot, estatus: 'Llegada a Sitio' } : ot
                    ));
                });
            }
        });
    };

    return (
        <div className="animate-fade mobile-view" style={{ paddingBottom: '4rem', padding: '0 0.5rem' }}>
            <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: '1.4rem', fontWeight: '950', letterSpacing: '-0.02em', color: 'var(--text-main)', margin: 0 }}>
                            Mis Servicios
                        </h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600', margin: 0 }}>
                            {user?.nombre}, <span style={{ color: 'var(--primary-light)' }}>{ots.length} Pendientes</span>
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                            onClick={() => setViewMode('calendar')}
                            style={{
                                padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--glass-border)',
                                background: viewMode === 'calendar' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                color: viewMode === 'calendar' ? 'white' : 'var(--text-muted)', cursor: 'pointer'
                            }}
                        >
                            <LayoutDashboard size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                padding: '0.4rem', borderRadius: '8px', border: '1px solid var(--glass-border)',
                                background: viewMode === 'list' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                color: viewMode === 'list' ? 'white' : 'var(--text-muted)', cursor: 'pointer'
                            }}
                        >
                            <List size={20} />
                        </button>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.5rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Buscar OT..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', padding: '0.4rem 0.5rem 0.4rem 1.8rem', borderRadius: '8px',
                            border: '1px solid var(--glass-border)', background: 'var(--bg-input)',
                            color: 'var(--text-main)', fontSize: '0.8rem'
                        }}
                    />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: 'var(--bg-input)', padding: '0.2rem 0.4rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-main)' }}>FIN</span>
                    <button
                        onClick={() => setShowCompleted(!showCompleted)}
                        style={{
                            width: '24px', height: '12px', borderRadius: '10px', background: showCompleted ? 'var(--primary)' : 'var(--bg-switch)',
                            border: '1px solid var(--glass-border)', position: 'relative', cursor: 'pointer'
                        }}
                    >
                        <div style={{
                            width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff',
                            position: 'absolute', top: '1px', left: showCompleted ? '13px' : '1px', transition: 'all 0.3s'
                        }} />
                    </button>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                    Mostrando {ots.length} servicio(s)
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
                    <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '1rem', maxWidth: '700px', margin: '0 auto', width: '100%' }}>
                        {sortedDates.map(date => (
                            <div key={date} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <button
                                    onClick={() => toggleDate(date)}
                                    style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        width: '100%', padding: '0.75rem', background: 'var(--bg-glass)',
                                        border: '1px solid var(--glass-border)', borderRadius: '10px', color: 'var(--text-main)',
                                        fontWeight: '700', fontSize: '1rem', cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Calendar size={18} color="var(--primary)" />
                                        {date === 'Sin Fecha'
                                            ? 'SIN FECHA'
                                            : new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                                    </div>
                                    {expandedDates.includes(date) || searchTerm.trim() !== '' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>

                                {(expandedDates.includes(date) || searchTerm.trim() !== '') && groupedOTs[date].map((ot: WorkOrder) => {
                                    const suc = sucursales.find(s => s.id === ot.sucursalId);
                                    const eq = equipos.find(e => e.id === ot.equipoId);

                                    // Lógica de navegación mejorada
                                    const destination = suc?.coordenadas?.lat && suc?.coordenadas?.lng 
                                        ? `${suc.coordenadas.lat},${suc.coordenadas.lng}`
                                        : `${suc?.nombre || ''} ${suc?.direccion || ''}`;
                                    const mapLink = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;

                                    return (
                                        <div key={ot.id} className="glass-card animate-fade" style={{ padding: '0.4rem 0.5rem', borderLeft: `4px solid var(--status-${ot.estatus.toLowerCase().split(' ')[0]})`, marginBottom: '0.4rem', position: 'relative' }}>
                                            {/* Header Super Compacto */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem', gap: '0.3rem' }}>
                                                <button
                                                    onClick={() => navigate(`/ejecutar-servicio/${ot.id}`)}
                                                    style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.8rem', fontWeight: '950', color: 'var(--primary)', textDecoration: 'underline' }}
                                                >
                                                    {ot.tipo === 'Preventivo' ? `P-${ot.numero}` : `#${ot.numero}`}
                                                </button>

                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); window.open(mapLink, '_blank'); }}
                                                        style={{ background: '#3b82f615', color: '#3b82f6', border: '1px solid #3b82f640', width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <Navigation size={16} />
                                                    </button>
                                                    
                                                    <button
                                                        onClick={e => { e.stopPropagation(); window.open(`tel:${suc?.telefono || ''}`, '_self'); }}
                                                        style={{ background: '#22c55e15', color: '#22c55e', border: '1px solid #22c55e40', width: '32px', height: '32px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                    >
                                                        <Phone size={16} />
                                                    </button>

                                                    {ot.prioridad && (
                                                        <span style={{ fontSize: '0.6rem', fontWeight: '900', padding: '2px 6px', borderRadius: '4px', background: ot.prioridad === 'ALTA' ? '#ef4444' : '#F59E0B', color: 'white' }}>
                                                            {ot.prioridad}
                                                        </span>
                                                    )}
                                                    <span style={{ 
                                                        fontSize: '0.6rem', 
                                                        fontWeight: '900', 
                                                        padding: '2px 6px', 
                                                        borderRadius: '4px', 
                                                        background: ot.estatus === 'Llegada a Sitio' ? 'var(--status-llegada)' :
                                                                    ot.estatus === 'Iniciada' ? 'var(--status-iniciada)' :
                                                                    ot.estatus === 'Concluida. Pendiente Firma Cliente' ? 'var(--status-concluida)' : 
                                                                    ot.estatus === 'Asignada' ? 'var(--status-asignada)' : 'var(--primary)',
                                                        color: 'white',
                                                        border: '1px solid rgba(255,255,255,0.2)',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        {ot.estatus === 'Llegada a Sitio' ? 'LLEGADA A SITIO' : ot.estatus.split('.')[0].toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Info de Sucursal y Equipo */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <h3 style={{ fontSize: '0.9rem', fontWeight: '900', margin: 0, color: 'var(--text-main)', lineHeight: '1.2' }}>{suc?.nombre}</h3>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>{suc?.direccion}</p>
                                                <p style={{ fontSize: '0.85rem', fontWeight: '900', color: 'var(--accent)', marginTop: '2px' }}>{eq?.nombre}</p>
                                            </div>

                                            {ot.descripcionFalla && (
                                                <div style={{ marginTop: '0.4rem', padding: '0.5rem', background: 'rgba(59, 130, 246, 0.03)', borderRadius: '6px', border: '1px solid var(--glass-border)' }}>
                                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', margin: 0, lineHeight: '1.3', fontStyle: 'italic' }}>"{ot.descripcionFalla}"</p>
                                                </div>
                                            )}

                                            {/* Acción principal compacta */}
                                            <div style={{ marginTop: '0.4rem' }}>
                                                {ot.estatus === 'Asignada' ? (
                                                    <button
                                                        className="btn"
                                                        style={{ 
                                                            width: '100%', padding: '0.75rem', fontSize: '1rem', fontWeight: '900', borderRadius: '8px',
                                                            background: 'var(--status-asignada)', color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                                        }}
                                                        onClick={() => handleLlegada(ot.id)}
                                                    >
                                                        MARCAR LLEGADA
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="btn"
                                                        style={{ 
                                                            width: '100%', padding: '0.75rem', fontSize: '1rem', fontWeight: '900', borderRadius: '8px',
                                                            background: ot.estatus.toLowerCase().includes('llegada') ? 'var(--status-llegada)' :
                                                                        ot.estatus.toLowerCase().includes('iniciada') ? 'var(--status-iniciada)' :
                                                                        ot.estatus.toLowerCase().includes('concluida') ? 'var(--status-concluida)' :
                                                                        ot.estatus.toLowerCase().includes('finalizada') ? 'var(--status-finalizada)' :
                                                                        'var(--status-asignada)',
                                                            color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                                        }}
                                                        onClick={() => navigate(`/ejecutar-servicio/${ot.id}`)}
                                                    >
                                                        <Camera size={20} />
                                                        {ot.estatus === 'Llegada a Sitio' ? 'INICIAR SERVICIO' : 
                                                         (ot.estatus === 'Concluida' || ot.estatus === 'Finalizada') ? 'VER REPORTE' : 'CONTINUAR'}
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
                                                        onClick={() => navigate(`/ejecutar-servicio/${ot.id}`)}
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
