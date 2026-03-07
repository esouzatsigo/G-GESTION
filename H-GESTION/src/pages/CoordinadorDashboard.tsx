import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    updateDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';
import {
    Clock,
    ChevronRight,
    CheckCircle2,
    ChevronLeft,
    X
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
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
                src={photos[currentIndex]}
                alt="Evidencia"
                style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
                onClick={() => window.open(photos[currentIndex], '_blank')}
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
    const navigate = useNavigate();
    const { showNotification } = useNotification();

    // Asignación State
    const [selectedOT, setSelectedOT] = useState<WorkOrder | null>(null);
    const [prioridad, setPrioridad] = useState<WorkOrder['prioridad']>('MEDIA');
    const [tecnicoId, setTecnicoId] = useState('');
    const [fechaProgramada, setFechaProgramada] = useState('');
    const [horaProgramada, setHoraProgramada] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [otSnap, userSnap, sucSnap, fSnap, eqSnap] = await Promise.all([
                getDocs(query(collection(db, 'ordenesTrabajo'), where('estatus', '==', 'Pendiente'))),
                getDocs(query(collection(db, 'usuarios'), where('rol', 'in', ['Tecnico', 'TecnicoExterno']))),
                getDocs(collection(db, 'sucursales')),
                getDocs(collection(db, 'franquicias')),
                getDocs(collection(db, 'equipos'))
            ]);

            setOts(otSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkOrder)));
            setTecnicos(userSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
            setSucursales(sucSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sucursal)));
            setFranquicias(fSnap.docs.map(d => ({ id: d.id, ...d.data() } as Franquicia)));
            setEquipos(eqSnap.docs.map(d => ({ id: d.id, ...d.data() } as Equipo)));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

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

        try {
            await updateDoc(doc(db, 'ordenesTrabajo', selectedOT.id), {
                estatus: 'Asignada',
                prioridad: prioridad,
                tecnicoId,
                fechas: {
                    ...selectedOT.fechas,
                    asignada: new Date().toISOString(),
                    programada: `${fechaProgramada}T${horaProgramada}:00`
                }
            });
            setSelectedOT(null);
            fetchData();
            showNotification("OT Asignada correctamente.", "success");
        } catch (error) {
            showNotification("Error al asignar OT.", "error");
        }
    };

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
                                        onClick={() => navigate(`/kardex?ot=${ot.numero}`)}
                                        style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary)', textDecoration: 'underline' }}
                                    >
                                        OT #{ot.numero}
                                    </button>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                        <Clock size={12} />
                                        {new Date(ot.fechas.solicitada).toLocaleDateString()}
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
                    background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem', zIndex: 100
                }}>
                    <div className="glass-card animate-fade" style={{ width: '100%', maxWidth: '900px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
                        {/* Left: Evidence & Details */}
                        <div style={{ color: 'white' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'white' }}>Detalles de la OT #{selectedOT.numero}</h2>
                                <button onClick={() => setSelectedOT(null)} className="mobile-only" style={{ background: 'transparent', border: 'none', color: 'white' }}><X size={24} /></button>
                            </div>

                            <EvidenceCarousel photos={selectedOT.fotosGerente} />

                            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'rgba(255,255,255,0.7)' }}>DESCRIPCIÓN DE LA FALLA</label>
                                    <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: '1.6', background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '8px', color: 'white' }}>{selectedOT.descripcionFalla}</p>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'rgba(255,255,255,0.7)' }}>JUSTIFICACIÓN DEL GERENTE</label>
                                    <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', lineHeight: '1.6', color: 'white' }}>{selectedOT.justificacion}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '2rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'rgba(255,255,255,0.7)' }}>FECHA SOLICITADA</label>
                                        <p style={{ fontSize: '0.9rem', marginTop: '0.25rem', color: 'white' }}>{new Date(selectedOT.fechas.solicitada).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Assignment Form */}
                        <div style={{ borderLeft: '1px solid var(--glass-border)', paddingLeft: '2rem', color: 'white' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }} className="desktop-only">
                                <button onClick={() => setSelectedOT(null)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={24} /></button>
                            </div>

                            <form onSubmit={handleAssign} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: '600', color: 'white' }}>Prioridad Asignada</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                                        {(['ALTA', 'MEDIA', 'BAJA'] as WorkOrder['prioridad'][]).map(p => (
                                            <button
                                                key={p} type="button"
                                                onClick={() => setPrioridad(p)}
                                                style={{
                                                    padding: '0.75rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid var(--glass-border)',
                                                    background: prioridad === p ? (p === 'ALTA' ? 'var(--priority-alta)' : p === 'MEDIA' ? 'var(--priority-media)' : 'var(--priority-baja)') : 'var(--bg-input)',
                                                    color: '#ffffff', cursor: 'pointer', transition: 'all 0.2s'
                                                }}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: 'white' }}>Técnico Responsable</label>
                                    <select
                                        value={tecnicoId} onChange={e => setTecnicoId(e.target.value)} required
                                        style={{ width: '100%', padding: '0.875rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'white' }}
                                    >
                                        <option value="" style={{ color: 'black' }}>Seleccione Técnico...</option>
                                        {tecnicos.map(t => (
                                            <option key={t.id} value={t.id} style={{ color: 'black' }}>{t.nombre} ({t.rol}) {t.especialidad ? `• ${t.especialidad}` : ''}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: 'white' }}>Fecha Programada</label>
                                        <input
                                            type="date" value={fechaProgramada} onChange={e => setFechaProgramada(e.target.value)} required
                                            style={{ width: '100%', padding: '0.875rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'white' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: 'white' }}>Hora</label>
                                        <input
                                            type="time" value={horaProgramada} onChange={e => setHoraProgramada(e.target.value)} required
                                            style={{ width: '100%', padding: '0.875rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'white' }}
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', padding: '1.25rem' }}>
                                    Finalizar Asignación
                                    <CheckCircle2 size={20} />
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
