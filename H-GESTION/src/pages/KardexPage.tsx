import React, { useEffect, useState } from 'react';
import {
    collection,
    query,
    getDocs,
    orderBy,
    where
} from 'firebase/firestore';
import { db } from '../services/firebase';
import {
    Download,
    User as UserIcon,
    Image as ImageIcon,
    CheckCircle,
    Clock,
    Search,
    FileText,
    AlertCircle,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import type { WorkOrder, Cliente, User, Sucursal, Equipo } from '../types';
import { generateServiceReport } from '../utils/serviceReport';
import { useAuth } from '../hooks/useAuth';
import { updateOTWithAudit } from '../services/dataService';
import { Edit2, X, Save, Printer, Eye } from 'lucide-react';
import { PrintableServiceReport } from '../components/PrintableServiceReport';
import { useNotification } from '../context/NotificationContext';

export const KardexPage: React.FC = () => {
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
    const [sucursalFilter, setSucursalFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [fechaInicio, setFechaInicio] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
    const [tecnicoFilter, setTecnicoFilter] = useState('');
    const [prioridadFilter, setPrioridadFilter] = useState('');

    // Modal de Visualización / Edición
    const [selectedOT, setSelectedOT] = useState<WorkOrder | null>(null);
    const [printingOT, setPrintingOT] = useState<WorkOrder | null>(null);
    const [editForm, setEditForm] = useState<Partial<WorkOrder>>({});
    const [bitacora, setBitacora] = useState<any[]>([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const { user, isAdmin, isCoordinador, isGerente, isTecnico, isSupervisor } = useAuth();

    const fetchData = async () => {
        setLoading(true);
        try {
            const [otSnap, clSnap, sucSnap, eqSnap, userSnap] = await Promise.all([
                getDocs(query(collection(db, 'ordenesTrabajo'), orderBy('numero', 'asc'))),
                getDocs(collection(db, 'clientes')),
                getDocs(collection(db, 'sucursales')),
                getDocs(collection(db, 'equipos')),
                getDocs(collection(db, 'usuarios'))
            ]);

            setOts(otSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkOrder)));
            setClientes(clSnap.docs.map(d => ({ id: d.id, ...d.data() } as Cliente)));
            setSucursales(sucSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sucursal)));
            setEquipos(eqSnap.docs.map(d => ({ id: d.id, ...d.data() } as Equipo)));
            setUsuarios(userSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Load Audit for selected OT
    useEffect(() => {
        const fetchAudit = async () => {
            if (!selectedOT) {
                setBitacora([]);
                return;
            }
            const q = query(collection(db, 'bitacora'), where('otId', '==', selectedOT.id));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Order by date localy for now or use query orderBy
            data.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            setBitacora(data);
        };
        fetchAudit();
    }, [selectedOT]);

    // Effect for deep linking
    useEffect(() => {
        if (ots.length > 0) {
            const otId = searchParams.get('id');
            const otNum = searchParams.get('ot');
            if (otId) {
                const found = ots.find(o => o.id === otId);
                if (found) { setSelectedOT(found); setEditForm(found); }
            } else if (otNum) {
                const found = ots.find(o => o.numero.toString() === otNum);
                if (found) { setSelectedOT(found); setEditForm(found); }
            }
        }
    }, [ots, searchParams]);

    const filteredOTs = ots.filter(ot => {
        const matchesSearch = ot.numero.toString().includes(search) ||
            ot.descripcionFalla?.toLowerCase().includes(search.toLowerCase());
        const matchesSucursal = !sucursalFilter || ot.sucursalId === sucursalFilter;
        const matchesStatus = !statusFilter || ot.estatus === statusFilter;
        const matchesTecnico = !tecnicoFilter || ot.tecnicoId === tecnicoFilter;
        const matchesPrioridad = !prioridadFilter || ot.prioridad === prioridadFilter;

        const fecha = ot.fechas.solicitada.split('T')[0];
        const matchesFecha = fecha >= fechaInicio && fecha <= fechaFin;

        return matchesSearch && matchesSucursal && matchesStatus && matchesFecha && matchesTecnico && matchesPrioridad;
    }).sort((a, b) => {
        if (sortDirection === 'asc') return a.numero - b.numero;
        return b.numero - a.numero;
    });

    const handleDownloadPdf = async (ot: WorkOrder) => {
        console.log("Iniciando generación de PDF para OT:", ot.numero, "clientID in OT:", ot.clienteId);
        setGeneratingPdf(ot.id);

        let cl = clientes.find(c => c.id === ot.clienteId);
        const suc = sucursales.find(s => s.id === ot.sucursalId);
        const eq = equipos.find(e => e.id === ot.equipoId);
        const tec = usuarios.find(u => u.id === ot.tecnicoId);

        // Fallback: If client not found in OT, try to find it via sucursal
        if (!cl && suc) {
            console.log("Client not found by OT.clienteId, trying sucursal.clienteId:", suc.clienteId);
            cl = clientes.find(c => c.id === suc.clienteId);
        }

        if (cl && suc && eq) {
            try {
                const success = await generateServiceReport(ot, cl, suc, eq, tec);
                if (!success) {
                    showNotification("Error al generar el PDF. Verifica la consola.", "error");
                }
            } catch (err) {
                console.error("PDF generation failed:", err);
                showNotification("Error crítico al generar el reporte: " + (err instanceof Error ? err.message : String(err)), "error");
            }
        } else {
            console.error("Missing data for PDF:", { cl, suc, eq });
            const missing = [];
            if (!cl) missing.push("Cliente");
            if (!suc) missing.push("Sucursal");
            if (!eq) missing.push("Equipo");
            showNotification(`No se pudo generar el PDF: Faltan datos maestros (${missing.join(', ')}).`, "warning");
        }
        setGeneratingPdf(null);
    };

    const handleEditSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOT || !user) return;

        // Determinar acción para la bitácora
        let accion = "Modificación de OT";
        if (editForm.fechas?.programada !== selectedOT.fechas?.programada) {
            accion = "Cambio de Cita";
        }

        try {
            await updateOTWithAudit(selectedOT.id, selectedOT, editForm, user as any, accion);
            setSelectedOT(null);
            setSearchParams({}); // Clear params
            fetchData();
            showNotification("Cambios guardados y registrados en bitácora.", "success");
        } catch (error) {
            showNotification("Error al actualizar la OT.", "error");
        }
    };

    const canEditField = (field: string) => {
        if (!selectedOT) return false;
        const status = selectedOT.estatus;

        if (isAdmin) return true;

        if (isCoordinador) {
            // Solo hasta antes de la llegada del técnico
            if (status === 'Llegada a Sitio' || status === 'Iniciada' || status === 'Concluida' || status === 'Terminada') return false;
            return ['prioridad', 'tecnicoId', 'fechas.programada'].includes(field);
        }
        if (isGerente) {
            // Solo hasta antes de ser asignada
            if (status !== 'Pendiente') return false;
            return ['descripcionFalla', 'justificacion', 'fotosGerente', 'equipoId', 'familia'].includes(field);
        }
        if (isTecnico) {
            return false; // El técnico no edita nada en KARDEX/Consulta
        }
        return false;
    };

    const shouldShowEditControl = (ot: WorkOrder) => {
        if (isAdmin) return true;
        const status = ot.estatus;
        if (isGerente) {
            // Desaparece al pasar a ASIGNADA (o cualquier estado posterior)
            return status === 'Pendiente';
        }
        if (isCoordinador) {
            // Desaparece al pasar a EN SITIO (Llegada a Sitio o posterior)
            return status === 'Pendiente' || status === 'Asignada';
        }
        // El técnico siempre puede entrar a ver, pero canEditField controlará qué toca
        return isTecnico || isSupervisor;
    };

    const getStatusColor = (status: string) => {
        const s = status.toLowerCase().replace(/ /g, '');
        return `var(--status-${s})`;
    };

    return (
        <>
            <div className="animate-fade">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>CONSULTA DE ORDENES</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Historial completo de órdenes de trabajo y reportes de servicio.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => window.print()}>
                        <Download size={18} />
                        Exportar Lista
                    </button>
                </div>

                {/* Filtros Avanzados */}
                <div className="glass-card" style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text" placeholder="Buscar por OT o falla..." value={search} onChange={e => setSearch(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                            />
                        </div>

                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                            style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}>
                            <option value="">Todos los Estatus</option>
                            <option value="Pendiente">Pendiente</option>
                            <option value="Asignada">Asignada</option>
                            <option value="Llegada a Sitio">Llegada a Sitio</option>
                            <option value="Concluida. Pendiente Firma Cliente">Pendiente Firma</option>
                            <option value="Concluida">Concluida (Final)</option>
                            <option value="Terminada">Terminada (Cerrada)</option>
                        </select>

                        <select value={sucursalFilter} onChange={e => setSucursalFilter(e.target.value)}
                            style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}>
                            <option value="">Todas las Sucursales</option>
                            {sucursales.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>

                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                                style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }} />
                            <span style={{ color: 'var(--text-muted)' }}>-</span>
                            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)}
                                style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.8rem' }} />
                        </div>

                        <select value={tecnicoFilter} onChange={e => setTecnicoFilter(e.target.value)}
                            style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}>
                            <option value="">Cualquier Técnico</option>
                            {usuarios.filter(u => u.rol === 'Tecnico' || u.rol === 'TecnicoExterno').map(t => (
                                <option key={t.id} value={t.id}>{t.nombre}</option>
                            ))}
                        </select>

                        <select value={prioridadFilter} onChange={e => setPrioridadFilter(e.target.value)}
                            style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}>
                            <option value="">Todas las Prioridades</option>
                            <option value="ALTA">🚨 ALTA</option>
                            <option value="MEDIA">⚡ MEDIA</option>
                            <option value="BAJA">✅ BAJA</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando registros...</div>
                ) : (
                    <div className="scrollable-x custom-scrollbar">
                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.75rem' }}>
                            <thead>
                                <tr style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    <th style={{ textAlign: 'left', padding: '0 1rem' }}>
                                        <button
                                            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                                            style={{
                                                background: 'transparent', border: 'none', color: 'var(--text-muted)',
                                                fontWeight: '800', fontSize: '0.75rem', display: 'flex',
                                                alignItems: 'center', gap: '0.4rem', cursor: 'pointer',
                                                padding: 0, textTransform: 'uppercase'
                                            }}
                                        >
                                            OT
                                            {sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                        </button>
                                    </th>
                                    <th style={{ textAlign: 'left', padding: '0 1rem' }}>Cliente / Sucursal</th>
                                    <th style={{ textAlign: 'left', padding: '0 1rem' }}>Equipo</th>
                                    <th style={{ textAlign: 'left', padding: '0 1rem' }}>Estatus</th>
                                    <th style={{ textAlign: 'left', padding: '0 1rem' }}>Prioridad</th>
                                    <th style={{ textAlign: 'left', padding: '0 1rem' }}>Técnico Asignado</th>
                                    <th style={{ textAlign: 'right', padding: '0 1rem' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOTs.map(ot => {
                                    const cl = clientes.find(c => c.id === ot.clienteId);
                                    const suc = sucursales.find(s => s.id === ot.sucursalId);
                                    const eq = equipos.find(e => e.id === ot.equipoId);
                                    const tec = usuarios.find(u => u.id === ot.tecnicoId);

                                    return (
                                        <tr key={ot.id} className="glass-card animate-fade" style={{ background: 'rgba(255,255,255,0.03)', transition: 'transform 0.2s' }}>
                                            <td style={{ padding: '1rem' }}>
                                                <button
                                                    onClick={() => { setSelectedOT(ot); setEditForm(ot); }}
                                                    style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', display: 'block' }}
                                                >
                                                    <div style={{ fontWeight: '800', color: 'var(--primary)', textDecoration: 'underline' }}>#{ot.numero}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{new Date(ot.fechas.solicitada).toLocaleDateString()}</div>
                                                </button>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{suc?.nombre}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cl?.nombre}</div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontSize: '0.875rem' }}>{eq?.nombre}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>{eq?.familia}</div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    fontSize: '0.65rem', fontWeight: '800', padding: '0.25rem 0.6rem',
                                                    borderRadius: '6px', background: `${getStatusColor(ot.estatus)}20`, color: getStatusColor(ot.estatus),
                                                    border: `1px solid ${getStatusColor(ot.estatus)}40`
                                                }}>
                                                    {ot.estatus.toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                {ot.prioridad && (
                                                    <span style={{
                                                        fontSize: '0.65rem', fontWeight: '800', padding: '0.25rem 0.6rem',
                                                        borderRadius: '6px',
                                                        background: ot.prioridad === 'ALTA' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(251, 191, 36, 0.1)',
                                                        color: ot.prioridad === 'ALTA' ? '#ef4444' : '#fbbf24',
                                                        border: `1px solid ${ot.prioridad === 'ALTA' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(251, 191, 36, 0.2)'}`
                                                    }}>
                                                        {ot.prioridad}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <UserIcon size={14} />
                                                    </div>
                                                    <span style={{ fontSize: '0.85rem' }}>{tec?.nombre || 'Pendiente'}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    {shouldShowEditControl(ot) && (
                                                        <button
                                                            className="btn btn-ghost" style={{ padding: '0.4rem' }}
                                                            onClick={() => { setSelectedOT(ot); setEditForm(ot); }}
                                                            title={isTecnico ? "Ver Detalle" : "Editar / Gestionar"}
                                                        >
                                                            {isTecnico ? <Eye size={16} /> : <Edit2 size={16} />}
                                                        </button>
                                                    )}
                                                    {(ot.estatus.toLowerCase() === 'concluida' || ot.estatus.toLowerCase() === 'terminada' || ot.estatus.toLowerCase() === 'cerrada') && (
                                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                            <button
                                                                className="btn btn-primary"
                                                                style={{
                                                                    padding: '0.6rem 1.25rem', fontSize: '0.75rem', gap: '0.6rem',
                                                                    opacity: generatingPdf === ot.id ? 0.5 : 1,
                                                                    background: 'linear-gradient(135deg, #2563eb, #1e40af)',
                                                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                                                                    border: 'none'
                                                                }}
                                                                onClick={(e) => { e.stopPropagation(); handleDownloadPdf(ot); }}
                                                                disabled={generatingPdf === ot.id}
                                                                title="Descargar Hoja de Servicio (PDF)"
                                                            >
                                                                <FileText size={18} />
                                                                <span style={{ fontWeight: '800' }}>{generatingPdf === ot.id ? 'GENERANDO...' : 'HOJA DE SERVICIO'}</span>
                                                            </button>

                                                            <button
                                                                className="btn btn-ghost"
                                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', gap: '0.5rem', background: 'rgba(34,197,94,0.1)' }}
                                                                onClick={() => setPrintingOT(ot)}
                                                                title="Ver Hoja Tamaño Carta para Imprimir"
                                                            >
                                                                <Printer size={16} color="#22c55e" />
                                                                <span style={{ fontWeight: '800', color: '#22c55e' }}>IMPRIMIR</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredOTs.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                                No se encontraron registros con los filtros seleccionados.
                            </div>
                        )}
                    </div>
                )}

                {selectedOT && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                        <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--primary-light)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>DETALLE DE ORDEN #{selectedOT.numero}</h2>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status: <strong style={{ color: getStatusColor(selectedOT.estatus) }}>{selectedOT.estatus.toUpperCase()}</strong></span>
                                </div>
                                <button onClick={() => { setSelectedOT(null); setSearchParams({}); }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem', borderRadius: '50%' }}><X size={24} /></button>
                            </div>

                            <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                                    {/* Columna 1: Datos de Solicitud */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <section>
                                            <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <AlertCircle size={18} /> DATOS DEL REQUERIMIENTO
                                            </h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>Descripción de Falla</label>
                                                    <textarea
                                                        value={editForm.descripcionFalla || ''}
                                                        onChange={e => setEditForm({ ...editForm, descripcionFalla: e.target.value })}
                                                        disabled={!canEditField('descripcionFalla')}
                                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--glass-border)', minHeight: '100px' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>Justificación del Gerente</label>
                                                    <textarea
                                                        value={editForm.justificacion || ''}
                                                        onChange={e => setEditForm({ ...editForm, justificacion: e.target.value })}
                                                        disabled={!canEditField('justificacion')}
                                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--glass-border)', minHeight: '80px' }}
                                                    />
                                                </div>
                                            </div>
                                        </section>

                                        <section>
                                            <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <ImageIcon size={18} /> EVIDENCIA INICIAL
                                            </h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem' }}>
                                                {selectedOT.fotosGerente?.map((url, i) => (
                                                    <a key={i} href={url} target="_blank" rel="noreferrer" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', aspectRatio: '1' }} title="Ver en pantalla completa">
                                                        <img src={url} alt="Evidencia Gerente" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </a>
                                                ))}
                                                {(!selectedOT.fotosGerente || selectedOT.fotosGerente.length === 0) && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sin fotos.</p>}
                                            </div>
                                        </section>
                                    </div>

                                    {/* Columna 2: Datos de Atención */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <section>
                                            <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--accent)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <CheckCircle size={18} /> TRABAJO EJECUTADO
                                            </h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>Descripción del Servicio</label>
                                                    <textarea
                                                        value={editForm.descripcionServicio || ''}
                                                        onChange={e => setEditForm({ ...editForm, descripcionServicio: e.target.value })}
                                                        disabled={!canEditField('descripcionServicio')}
                                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--glass-border)', minHeight: '100px' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', marginBottom: '0.25rem' }}>Materiales / Repuestos</label>
                                                    <textarea
                                                        value={editForm.repuestosUtilizados || ''}
                                                        onChange={e => setEditForm({ ...editForm, repuestosUtilizados: e.target.value })}
                                                        disabled={!canEditField('repuestosUtilizados')}
                                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid var(--glass-border)', minHeight: '80px' }}
                                                    />
                                                </div>
                                            </div>
                                        </section>

                                        <section>
                                            <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--accent)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <ImageIcon size={18} /> EVIDENCIA TÉCNICA
                                            </h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                                {['fotoAntes', 'fotoDespues', 'fotoExtra'].map(key => {
                                                    const url = (selectedOT as any)[key];
                                                    return url ? (
                                                        <div key={key}>
                                                            <p style={{ fontSize: '0.6rem', textAlign: 'center', marginBottom: '4px', textTransform: 'uppercase' }}>{key.replace('foto', '')}</p>
                                                            <a href={url} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', aspectRatio: '1' }} title="Ver en pantalla completa">
                                                                <img src={url} alt={key} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            </a>
                                                        </div>
                                                    ) : null;
                                                })}
                                            </div>
                                        </section>
                                    </div>

                                    {/* Columna 3: Tiempos, Firmas y Audit */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                        <section style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                                            <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#fbbf24', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Clock size={18} /> LÍNEA DE TIEMPO
                                            </h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.75rem', color: 'white' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Solicitada:</span>
                                                    <span>{new Date(selectedOT.fechas.solicitada).toLocaleString()}</span>
                                                </div>
                                                {selectedOT.fechas.asignada && <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Asignada:</span>
                                                    <span>{new Date(selectedOT.fechas.asignada).toLocaleString()}</span>
                                                </div>}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '8px', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                                                    <span style={{ fontWeight: '700' }}>Programada:</span>
                                                    <input
                                                        type="datetime-local"
                                                        value={editForm.fechas?.programada?.substring(0, 16) || ''}
                                                        onChange={e => setEditForm({ ...editForm, fechas: { ...editForm.fechas, programada: e.target.value } } as any)}
                                                        disabled={!canEditField('fechas.programada')}
                                                        style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'text', fontSize: '0.75rem' }}
                                                    />
                                                </div>
                                                {selectedOT.fechas.llegada && <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Llegada Sitio:</span>
                                                    <span>{new Date(selectedOT.fechas.llegada).toLocaleString()}</span>
                                                </div>}
                                                {selectedOT.fechas.concluidaTecnico && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fbbf24', fontWeight: '700' }}>
                                                    <span>Concluida (Técnico):</span>
                                                    <span>{new Date(selectedOT.fechas.concluidaTecnico).toLocaleString()}</span>
                                                </div>}
                                                {selectedOT.fechas.concluida && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: '700' }}>
                                                    <span>Concluida (Final):</span>
                                                    <span>{new Date(selectedOT.fechas.concluida).toLocaleString()}</span>
                                                </div>}
                                                {selectedOT.fechas.terminada && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3b82f6', fontWeight: '700' }}>
                                                    <span>Terminada:</span>
                                                    <span>{new Date(selectedOT.fechas.terminada).toLocaleString()}</span>
                                                </div>}
                                            </div>
                                        </section>

                                        <section>
                                            <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#fbbf24', marginBottom: '1rem' }}>RECEPCCIÓN Y FIRMAS</h3>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{
                                                        height: '80px', width: '120px', margin: '0 auto',
                                                        background: 'white', borderRadius: '8px', overflow: 'hidden', marginBottom: '4px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        {selectedOT.firmaTecnico ? <img src={selectedOT.firmaTecnico} alt="Firma Técnico" style={{ height: '70px', objectFit: 'contain', filter: 'grayscale(1) contrast(3) brightness(0.4)' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '0.6rem' }}>Sin Firma</div>}
                                                    </div>
                                                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>FIRMA TÉCNICO</p>
                                                </div>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div style={{
                                                        height: '80px', width: '120px', margin: '0 auto',
                                                        background: 'white', borderRadius: '8px', overflow: 'hidden', marginBottom: '4px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        {selectedOT.firmaCliente ? <img src={selectedOT.firmaCliente} alt="Firma Cliente" style={{ height: '70px', objectFit: 'contain', filter: 'grayscale(1) contrast(3) brightness(0.4)' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '0.6rem' }}>Sin Firma</div>}
                                                    </div>
                                                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>FIRMA RECEPCIÓN</p>
                                                </div>
                                            </div>
                                            {selectedOT.comentariosCliente && (
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-muted)', borderLeft: '2px solid var(--accent)', paddingLeft: '0.5rem' }}>
                                                    "{selectedOT.comentariosCliente}"
                                                </div>
                                            )}
                                        </section>
                                        {/* Historial de Eventos (Bitácora) */}
                                        <section style={{ marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                                            <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#ffb9b9', marginBottom: '1rem', textTransform: 'uppercase' }}>HISTORIAL DE STATUS Y CAMBIOS</h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', background: 'var(--bg-input)', padding: '0.75rem', borderRadius: '8px' }}>
                                                {bitacora.length > 0 ? bitacora.map(entry => (
                                                    <div key={entry.id} style={{ fontSize: '0.7rem', padding: '0.4rem', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fbbf24' }}>
                                                            <span style={{ fontWeight: '700' }}>{entry.accion}</span>
                                                            <span>{new Date(entry.fecha).toLocaleString()}</span>
                                                        </div>
                                                        <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                                                            Por: <strong>{entry.usuarioNombre}</strong> | Campo: <i>{entry.campo}</i>
                                                        </div>
                                                        <div style={{ marginTop: '2px' }}>
                                                            <span style={{ color: '#ef4444' }}>{String(entry.valorAnterior)}</span> → <span style={{ color: '#10b981' }}>{String(entry.valorNuevo)}</span>
                                                        </div>
                                                    </div>
                                                )) : <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>No hay registros de auditoría para esta OT.</p>}
                                            </div>
                                        </section>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
                                    <button type="button" className="btn" onClick={() => { setSelectedOT(null); setSearchParams({}); }} style={{ flex: 1, background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}>Cerrar Vista</button>

                                    {isSupervisor && selectedOT.estatus === 'Concluida' && (
                                        <button
                                            type="button"
                                            className="btn"
                                            style={{ flex: 1, background: 'var(--status-terminada)', color: 'white', fontWeight: '800' }}
                                            onClick={async () => {
                                                if (!window.confirm("¿Autorizar el CIERRE definitivo de esta OT?")) return;
                                                try {
                                                    const now = new Date();
                                                    const dateStr = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                                    const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

                                                    const updatedOT: WorkOrder = {
                                                        ...selectedOT,
                                                        estatus: 'Terminada',
                                                        fechas: {
                                                            ...selectedOT.fechas,
                                                            terminada: now.toISOString(),
                                                            terminadaFecha: dateStr,
                                                            terminadaHora: timeStr
                                                        }
                                                    };

                                                    await updateOTWithAudit(selectedOT.id, selectedOT, updatedOT, user as any, "Autorización y Cierre de OT (Supervisor)");

                                                    // Generar PDF automáticamente
                                                    await handleDownloadPdf(updatedOT);

                                                    setSelectedOT(null);
                                                    fetchData();
                                                    showNotification("OT Terminada y Reporte Generado Exitosamente.", "success");
                                                } catch (e) {
                                                    showNotification("Error al autorizar el cierre.", "error");
                                                }
                                            }}
                                        >
                                            <CheckCircle size={20} />
                                            AUTORIZAR CIERRE
                                        </button>
                                    )}

                                    {(isAdmin || isCoordinador || isGerente) && shouldShowEditControl(selectedOT) && (
                                        <button type="submit" className="btn btn-primary" style={{ flex: 1, minHeight: '56px', fontSize: '1rem' }}>
                                            <Save size={18} />
                                            Guardar Cambios y Registrar Audit
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                {printingOT && (
                    <PrintableServiceReport
                        ot={printingOT}
                        cliente={clientes.find(c => c.id === printingOT.clienteId) || clientes.find(c => c.id === sucursales.find(s => s.id === printingOT.sucursalId)?.clienteId) as any}
                        sucursal={sucursales.find(s => s.id === printingOT.sucursalId) as any}
                        equipo={equipos.find(e => e.id === printingOT.equipoId) as any}
                        tecnico={usuarios.find(u => u.id === printingOT.tecnicoId)}
                        onClose={() => setPrintingOT(null)}
                    />
                )}
            </div>
        </>
    );
};
