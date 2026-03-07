import React, { useEffect, useState } from 'react';
import {
    collection,
    query,
    getDocs,
    orderBy,
    where
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { tenantQuery } from '../services/tenantContext';
import {
    CheckCircle,
    Search,
    X
} from 'lucide-react';
import type { WorkOrder, Cliente, User, Sucursal, Equipo } from '../types';
import { generateServiceReport } from '../utils/serviceReport';
import { useAuth } from '../hooks/useAuth';
import { updateOTWithAudit } from '../services/dataService';
import { useNotification } from '../context/NotificationContext';
import { useEscapeKey } from '../hooks/useEscapeKey';

export const SupervisarPage: React.FC = () => {
    const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
    const [ots, setOts] = useState<WorkOrder[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [usuarios, setUsuarios] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();

    // Filtros
    const [search, setSearch] = useState('');
    const [tecnicoFilter, setTecnicoFilter] = useState('');
    const [sucursalFilter, setSucursalFilter] = useState('');

    // Modal de Visualización
    const [selectedOT, setSelectedOT] = useState<WorkOrder | null>(null);
    const [bitacora, setBitacora] = useState<any[]>([]);
    const { user } = useAuth();

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [otSnap, clSnap, sucSnap, eqSnap, userSnap] = await Promise.all([
                getDocs(tenantQuery('ordenesTrabajo', user, where('estatus', '==', 'Concluida'), orderBy('numero', 'asc'))),
                getDocs(collection(db, 'clientes')),
                getDocs(tenantQuery('sucursales', user)),
                getDocs(tenantQuery('equipos', user)),
                getDocs(tenantQuery('usuarios', user))
            ]);

            setOts(otSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkOrder)));
            setClientes(clSnap.docs.map(d => ({ id: d.id, ...d.data() } as Cliente)));
            setSucursales(sucSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sucursal)));
            setEquipos(eqSnap.docs.map(d => ({ id: d.id, ...d.data() } as Equipo)));
            setUsuarios(userSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
        } catch (e) {
            console.error(e);
        }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchData();
    }, []);

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

    const filteredOTs = ots.filter(ot => {
        // Encontrar al técnico asignado para verificar su supervisor
        const tech = usuarios.find(u => u.id === ot.tecnicoId);

        // Si el usuario actual es Supervisor, solo mostrar OTs de sus técnicos
        // Si es Admin, mostrar todo (opcional, pero ayuda a la depuración)
        const reportsToMe = user?.id === tech?.supervisorId || user?.rol === 'Admin';

        if (!reportsToMe && user?.rol !== 'Admin') return false;

        const matchesSearch = ot.numero.toString().includes(search) ||
            ot.descripcionFalla?.toLowerCase().includes(search.toLowerCase());

        const matchesTecnico = !tecnicoFilter || ot.tecnicoId === tecnicoFilter;
        const matchesSucursal = !sucursalFilter || ot.sucursalId === sucursalFilter;

        return matchesSearch && matchesTecnico && matchesSucursal;
    }, [ots, usuarios, user, search, tecnicoFilter, sucursalFilter]);


    const handleDownloadPdf = async (ot: WorkOrder) => {
        setGeneratingPdf(ot.id);
        const cl = clientes.find(c => c.id === ot.clienteId);
        const suc = sucursales.find(s => s.id === ot.sucursalId);
        const eq = equipos.find(e => e.id === ot.equipoId);
        const tec = usuarios.find(u => u.id === ot.tecnicoId);

        if (cl && suc && eq) {
            await generateServiceReport(ot, cl, suc, eq, tec);
        }
        setGeneratingPdf(null);
    };

    const handleFinalize = async (ot: WorkOrder) => {
        if (!user) return;
        if (!window.confirm("¿Autorizar el CIERRE definitivo de esta OT?")) return;

        try {
            const now = new Date();
            const dateStr = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

            const updatedOT: WorkOrder = {
                ...ot,
                estatus: 'Finalizada',
                fechas: {
                    ...ot.fechas,
                    finalizada: now.toISOString(),
                    finalizadaFecha: dateStr,
                    finalizadaHora: timeStr
                }
            };

            await updateOTWithAudit(ot.id, ot, updatedOT, user as any, "Autorización y Cierre de OT (Supervisor)");

            // Auto PDF
            await handleDownloadPdf(updatedOT);

            setSelectedOT(null);
            fetchData();
            showNotification("OT Finalizada con éxito.", "success");
        } catch (e) {
            showNotification("Error al finalizar la OT.", "error");
        }
    };

    return (
        <>
            <div className="animate-fade">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>SUPERVISAR OTs CONCLUIDAS</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Órdenes finalizadas por el técnico que requieren cierre definitivo.</p>
                    </div>
                </div>

                <div className="glass-card" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text" placeholder="Buscar por OT..." value={search} onChange={e => setSearch(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                            />
                        </div>

                        <select value={tecnicoFilter} onChange={e => setTecnicoFilter(e.target.value)}
                            style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}>
                            <option value="">Cualquier Técnico</option>
                            {usuarios
                                .filter(u => u.rol === 'Tecnico' || u.rol === 'TecnicoExterno')
                                .filter(u => user?.rol === 'Admin' || u.supervisorId === user?.id)
                                .map(t => (
                                    <option key={t.id} value={t.id}>{t.nombre}</option>
                                ))}
                        </select>

                        <select value={sucursalFilter} onChange={e => setSucursalFilter(e.target.value)}
                            style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}>
                            <option value="">Todas las Sucursales</option>
                            {sucursales.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>Buscando OTs para supervisar...</div>
                ) : (
                    <div className="scrollable-x custom-scrollbar">
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.75rem' }}>
                            <thead>
                                <tr style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <th style={{ textAlign: 'left', padding: '0 1rem' }}>OT</th>
                                    <th style={{ textAlign: 'left', padding: '0 1rem' }}>Ubicación</th>
                                    <th style={{ textAlign: 'left', padding: '0 1rem' }}>Equipo</th>
                                    <th style={{ textAlign: 'left', padding: '0 1rem' }}>Estatus</th>
                                    <th style={{ textAlign: 'left', padding: '0 1rem' }}>Técnico</th>
                                    <th style={{ textAlign: 'right', padding: '0 1rem' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOTs.map(ot => {
                                    const cl = clientes.find(c => c.id === ot.clienteId);
                                    const suc = sucursales.find(s => s.id === ot.sucursalId);
                                    const eq = equipos.find(e => e.id === ot.equipoId);
                                    const tec = usuarios.find(u => u.id === ot.tecnicoId);

                                    return (
                                        <tr key={ot.id} className="glass-card animate-fade" style={{ background: 'rgba(255,165,0,0.05)', border: '1px solid rgba(255,165,0,0.2)' }}>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontWeight: '800', color: 'var(--primary)' }}>#{ot.numero}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(ot.fechas.solicitada).toLocaleDateString()}</div>
                                                    {(() => {
                                                        const start = new Date(ot.fechas.solicitada);
                                                        const end = new Date(ot.fechas.concluida || ot.fechas.finalizada || new Date());
                                                        const diffMs = end.getTime() - start.getTime();
                                                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                                                        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                                                        const durationStr = diffHours > 0 ? `${diffHours}h ${diffMins}m` : `${diffMins}m`;

                                                        return (
                                                            <div
                                                                title="Duración total desde la solicitud hasta la conclusión técnica"
                                                                style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '2px' }}
                                                            >
                                                                • {durationStr}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{suc?.nombre}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cl?.nombre}</div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontSize: '0.875rem' }}>{eq?.nombre}</div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    fontSize: '0.65rem', fontWeight: '900', padding: '0.25rem 0.6rem',
                                                    borderRadius: '6px', background: 'rgba(255,193,7,0.2)', color: '#ffb300',
                                                    border: '1px solid rgba(255,193,7,0.3)'
                                                }}>
                                                    PENDIENTE CIERRE
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{ fontSize: '0.85rem' }}>{tec?.nombre}</span>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <button
                                                    className="btn btn-primary"
                                                    style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', background: '#22c55e', opacity: generatingPdf === ot.id ? 0.7 : 1 }}
                                                    onClick={() => { setSelectedOT(ot); }}
                                                    disabled={generatingPdf === ot.id}
                                                >
                                                    {generatingPdf === ot.id ? 'GENERANDO PDF...' : 'TERMINAR'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredOTs.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                                No hay órdenes de trabajo concluidas pendientes de supervisión.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {selectedOT && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', border: '2px solid #22c55e' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>SUPERVISIÓN OT #{selectedOT.numero}</h2>
                                <span style={{ color: '#ffb300', fontWeight: '700' }}>ESPERANDO CIERRE DEL SUPERVISOR</span>
                            </div>
                            <button onClick={() => setSelectedOT(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%' }}><X size={24} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <section>
                                        <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '0.5rem' }}>DESCRIPCIÓN DE FALLA</h3>
                                        <p style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', fontSize: '0.9rem' }}>{selectedOT.descripcionFalla}</p>
                                    </section>
                                    <section>
                                        <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>JUSTIFICACIÓN DEL GERENTE</h3>
                                        <p style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', fontSize: '0.9rem' }}>{selectedOT.justificacion}</p>
                                    </section>
                                    <section>
                                        <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--accent)', marginBottom: '0.5rem' }}>TRABAJO REALIZADO</h3>
                                        <p style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>{selectedOT.descripcionServicio}</p>
                                    </section>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <section>
                                        <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#F59E0B', marginBottom: '0.5rem' }}>REPUESTOS Y MATERIALES</h3>
                                        <p style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px', fontSize: '0.9rem' }}>{selectedOT.repuestosUtilizados || 'N/A'}</p>
                                    </section>
                                    <section>
                                        <label style={{ display: 'block', marginBottom: '1rem', fontSize: '1.55rem', fontWeight: '600', color: 'var(--primary)' }}>EVIDENCIA FOTOGRÁFICA</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                            {['fotoAntes', 'fotoDespues', 'fotoExtra'].map(key => {
                                                const url = (selectedOT as any)[key];
                                                return url ? (
                                                    <a key={key} href={url} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', aspectRatio: '1' }} title="Ver en pantalla completa">
                                                        <img src={url} alt={key} style={{ width: '100%', height: '100%', objectFit: 'cover', imageOrientation: 'from-image' }} />
                                                    </a>
                                                ) : <div key={key} style={{ background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '0.6rem' }}>SIN FOTO {key.replace('foto', '').toUpperCase()}</div>;
                                            })}
                                        </div>
                                    </section>

                                    <section>
                                        <label style={{ display: 'block', marginBottom: '1rem', fontSize: '1.55rem', fontWeight: '600', color: '#F59E0B' }}>RECEPCIÓN Y FIRMAS</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{
                                                    height: '80px', width: '120px', margin: '0 auto',
                                                    background: 'white', borderRadius: '8px', overflow: 'hidden', marginBottom: '4px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {selectedOT.firmaTecnico ? <img src={selectedOT.firmaTecnico} alt="Firma Técnico" style={{ height: '70px', objectFit: 'contain', filter: 'grayscale(1) contrast(3) brightness(0.4)', imageOrientation: 'from-image' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '0.6rem' }}>Sin Firma</div>}
                                                </div>
                                                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>FIRMA TÉCNICO</p>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{
                                                    height: '80px', width: '120px', margin: '0 auto',
                                                    background: 'white', borderRadius: '8px', overflow: 'hidden', marginBottom: '4px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    {selectedOT.firmaCliente ? <img src={selectedOT.firmaCliente} alt="Firma Cliente" style={{ height: '70px', objectFit: 'contain', filter: 'grayscale(1) contrast(3) brightness(0.4)', imageOrientation: 'from-image' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '0.6rem' }}>Sin Firma</div>}
                                                </div>
                                                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>FIRMA REPCIÓN</p>
                                            </div>
                                        </div>
                                    </section>

                                    <section style={{ marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                                        <h3 style={{ fontSize: '0.8rem', fontWeight: '800', color: '#ffb300', marginBottom: '0.5rem' }}>HISTORIAL DE CAMBIOS</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '150px', overflowY: 'auto', background: 'var(--bg-input)', padding: '0.5rem', borderRadius: '8px' }}>
                                            {bitacora.map(entry => (
                                                <div key={entry.id} style={{ fontSize: '0.65rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>
                                                    <span style={{ color: '#F59E0B' }}>{entry.accion}</span> - {new Date(entry.fecha).toLocaleString()}
                                                    <div style={{ color: 'var(--text-muted)' }}>Por: {entry.usuarioNombre}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
                                <button className="btn" onClick={() => setSelectedOT(null)} style={{ flex: 1, background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}>Cerrar</button>
                                <button
                                    className="btn btn-primary"
                                    style={{ flex: 2, background: '#22c55e', fontSize: '1.1rem', fontWeight: '900' }}
                                    onClick={() => handleFinalize(selectedOT)}
                                >
                                    <CheckCircle size={20} />
                                    TERMINAR Y CERRAR OT
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
