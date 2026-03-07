import React, { useState, useEffect, useMemo } from 'react';
import {
    X, Search, RefreshCw,
    Loader2, AlertCircle, CheckCircle2,
    History, Clock, MapPin, Gauge, ShieldCheck
} from 'lucide-react';
import {
    getFullMassiveOTsForEvent,
    updateMassiveBatchOTs,
    getMassiveBatchHistory,
    type PreventivoPlanEntry
} from '../services/dataService';
import type { User, MassiveBatchRecord, Equipo } from '../types';
import { useNotification } from '../context/NotificationContext';

const STATUS_ICONS: Record<string, any> = {
    'Asignada': { icon: Clock, color: 'var(--primary)', label: 'Asignada' },
    'Llegada a Sitio': { icon: MapPin, color: '#F59E0B', label: 'En Sitio' },
    'Iniciada': { icon: Gauge, color: '#3b82f6', label: 'Iniciada' },
    'Concluida. Pendiente Firma Cliente': { icon: Clock, color: '#06b6d4', label: 'Concluida (PF)' },
    'Concluida': { icon: CheckCircle2, color: '#10b981', label: 'Concluida' },
    'Finalizada': { icon: ShieldCheck, color: '#8b5cf6', label: 'Finalizada' },
};

interface Props {
    evento: PreventivoPlanEntry;
    allTecnicos: User[];
    equipos: Equipo[];
    user: User;
    onClose: () => void;
    onUpdate: () => void;
}

export const MassiveOTDashboard: React.FC<Props> = ({
    evento, allTecnicos, equipos, user, onClose, onUpdate
}) => {
    const { showNotification } = useNotification();

    // --- State ---
    const [loading, setLoading] = useState(true);
    const [ots, setOts] = useState<any[]>([]);
    const [history, setHistory] = useState<MassiveBatchRecord[]>([]);

    // UI state
    const [tab, setTab] = useState<'lista' | 'historial'>('lista');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('todos');
    const [selectedOTs, setSelectedOTs] = useState<string[]>([]);

    // Batch edit state
    const [batchEditing, setBatchEditing] = useState(false);
    const [newDate, setNewDate] = useState('');
    const [newTecnicoId, setNewTecnicoId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // --- Data Loading ---
    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getFullMassiveOTsForEvent(evento.id);
            setOts(data.ots);

            const batchHistory = await getMassiveBatchHistory(evento.id);
            setHistory(batchHistory || []);
        } catch (error) {
            console.error(error);
            showNotification("Error al cargar datos del panel.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [evento.id]);

    // --- Helper de Nombres ---
    const getTecnicoDisplayName = (id?: string) => {
        if (!id) return 'Sin asignar';
        return allTecnicos.find(t => t.id === id)?.nombre || 'Técnico Desconocido';
    };

    // --- Filtering ---
    const filteredOts = useMemo(() => {
        return (ots || []).filter(ot => {
            const tecName = getTecnicoDisplayName(ot.tecnicoId);
            const matchesSearch = tecName.toLowerCase().includes(search.toLowerCase()) ||
                ot.numero.toString().includes(search) ||
                (ot.descripcionFalla || '').toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === 'todos' || ot.estatus === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [ots, search, statusFilter, allTecnicos]);

    // --- Actions ---
    const toggleSelectAll = () => {
        if (selectedOTs.length === filteredOts.length && filteredOts.length > 0) {
            setSelectedOTs([]);
        } else {
            const selectable = filteredOts.filter(ot => ot.estatus === 'Asignada').map(ot => ot.id);
            setSelectedOTs(selectable);
        }
    };

    const handleBatchUpdate = async () => {
        if (!selectedOTs.length || (!newDate && !newTecnicoId)) return;

        // --- REGLA DE NEGOCIO: Especialidad de Técnico Externo ---
        if (newTecnicoId) {
            const targetTec = allTecnicos.find(t => t.id === newTecnicoId);
            const normalize = (s: string | undefined) => s?.trim().toLowerCase() || '';
            const tecSpec = normalize(targetTec?.especialidad);

            if (tecSpec) {
                for (const otId of selectedOTs) {
                    const ot = ots.find(o => o.id === otId);
                    const equipo = equipos.find(e => e.id === ot?.equipoId);
                    const eqFam = normalize(equipo?.familia);

                    if (tecSpec !== eqFam) {
                        showNotification(
                            `❌ Regla de Negocio: ${targetTec?.nombre} tiene especialidad en ${targetTec?.especialidad}. NO puede atender equipo de familia ${equipo?.familia} (OT #${ot?.numero}).`,
                            "error"
                        );
                        return; // Detener toda la operación si hay conflicto
                    }
                }
            }
        }

        setIsSaving(true);

        try {
            // Construir array de cambios según firma de updateMassiveBatchOTs
            const changes = selectedOTs.map(id => {
                const ot = ots.find(o => o.id === id);
                return {
                    otId: id,
                    otNumero: ot.numero,
                    equipoId: ot.equipoId,
                    equipoNombre: ot.descripcionFalla || 'Equipo sin nombre',
                    newTecnicoId: newTecnicoId || undefined,
                    newFechaProgramada: newDate || undefined
                };
            });

            const result = await updateMassiveBatchOTs(
                evento.id,
                changes,
                user,
                allTecnicos
            );

            showNotification(`Se actualizaron ${result.totalModificadas} órdenes exitosamente.`, "success");
            if (result.conflictos && result.conflictos.length > 0) {
                showNotification(`${result.conflictos.length} órdenes tenían conflictos y no se tocaron.`, "warning");
            }
            setBatchEditing(false);
            setSelectedOTs([]);
            loadData();
            onUpdate();
        } catch (error) {
            console.error(error);
            showNotification("Error al aplicar cambios en lote.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const formatDate = (iso: string) => {
        if (!iso) return 'N/A';
        try {
            const d = new Date(iso);
            return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
        } catch { return 'Err'; }
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 200000 }}>
            <div className="glass-card modal-content animate-scale-up" style={{ maxWidth: '1000px', width: '95%', padding: '0', overflow: 'hidden', height: '85vh', display: 'flex', flexDirection: 'column' }}>

                {/* Header */}
                <div style={{ padding: '1.5rem 2rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ width: '45px', height: '45px', borderRadius: '14px', background: 'rgba(var(--primary-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <History size={24} className="text-primary" />
                            </div>
                            <div>
                                <h3 style={{ fontWeight: '900', fontSize: '1.3rem' }}>Centro de Mando Masivo</h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mantenimiento: {evento.txtPDF} • Programado para día {evento.fechas}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="hover:text-primary transition-colors"><X size={28} /></button>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem' }}>
                        {[
                            { id: 'lista', label: 'Gestión de OTs', icon: Clock },
                            { id: 'historial', label: 'Bitácora Quirúrgica', icon: History }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setTab(t.id as any)}
                                style={{
                                    background: 'none', border: 'none', color: tab === t.id ? 'var(--primary)' : 'var(--text-muted)',
                                    fontWeight: '800', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem',
                                    cursor: 'pointer', padding: '0.5rem 0', position: 'relative'
                                }}
                            >
                                <t.icon size={16} />
                                {t.label}
                                {tab === t.id && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: 'var(--primary)', borderRadius: '2px' }} />}
                            </button>
                        ))}
                    </div>
                </div>

                {tab === 'lista' && (
                    <div style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                            <div style={{ position: 'relative', width: '250px' }}>
                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                <input
                                    type="text" placeholder="Buscar OT o técnico..."
                                    value={search} onChange={(e) => setSearch(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2rem', fontSize: '0.75rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--glass-border)', color: 'white' }}
                                />
                            </div>
                            <select
                                value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                                style={{ padding: '0.6rem', fontSize: '0.75rem', borderRadius: '8px', background: 'var(--bg-input)', border: '1px solid var(--glass-border)', color: 'white' }}
                            >
                                <option value="todos">Todos los Estatus</option>
                                <option value="Asignada">Asignada (Editable)</option>
                                <option value="Llegada a Sitio">En Sitio</option>
                                <option value="Finalizada">Finalizada</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={loadData} className="btn" style={{ fontSize: '0.75rem', padding: '0.6rem' }}>
                                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>
                )}

                <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }} className="custom-scrollbar">
                    {loading ? (
                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
                            <Loader2 size={40} className="animate-spin text-primary" />
                            <p style={{ marginTop: '1rem', fontSize: '0.8rem', fontWeight: '700' }}>Sincronizando con la nube...</p>
                        </div>
                    ) : tab === 'lista' ? (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>Total OTs</p>
                                    <p style={{ fontSize: '1.4rem', fontWeight: '900' }}>{ots.length}</p>
                                </div>
                                <div style={{ padding: '1rem', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                    <p style={{ fontSize: '0.6rem', color: '#22c55e', fontWeight: '800', textTransform: 'uppercase' }}>Editables</p>
                                    <p style={{ fontSize: '1.4rem', fontWeight: '900', color: '#22c55e' }}>{ots.filter(o => o.estatus === 'Asignada').length}</p>
                                </div>
                                <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                    <p style={{ fontSize: '0.6rem', color: '#F59E0B', fontWeight: '800', textTransform: 'uppercase' }}>Con Avance</p>
                                    <p style={{ fontSize: '1.4rem', fontWeight: '900', color: '#F59E0B' }}>{ots.filter(o => o.estatus !== 'Asignada' && o.estatus !== 'Finalizada').length}</p>
                                </div>
                                <div style={{ padding: '1rem', background: 'rgba(139, 92, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                                    <p style={{ fontSize: '0.6rem', color: '#8b5cf6', fontWeight: '800', textTransform: 'uppercase' }}>Finalizadas</p>
                                    <p style={{ fontSize: '1.4rem', fontWeight: '900', color: '#8b5cf6' }}>{ots.filter(o => o.estatus === 'Finalizada').length}</p>
                                </div>
                            </div>

                            {selectedOTs.length > 0 && (
                                <div style={{
                                    padding: '1rem 1.5rem', background: 'rgba(var(--primary-rgb), 0.1)', border: '1px solid var(--primary)',
                                    borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <CheckCircle2 size={18} className="text-primary" />
                                        <span style={{ fontWeight: '800', fontSize: '0.85rem' }}>{selectedOTs.length} OTs seleccionadas para edición masiva</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button onClick={() => setBatchEditing(true)} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>AJUSTAR LOTE</button>
                                        <button onClick={() => setSelectedOTs([])} className="btn" style={{ padding: '0.5rem 1rem' }}>CANCELAR</button>
                                    </div>
                                </div>
                            )}

                            <div style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                    <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
                                        <tr>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', width: '40px' }}>
                                                <input type="checkbox" checked={selectedOTs.length === filteredOts.length && filteredOts.length > 0} onChange={toggleSelectAll} />
                                            </th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '800', color: 'var(--text-muted)', fontSize: '0.6rem', textTransform: 'uppercase' }}>Folio / Equipo</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '800', color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Estatus</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '800', color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Técnico</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '800', color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Fecha Prog.</th>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '800', color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase' }}>IDV</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredOts.map(ot => {
                                            const statusCfg = STATUS_ICONS[ot.estatus] || { icon: Clock, color: 'white', label: ot.estatus };
                                            const isEditable = ot.estatus === 'Asignada';

                                            return (
                                                <tr key={ot.id} style={{ borderTop: '1px solid var(--glass-border)', background: selectedOTs.includes(ot.id) ? 'rgba(var(--primary-rgb), 0.03)' : 'transparent' }}>
                                                    <td style={{ padding: '0.75rem 1rem' }}>
                                                        <input
                                                            type="checkbox" disabled={!isEditable}
                                                            checked={selectedOTs.includes(ot.id)}
                                                            onChange={() => setSelectedOTs(prev => prev.includes(ot.id) ? prev.filter(id => id !== ot.id) : [...prev, ot.id])}
                                                        />
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem' }}>
                                                        <p style={{ fontWeight: '900', color: 'var(--primary)' }}>#{ot.numero}</p>
                                                        <p style={{ fontSize: '0.7rem' }}>{ot.descripcionFalla}</p>
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.6rem', borderRadius: '20px', background: `${statusCfg.color}15`, color: statusCfg.color, width: 'fit-content', fontSize: '0.7rem', fontWeight: '800' }}>
                                                            <statusCfg.icon size={12} />
                                                            {statusCfg.label}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>{getTecnicoDisplayName(ot.tecnicoId)}</td>
                                                    <td style={{ padding: '0.75rem 1rem', fontWeight: '800' }}>{formatDate(ot.fechas?.programada || '')}</td>
                                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                                        {ot.fueModificadaIndividualmente ? (
                                                            <span title="Fue modificada manualmente fuera de este panel.">
                                                                <AlertCircle size={16} color="#F59E0B" />
                                                            </span>
                                                        ) : (
                                                            <CheckCircle2 size={16} style={{ color: '#22c55e', opacity: 0.3 }} />
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {history.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>No hay historial disponible.</div>
                            ) : (
                                history.map(batch => (
                                    <div key={batch.id} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                <History size={20} className="text-primary" />
                                                <div>
                                                    <p style={{ fontWeight: '900', fontSize: '0.9rem' }}>{batch.tipoOperacion}</p>
                                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(batch.fechaOperacion).toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ fontSize: '0.75rem', fontWeight: '800' }}>{batch.usuarioNombre}</p>
                                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{batch.totalOTs} OTs</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {batchEditing && (
                    <div className="modal-overlay" style={{ zIndex: 200010 }}>
                        <div className="glass-card modal-content" style={{ maxWidth: '450px', width: '90%', padding: '2rem' }}>
                            <h4 style={{ fontWeight: '900', fontSize: '1.2rem', marginBottom: '1.5rem' }}>Ajuste de {selectedOTs.length} OTs</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Nuevo Técnico</label>
                                    <select
                                        className="w-full p-3 bg-input rounded-xl border border-glass"
                                        value={newTecnicoId} onChange={(e) => setNewTecnicoId(e.target.value)}
                                        style={{ background: 'var(--bg-input)', color: 'white' }}
                                    >
                                        <option value="">(Sin cambio)</option>
                                        {allTecnicos.map(t => <option key={t.id} value={t.id} style={{ color: 'black' }}>{t.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>Nueva Fecha</label>
                                    <input
                                        type="date" className="w-full p-3 bg-input rounded-xl border border-glass"
                                        value={newDate} onChange={(e) => setNewDate(e.target.value)}
                                        style={{ background: 'var(--bg-input)', color: 'white', colorScheme: 'dark' }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn" onClick={() => setBatchEditing(false)} style={{ flex: 1 }}>CANCELAR</button>
                                <button
                                    className="btn btn-primary"
                                    onClick={handleBatchUpdate}
                                    style={{ flex: 2 }}
                                    disabled={isSaving}
                                >
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'APLICAR'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
