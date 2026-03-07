import React, { useEffect, useState, useMemo } from 'react';
import {
    collection,
    query,
    getDocs,
    orderBy,
    where
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { tenantQuery } from '../services/tenantContext';
import { Edit2, Eye, Save, Printer, Download, Search, Clock, AlertCircle, CheckCircle, X, User as UserIcon, FileText } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import type { WorkOrder, Cliente, User, Sucursal, Equipo, Franquicia } from '../types';
import { generateServiceReport } from '../utils/serviceReport';
import { generateGeneralOTReport } from '../utils/generalOTReport';
import { useAuth } from '../hooks/useAuth';
import { updateOTWithAudit } from '../services/dataService';
import { PrintableServiceReport } from '../components/PrintableServiceReport';
import { PrintableGeneralReport } from '../components/PrintableGeneralReport';
import { useNotification } from '../context/NotificationContext';
import { useEscapeKey } from '../hooks/useEscapeKey';

import { SortableHeader } from '../components/SortableHeader';
import type { SortDirectionConfig } from '../components/SortableHeader';

export const KardexPage: React.FC = () => {
    const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
    const [ots, setOts] = useState<WorkOrder[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [usuarios, setUsuarios] = useState<User[]>([]);
    const [franquicias, setFranquicias] = useState<Franquicia[]>([]);
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
    const [tipoFilter, setTipoFilter] = useState('');
    const [sortConfig, setSortConfig] = useState<SortDirectionConfig>({ field: 'numero', direction: 'desc' });

    // Modal de Visualización / Edición
    const [selectedOT, setSelectedOT] = useState<WorkOrder | null>(null);
    const [printingOT, setPrintingOT] = useState<WorkOrder | null>(null);
    const [previewingGeneralItems, setPreviewingGeneralItems] = useState<{
        items: any[],
        filters?: any
    } | null>(null);
    const [editForm, setEditForm] = useState<Partial<WorkOrder>>({});
    const [bitacora, setBitacora] = useState<any[]>([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const { user, isAdmin, isCoordinador, isGerente, isTecnico, isSupervisor } = useAuth();

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [otSnap, clSnap, sucSnap, eqSnap, userSnap, franSnap] = await Promise.all([
                getDocs(tenantQuery('ordenesTrabajo', user, orderBy('numero', 'asc'))),
                getDocs(collection(db, 'clientes')),
                getDocs(tenantQuery('sucursales', user)),
                getDocs(tenantQuery('equipos', user)),
                getDocs(tenantQuery('usuarios', user)),
                getDocs(tenantQuery('franquicias', user))
            ]);

            setOts(otSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkOrder)));
            setClientes(clSnap.docs.map(d => ({ id: d.id, ...d.data() } as Cliente)));
            setSucursales(sucSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sucursal)));
            setEquipos(eqSnap.docs.map(d => ({ id: d.id, ...d.data() } as Equipo)));
            setUsuarios(userSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
            setFranquicias(franSnap.docs.map(d => ({ id: d.id, ...d.data() } as Franquicia)));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEscapeKey(() => { setSelectedOT(null); setSearchParams({}); }, !!selectedOT);
    useEscapeKey(() => setPrintingOT(null), !!printingOT);
    useEscapeKey(() => setPreviewingGeneralItems(null), !!previewingGeneralItems);

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

    const filteredOTs = useMemo(() => {
        let filtered = ots.filter(ot => {
            const matchesSearch = ot.numero.toString().includes(search) ||
                ot.descripcionFalla?.toLowerCase().includes(search.toLowerCase());
            const matchesSucursal = !sucursalFilter || ot.sucursalId === sucursalFilter;
            const matchesStatus = !statusFilter || ot.estatus === statusFilter;
            const matchesTecnico = !tecnicoFilter || ot.tecnicoId === tecnicoFilter;
            const matchesPrioridad = !prioridadFilter || ot.prioridad === prioridadFilter;
            const matchesTipo = !tipoFilter || ot.tipo === tipoFilter;

            const fecha = ot.fechas.solicitada.split('T')[0];
            const matchesFecha = fecha >= fechaInicio && fecha <= fechaFin;

            return matchesSearch && matchesSucursal && matchesStatus && matchesFecha && matchesTecnico && matchesPrioridad && matchesTipo;
        });

        filtered.sort((a, b) => {
            let valA: string | number = '';
            let valB: string | number = '';

            switch (sortConfig.field) {
                case 'numero':
                    valA = a.numero; valB = b.numero; break;
                case 'cliente':
                    valA = clientes.find(c => c.id === a.clienteId)?.nombre || '';
                    valB = clientes.find(c => c.id === b.clienteId)?.nombre || '';
                    break;
                case 'equipo':
                    valA = equipos.find(e => e.id === a.equipoId)?.nombre || '';
                    valB = equipos.find(e => e.id === b.equipoId)?.nombre || '';
                    break;
                case 'estatus':
                    valA = a.estatus; valB = b.estatus; break;
                case 'tecnico':
                    valA = usuarios.find(u => u.id === a.tecnicoId)?.nombre || '';
                    valB = usuarios.find(u => u.id === b.tecnicoId)?.nombre || '';
                    break;
                case 'prioridad':
                    const weight = { 'ALTA': 3, 'MEDIA': 2, 'BAJA': 1 };
                    valA = weight[a.prioridad as keyof typeof weight] || 0;
                    valB = weight[b.prioridad as keyof typeof weight] || 0;
                    break;
                default:
                    valA = a.numero; valB = b.numero;
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [ots, search, sucursalFilter, statusFilter, fechaInicio, fechaFin, tecnicoFilter, prioridadFilter, tipoFilter, sortConfig, clientes, equipos, usuarios]);

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
                const fran = franquicias.find(f => f.id === suc.franquiciaId);
                const success = await generateServiceReport(ot, cl, suc, eq, tec, fran);
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

    const handleGeneralReport = async (onlyPreview: boolean = false) => {
        if (filteredOTs.length === 0) {
            showNotification('No hay OTs para generar el reporte.', 'warning');
            return;
        }

        const items = filteredOTs.map(ot => {
            const s = sucursales.find(s => s.id === ot.sucursalId);
            return {
                ot,
                cliente: clientes.find(c => c.id === ot.clienteId) || clientes.find(c => c.id === s?.clienteId),
                sucursal: s,
                equipo: equipos.find(e => e.id === ot.equipoId),
                tecnico: usuarios.find(u => u.id === ot.tecnicoId),
                franquicia: franquicias.find(f => f.id === s?.franquiciaId)
            };
        });

        const currentFilters = {
            desde: fechaInicio,
            hasta: fechaFin,
            status: statusFilter || 'Todos',
            tecnico: usuarios.find(u => u.id === tecnicoFilter)?.nombre || 'Todos',
            sucursal: sucursales.find(s => s.id === sucursalFilter)?.nombre || 'Todas',
            search: search,
            tipo: tipoFilter || 'Todos',
            prioridad: prioridadFilter || 'Todas',
            registros: filteredOTs.length,
            orden: sortConfig.direction === 'asc' ? 'Ascendente' : 'Descendente'
        };

        if (onlyPreview) {
            setPreviewingGeneralItems({ items, filters: currentFilters });
            return;
        }

        setGeneratingPdf('general-all');
        try {
            const success = await generateGeneralOTReport(items, user?.nombre || 'Usuario', currentFilters);
            if (!success) showNotification('Error al generar el Reporte General.', 'error');
            else showNotification(`Reporte General de ${items.length} OTs descargado.`, 'success');
        } catch (err) {
            showNotification('Error: ' + (err instanceof Error ? err.message : String(err)), 'error');
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
            // --- REGLA DE NEGOCIO: Especialidad de Técnico Externo ---
            if (editForm.tecnicoId && editForm.tecnicoId !== selectedOT.tecnicoId) {
                const newTec = usuarios.find(u => u.id === editForm.tecnicoId);
                const equipo = equipos.find(e => e.id === selectedOT.equipoId);

                if (newTec?.rol === 'TecnicoExterno' && newTec.especialidad !== equipo?.familia) {
                    showNotification(
                        `❌ Regla de Negocio: ${newTec.nombre} es EXTERNO especialista en ${newTec.especialidad || 'desconocido'}. NO puede atender este equipo de familia ${equipo?.familia}.`,
                        "error"
                    );
                    return;
                }
            }

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

        // REGLA DE NEGOCIO: Ninguna OT CONCLUIDA (o finalizada / cerrada) se puede modificar.
        const s = selectedOT.estatus.toLowerCase();
        if (s.includes('concluida') || s.includes('finalizada') || s.includes('cerrada')) {
            return false;
        }

        if (isAdmin) return true;

        const status = selectedOT.estatus;

        if (isCoordinador) {
            // Solo hasta antes de la llegada del técnico
            if (status === 'Llegada a Sitio' || status === 'Iniciada') return false;
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

    const canSaveEditForm = (ot: WorkOrder) => {
        if (!ot) return false;

        // REGLA DE NEGOCIO GLOBAL
        const s = ot.estatus.toLowerCase();
        if (s.includes('concluida') || s.includes('finalizada') || s.includes('cerrada')) {
            return false;
        }

        if (isAdmin) return true;
        if (isGerente) return ot.estatus === 'Pendiente';
        if (isCoordinador) return ot.estatus === 'Pendiente' || ot.estatus === 'Asignada';

        return false;
    };

    const shouldShowEditControl = (_ot: WorkOrder) => {
        // En Kardex SIEMPRE mostramos el botón. Si canSaveEditForm() es falso, 
        // mostraremos el Ojo (solo ver). Si es dictamina que puede editar, mostraremos el Lápiz.
        return true;
    };

    const getStatusColor = (status: string) => {
        const s = status.toLowerCase().replace(/ /g, '');
        return `var(--status-${s})`;
    };

    const getPriorityColor = (prioridad?: string, tipo?: string) => {
        if (prioridad === 'ALTA') return '#ef4444';
        if (prioridad === 'MEDIA') return '#F59E0B';
        if (prioridad === 'BAJA') return '#22c55e';
        if (tipo === 'Preventivo') return 'var(--status-iniciada)';
        return 'var(--primary)';
    };

    const calculateDuration = (solicitada: string, end?: string) => {
        if (!end) return null;
        const start = new Date(solicitada);
        const final = new Date(end);
        const diffMs = final.getTime() - start.getTime();
        if (diffMs < 0) return null;

        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        if (diffDays > 0) return `${diffDays}d ${diffHours}h`;
        if (diffHours > 0) return `${diffHours}h ${diffMins}m`;
        return `${diffMins}m`;
    };

    return (
        <>
            <div className="animate-fade">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '800' }}>CONSULTA DE ORDENES</h1>
                        <p style={{ color: 'var(--text-muted)' }}>Historial completo de órdenes de trabajo y reportes de servicio.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            className="btn btn-primary"
                            style={{
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                gap: '0.5rem'
                            }}
                            onClick={() => handleGeneralReport(true)}
                            title={`Vista Previa e Impresión de las ${filteredOTs.length} OTs visibles`}
                        >
                            <Printer size={18} />
                            Imprimir Reporte ({filteredOTs.length})
                        </button>
                        <button
                            className="btn btn-primary"
                            style={{
                                background: 'linear-gradient(135deg, var(--primary), #4f46e5)',
                                opacity: generatingPdf === 'general-all' ? 0.6 : 1,
                                gap: '0.5rem'
                            }}
                            onClick={() => handleGeneralReport(false)}
                            disabled={generatingPdf === 'general-all'}
                            title={`Exportar PDF Directo de las ${filteredOTs.length} OTs visibles`}
                        >
                            <Download size={18} />
                            {generatingPdf === 'general-all' ? 'Generando...' : `Descargar PDF`}
                        </button>
                        <button className="btn btn-primary" onClick={() => window.print()} style={{ gap: '0.5rem' }}>
                            <Download size={18} />
                            Exportar Lista
                        </button>
                    </div>
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
                            <option value="Finalizada">Finalizada (Cerrada)</option>
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
                            style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}>
                            <option value="">Todas las Prioridades</option>
                            <option value="ALTA">🚨 ALTA</option>
                            <option value="MEDIA">⚡ MEDIA</option>
                            <option value="BAJA">✅ BAJA</option>
                        </select>

                        <select value={tipoFilter} onChange={e => setTipoFilter(e.target.value)}
                            style={{ padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}>
                            <option value="">Todos los Tipos</option>
                            <option value="Correctivo">🔧 Correctivo</option>
                            <option value="Preventivo">📅 Preventivo</option>
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
                                    <SortableHeader
                                        label="OT" field="numero" currentSort={sortConfig}
                                        onSort={(f) => setSortConfig(prev => ({ field: f, direction: prev.field === f && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                    />
                                    <SortableHeader
                                        label="Cliente / Sucursal" field="cliente" currentSort={sortConfig}
                                        onSort={(f) => setSortConfig(prev => ({ field: f, direction: prev.field === f && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                    />
                                    <SortableHeader
                                        label="Equipo" field="equipo" currentSort={sortConfig}
                                        onSort={(f) => setSortConfig(prev => ({ field: f, direction: prev.field === f && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                    />
                                    <SortableHeader
                                        label="Estatus" field="estatus" currentSort={sortConfig}
                                        onSort={(f) => setSortConfig(prev => ({ field: f, direction: prev.field === f && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                    />
                                    <SortableHeader
                                        label="Prioridad" field="prioridad" currentSort={sortConfig}
                                        onSort={(f) => setSortConfig(prev => ({ field: f, direction: prev.field === f && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                    />
                                    <SortableHeader
                                        label="Técnico" field="tecnico" currentSort={sortConfig}
                                        onSort={(f) => setSortConfig(prev => ({ field: f, direction: prev.field === f && prev.direction === 'asc' ? 'desc' : 'asc' }))}
                                    />
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
                                                    <div style={{ fontWeight: '800', color: getPriorityColor(ot.prioridad, ot.tipo), textDecoration: 'underline' }}>
                                                        {ot.tipo === 'Preventivo' ? `P-${ot.numero}` : ot.numero}
                                                    </div>
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
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                                    <span style={{
                                                        fontSize: '0.65rem', fontWeight: '800', padding: '0.25rem 0.6rem',
                                                        borderRadius: '6px', background: `${getStatusColor(ot.estatus)}20`, color: getStatusColor(ot.estatus),
                                                        border: `1px solid ${getStatusColor(ot.estatus)}40`
                                                    }}>
                                                        {ot.estatus.toUpperCase()}
                                                    </span>
                                                    {(ot.estatus === 'Concluida' || ot.estatus === 'Finalizada') && (
                                                        <div
                                                            title="Tiempo transcurrido desde la Solicitud hasta la Conclusión/Finalización de la OT"
                                                            style={{
                                                                fontSize: '0.65rem',
                                                                color: 'var(--text-muted)',
                                                                fontWeight: '700',
                                                                textAlign: 'center',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '0.2rem'
                                                            }}>
                                                            <Clock size={10} />
                                                            {calculateDuration(ot.fechas.solicitada, ot.fechas.finalizada || ot.fechas.concluida)}
                                                        </div>
                                                    )}
                                                </div>
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
                                                            title={canSaveEditForm(ot) ? "Editar / Gestionar" : "Ver Detalle"}
                                                        >
                                                            {canSaveEditForm(ot) ? <Edit2 size={16} /> : <Eye size={16} />}
                                                        </button>
                                                    )}
                                                    {(() => { const s = ot.estatus.toLowerCase(); return s.includes('concluida') || s.includes('finalizada') || s.includes('cerrada'); })() && (
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
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '70px 1rem 2rem 1rem', overflowY: 'auto' }} onClick={() => { setSelectedOT(null); setSearchParams({}); }}>
                        <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '1100px', maxHeight: 'none', minHeight: '80vh', border: '1px solid var(--primary-light)', background: 'var(--bg-card)', padding: '2.5rem', marginBottom: '4rem' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--primary-light)', letterSpacing: '-0.02em' }}>
                                        DETALLE DE ORDEN {selectedOT.tipo === 'Preventivo' ? `P-${selectedOT.numero}` : `#${selectedOT.numero}`}
                                    </h2>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '700' }}>Status: <strong style={{ color: getStatusColor(selectedOT.estatus) }}>{selectedOT.estatus.toUpperCase()}</strong></span>
                                </div>
                                <button onClick={() => { setSelectedOT(null); setSearchParams({}); }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '0.6rem', borderRadius: '50%' }}><X size={28} /></button>
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
                                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Descripción de Falla</label>
                                                    <textarea
                                                        value={editForm.descripcionFalla || ''}
                                                        onChange={e => setEditForm({ ...editForm, descripcionFalla: e.target.value })}
                                                        disabled={!canEditField('descripcionFalla')}
                                                        style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', minHeight: '120px', fontSize: '1rem' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Justificación del Gerente</label>
                                                    <textarea
                                                        value={editForm.justificacion || ''}
                                                        onChange={e => setEditForm({ ...editForm, justificacion: e.target.value })}
                                                        disabled={!canEditField('justificacion')}
                                                        style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', minHeight: '100px', fontSize: '1rem' }}
                                                    />
                                                </div>
                                            </div>
                                        </section>

                                        <section>
                                            <label style={{ display: 'block', marginBottom: '1rem', fontSize: '1.55rem', fontWeight: '600', color: 'var(--primary-light)' }}>EVIDENCIA INICIAL</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.5rem' }}>
                                                {selectedOT.fotosGerente?.map((url, i) => (
                                                    <a key={i} href={url} target="_blank" rel="noreferrer" style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', aspectRatio: '1' }} title="Ver en pantalla completa">
                                                        <img src={url} alt="Evidencia Gerente" style={{ width: '100%', height: '100%', objectFit: 'cover', imageOrientation: 'from-image' }} />
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
                                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Descripción del Servicio</label>
                                                    <textarea
                                                        value={editForm.descripcionServicio || ''}
                                                        onChange={e => setEditForm({ ...editForm, descripcionServicio: e.target.value })}
                                                        disabled={!canEditField('descripcionServicio')}
                                                        style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', minHeight: '120px', fontSize: '1rem' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--primary-light)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Materiales / Repuestos</label>
                                                    <textarea
                                                        value={editForm.repuestosUtilizados || ''}
                                                        onChange={e => setEditForm({ ...editForm, repuestosUtilizados: e.target.value })}
                                                        disabled={!canEditField('repuestosUtilizados')}
                                                        style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.4)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', minHeight: '100px', fontSize: '1rem' }}
                                                    />
                                                </div>
                                            </div>
                                        </section>

                                        <section>
                                            <label style={{ display: 'block', marginBottom: '1rem', fontSize: '1.55rem', fontWeight: '600', color: 'var(--accent)' }}>EVIDENCIA TÉCNICA</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                                {['fotoAntes', 'fotoDespues', 'fotoExtra'].map(key => {
                                                    const url = (selectedOT as any)[key];
                                                    return url ? (
                                                        <div key={key}>
                                                            <p style={{ fontSize: '0.6rem', textAlign: 'center', marginBottom: '4px', textTransform: 'uppercase' }}>{key.replace('foto', '')}</p>
                                                            <a href={url} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--glass-border)', aspectRatio: '1' }} title="Ver en pantalla completa">
                                                                <img src={url} alt={key} style={{ width: '100%', height: '100%', objectFit: 'cover', imageOrientation: 'from-image' }} />
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
                                            <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#F59E0B', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Clock size={18} /> LÍNEA DE TIEMPO
                                            </h3>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Solicitada:</span>
                                                    <span>{new Date(selectedOT.fechas.solicitada).toLocaleString()}</span>
                                                </div>
                                                {selectedOT.fechas.asignada && <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Asignada:</span>
                                                    <span>{new Date(selectedOT.fechas.asignada).toLocaleString()}</span>
                                                </div>}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '10px', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                                                    <span style={{ fontWeight: '800', color: 'var(--primary-light)' }}>Programada:</span>
                                                    <input
                                                        type="datetime-local"
                                                        value={editForm.fechas?.programada?.substring(0, 16) || ''}
                                                        onChange={e => setEditForm({ ...editForm, fechas: { ...editForm.fechas, programada: e.target.value } } as any)}
                                                        disabled={!canEditField('fechas.programada')}
                                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '700' }}
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                                    <span style={{ fontWeight: '800', color: '#F59E0B' }}>Prioridad:</span>
                                                    <select
                                                        value={editForm.prioridad || ''}
                                                        onChange={e => setEditForm({ ...editForm, prioridad: e.target.value as any })}
                                                        disabled={!canEditField('prioridad')}
                                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '700', outline: 'none' }}
                                                    >
                                                        <option value="BAJA" style={{ color: 'black' }}>Baja</option>
                                                        <option value="MEDIA" style={{ color: 'black' }}>Media</option>
                                                        <option value="ALTA" style={{ color: 'black' }}>Alta</option>
                                                    </select>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '10px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                                    <span style={{ fontWeight: '800', color: '#22c55e' }}>Técnico Resp:</span>
                                                    <select
                                                        value={editForm.tecnicoId || ''}
                                                        onChange={e => setEditForm({ ...editForm, tecnicoId: e.target.value })}
                                                        disabled={!canEditField('tecnicoId')}
                                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '700', outline: 'none', maxWidth: '150px' }}
                                                    >
                                                        <option value="" style={{ color: 'black' }}>Sin Seleccionar</option>
                                                        {usuarios.filter(u => u.rol === 'Tecnico' || u.rol === 'TecnicoExterno').map(t => (
                                                            <option key={t.id} value={t.id} style={{ color: 'black' }}>{t.nombre}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                {selectedOT.fechas.llegada && <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>Llegada Sitio:</span>
                                                    <span>{new Date(selectedOT.fechas.llegada).toLocaleString()}</span>
                                                </div>}
                                                {selectedOT.fechas.concluidaTecnico && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#F59E0B', fontWeight: '700' }}>
                                                    <span>Concluida (Técnico):</span>
                                                    <span>{new Date(selectedOT.fechas.concluidaTecnico).toLocaleString()}</span>
                                                </div>}
                                                {selectedOT.fechas.concluida && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#10b981', fontWeight: '700' }}>
                                                    <span>Concluida (Final):</span>
                                                    <span>{new Date(selectedOT.fechas.concluida).toLocaleString()}</span>
                                                </div>}
                                                {selectedOT.fechas.finalizada && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3b82f6', fontWeight: '700' }}>
                                                    <span>Finalizada:</span>
                                                    <span>{new Date(selectedOT.fechas.finalizada).toLocaleString()}</span>
                                                </div>}
                                            </div>
                                        </section>

                                        <section>
                                            <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#F59E0B', marginBottom: '1rem' }}>RECEPCCIÓN Y FIRMAS</h3>
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
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#F59E0B' }}>
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
                                            style={{ flex: 1, background: 'var(--status-finalizada)', color: 'white', fontWeight: '800' }}
                                            onClick={async () => {
                                                if (!window.confirm("¿Autorizar el CIERRE definitivo de esta OT?")) return;
                                                try {
                                                    const now = new Date();
                                                    const dateStr = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                                    const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

                                                    const updatedOT: WorkOrder = {
                                                        ...selectedOT,
                                                        estatus: 'Finalizada',
                                                        fechas: {
                                                            ...selectedOT.fechas,
                                                            finalizada: now.toISOString(),
                                                            finalizadaFecha: dateStr,
                                                            finalizadaHora: timeStr
                                                        }
                                                    };

                                                    await updateOTWithAudit(selectedOT.id, selectedOT, updatedOT, user as any, "Autorización y Cierre de OT (Supervisor)");

                                                    // Generar PDF automáticamente
                                                    await handleDownloadPdf(updatedOT);

                                                    setSelectedOT(null);
                                                    fetchData();
                                                    showNotification("OT Finalizada y Reporte Generado Exitosamente.", "success");
                                                } catch (e) {
                                                    showNotification("Error al autorizar el cierre.", "error");
                                                }
                                            }}
                                        >
                                            <CheckCircle size={20} />
                                            AUTORIZAR CIERRE
                                        </button>
                                    )}

                                    {(isAdmin || isCoordinador || isGerente) && canSaveEditForm(selectedOT) && (
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
                {
                    printingOT && (
                        <PrintableServiceReport
                            ot={printingOT}
                            cliente={clientes.find(c => c.id === printingOT.clienteId) || clientes.find(c => c.id === sucursales.find(s => s.id === printingOT.sucursalId)?.clienteId) as any}
                            sucursal={sucursales.find(s => s.id === printingOT.sucursalId) as any}
                            equipo={equipos.find(e => e.id === printingOT.equipoId) as any}
                            tecnico={usuarios.find(u => u.id === printingOT.tecnicoId)}
                            franquicia={franquicias.find(f => f.id === sucursales.find(s => s.id === printingOT.sucursalId)?.franquiciaId)}
                            onClose={() => setPrintingOT(null)}
                        />
                    )
                }
                {
                    previewingGeneralItems && (
                        <PrintableGeneralReport
                            items={previewingGeneralItems.items}
                            filters={previewingGeneralItems.filters}
                            generatorName={user?.nombre || 'Usuario'}
                            onClose={() => setPreviewingGeneralItems(null)}
                        />
                    )
                }
            </div >
        </>
    );
};
