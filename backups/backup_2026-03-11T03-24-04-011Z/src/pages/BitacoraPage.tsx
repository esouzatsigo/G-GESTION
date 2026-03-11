import React, { useEffect, useState } from 'react';
import { getDocs } from 'firebase/firestore';
import { tenantQuery } from '../services/tenantContext';
import { History, Search, Calendar, User as UserIcon, AlertTriangle, RotateCcw } from 'lucide-react';
import { undoUniversalChange, type BitacoraEntry } from '../services/dataService';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../context/NotificationContext';

export const BitacoraPage: React.FC = () => {
    const { user, isAdminCliente, isSuperAdmin, isGerente } = useAuth();
    const [entries, setEntries] = useState<BitacoraEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isUndoing, setIsUndoing] = useState(false);
    const { showNotification } = useNotification();

    const fetchData = async () => {
        if (!isAdminCliente && !isSuperAdmin && !isGerente) return;
        setLoading(true);
        try {
            const q = tenantQuery('bitacora', user!);
            const snap = await getDocs(q);
            let allEntries = snap.docs.map(d => ({ id: d.id, ...d.data() } as BitacoraEntry));
            allEntries.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            allEntries = allEntries.slice(0, 100);

            if (!isSuperAdmin) {
                allEntries = allEntries.filter(e => !e.isSuperAdminAction);
            }

            setEntries(allEntries);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [isAdminCliente, isSuperAdmin, user]);

    const handleUndo = async (entry: BitacoraEntry) => {
        if (!entry.collectionName) {
            showNotification("Este registro clásico no soporta reversión universal. Modifíquelo manualmente desde el módulo correspondiente.", "warning");
            return;
        }

        // Pre-flight impact check (frontend preview before touching the DB)
        // We import and call the same logic used server-side to give instant feedback
        const { checkUndoImpact } = await import('../services/dataService');
        const impact = checkUndoImpact(entry.collectionName, entry.campo);

        if (impact.level === 'blocked') {
            // Hard stop — explain the reason, do NOT proceed
            window.alert(impact.message);
            return;
        }

        if (impact.level === 'warning') {
            // Extra confirmation for medium-risk fields
            const confirmed = window.confirm(
                `${impact.message}\n\n¿Deseas continuar de todas formas y revertir el campo "${entry.campo}" de "${entry.valorNuevo}" a "${entry.valorAnterior}"?`
            );
            if (!confirmed) return;
        } else {
            // Safe — standard confirmation
            const confirmed = window.confirm(
                `¿Seguro que deseas revertir el campo "${entry.campo}" de "${entry.valorNuevo}" → "${entry.valorAnterior}"?`
            );
            if (!confirmed) return;
        }

        setIsUndoing(true);
        try {
            const result = await undoUniversalChange(entry);
            if (result.level === 'blocked') {
                // Double-check: the server also refused
                window.alert(result.message);
                return;
            }
            showNotification("Cambio revertido con éxito en la base de datos.", "success");
            fetchData();
        } catch (err) {
            console.error("Error al revertir:", err);
            showNotification("Error al revertir el cambio.", "error");
        } finally {
            setIsUndoing(false);
        }
    };

    if (!isAdminCliente && !isSuperAdmin && !isGerente) {
        return (
            <div style={{ textAlign: 'center', padding: '5rem 2rem' }}>
                <AlertTriangle size={48} color="var(--priority-alta)" style={{ marginBottom: '1rem' }} />
                <h2 style={{ fontSize: '1.5rem', fontWeight: '800' }}>ACCESO RESTRINGIDO</h2>
                <p style={{ color: 'var(--text-muted)' }}>Módulo exclusivo para Administradores y Gerentes.</p>
            </div>
        );
    }

    const filtered = entries.filter(e => {
        const otDisplay = (e as any).tipo === 'Preventivo' || e.otNumero < 1000 ? `P-${e.otNumero}` : `#${e.otNumero}`;
        return otDisplay.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.usuarioNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.accion.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div className="animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <History size={28} color="var(--primary)" />
                        BITÁCORA DEL SISTEMA
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>Registro detallado de todas las modificaciones y acciones en el sistema.</p>
                </div>
            </div>

            <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text" placeholder="Buscar por OT (ej: P-1), usuario o acción..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 2.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                    />
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border)' }}>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                        Mostrando {filtered.length} registro(s) con los filtros actuales
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando bitácora...</div>
            ) : (
                <div className="scrollable-x custom-scrollbar">
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.75rem' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                <th style={{ textAlign: 'left', padding: '0 1rem' }}>Evento / OT</th>
                                <th style={{ textAlign: 'left', padding: '0 1rem' }}>Usuario</th>
                                <th style={{ textAlign: 'left', padding: '0 1rem' }}>Detalle de Cambio</th>
                                <th style={{ textAlign: 'right', padding: '0 1rem' }}>Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(entry => {
                                const isPreventivo = (entry as any).tipo === 'Preventivo' || entry.otNumero < 1000;
                                return (
                                    <tr key={entry.id} className="glass-card animate-fade" style={{ background: 'var(--bg-input)', borderLeft: `4px solid ${isPreventivo ? 'var(--status-iniciada)' : 'var(--primary)'}` }}>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: '800', color: isPreventivo ? 'var(--status-iniciada)' : 'var(--primary)', fontSize: '0.9rem' }}>
                                                {isPreventivo ? `P-${entry.otNumero}` : `#${entry.otNumero}`}
                                            </div>
                                            <div style={{ fontWeight: '700', fontSize: '0.75rem', color: 'var(--text-main)' }}>{entry.accion.toUpperCase()}</div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <UserIcon size={14} color="var(--text-muted)" />
                                                <span style={{ fontSize: '0.85rem' }}>{entry.usuarioNombre}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontSize: '0.8rem', background: 'rgba(0,0,0,0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>CAMPO: {entry.campo}</span>
                                                <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                    <div>
                                                        <span style={{ color: 'var(--priority-alta)', textDecoration: 'line-through', opacity: 0.6 }}>{String(entry.valorAnterior)}</span>
                                                        <span style={{ margin: '0 0.5rem', opacity: 0.5 }}>→</span>
                                                        <span style={{ color: 'var(--accent)', fontWeight: '600' }}>{String(entry.valorNuevo)}</span>
                                                    </div>

                                                    {entry.accion.includes('EDICIÓN') && entry.collectionName && (
                                                        <button
                                                            onClick={() => handleUndo(entry)}
                                                            disabled={isUndoing}
                                                            className="btn hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--glass-border)',
                                                                background: 'transparent', color: 'var(--text-main)', fontSize: '0.7rem', padding: '0.3rem 0.6rem',
                                                                opacity: isUndoing ? 0.5 : 1
                                                            }}
                                                            title="Revertir este cambio y borrarlo del historial"
                                                        >
                                                            <RotateCcw size={12} /> {isUndoing ? '...' : 'DESHACER'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                                                <Calendar size={12} style={{ marginBottom: '4px' }} />
                                                {new Date(entry.fecha).toLocaleString()}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                            No se encontraron registros de bitácora.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
