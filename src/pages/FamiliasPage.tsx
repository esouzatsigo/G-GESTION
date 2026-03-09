import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { trackedAddDoc, trackedUpdateDoc } from '../services/firestoreHelpers';
import { tenantQuery } from '../services/tenantContext';
import { Settings, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export interface Familia {
    id: string;
    clienteId: string;
    nombre: string;
    descripcion?: string;
}

export const FamiliasPage: React.FC = () => {
    const { user, activeClienteId, isSuperAdmin } = useAuth();
    const { showNotification } = useNotification();
    const [familias, setFamilias] = useState<Familia[]>([]);
    const [loading, setLoading] = useState(true);

    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchData = React.useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const q = tenantQuery('familias', user);
            const snap = await getDocs(q);
            setFamilias(snap.docs.map(d => ({ id: d.id, ...d.data() } as Familia)).sort((a, b) => a.nombre.localeCompare(b.nombre)));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [user, activeClienteId]);

    useEffect(() => {
        if (isSuperAdmin) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [fetchData, isSuperAdmin]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const targetClienteId = isSuperAdmin && activeClienteId && activeClienteId !== 'ADMIN' ? activeClienteId : user?.clienteId;
            if (!targetClienteId || targetClienteId === 'ADMIN') {
                showNotification("Debe seleccionar un cliente activo para crear familias.", "warning");
                setSaving(false);
                return;
            }

            const dataToSave = {
                nombre,
                descripcion,
                clienteId: targetClienteId
            };

            if (editingId) {
                await trackedUpdateDoc(doc(db, 'familias', editingId), dataToSave);
                showNotification("Familia actualizada", "success");
            } else {
                await trackedAddDoc(collection(db, 'familias'), dataToSave);
                showNotification("Familia creada", "success");
            }

            setShowForm(false);
            setEditingId(null);
            setNombre('');
            setDescripcion('');
            fetchData();
        } catch (error) {
            showNotification("Error al guardar la familia", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("¿Eliminar esta familia? Los equipos asociados no se eliminarán pero quedarán huérfanos.")) return;
        try {
            await deleteDoc(doc(db, 'familias', id));
            showNotification("Familia eliminada", "success");
            fetchData();
        } catch (error) {
            showNotification("Error al eliminar", "error");
        }
    };

    if (!isSuperAdmin) {
        return (
            <div className="animate-fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Settings size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h2>Acceso Restringido</h2>
                    <p>Este catálogo es de uso exclusivo del Súper Administrador.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Settings color="var(--primary)" /> Familias de Equipos
                    </h1>
                    <p style={{ color: 'var(--text-muted)' }}>Catálogo unificado para categorizar los equipos por Cliente.</p>
                </div>
                {!showForm && (
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{
                            background: 'var(--primary)', color: 'white', padding: '0.4rem 0.8rem',
                            borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800',
                            boxShadow: '0 0 10px var(--primary-shadow)'
                        }}>
                            {familias.length} Familias
                        </div>
                        <button className="btn btn-primary" onClick={() => { setShowForm(true); setEditingId(null); setNombre(''); setDescripcion(''); }}>
                            <Plus size={20} /> Nueva Familia
                        </button>
                    </div>
                )}
            </div>

            {showForm && (
                <div className="glass-card animate-fade" style={{ marginBottom: '2rem', borderLeft: '4px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>{editingId ? 'Editar Familia' : 'Crear Nueva Familia'}</h2>
                        <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X /></button>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Nombre de Familia *</label>
                            <input
                                type="text" value={nombre} onChange={e => setNombre(e.target.value)} required
                                placeholder="Ej. Refrigeración, Cocción..."
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Descripción</label>
                            <input
                                type="text" value={descripcion} onChange={e => setDescripcion(e.target.value)}
                                placeholder="Equipos que forman parte de esta familia..."
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                            <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancelar</button>
                            <button type="submit" disabled={saving} className="btn btn-primary">
                                {saving ? 'Guardando...' : <><Save size={18} /> Guardar</>}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando catálogo...</div>
            ) : familias.length === 0 ? (
                <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                    <Settings size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>Sin Familias Registradas</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Comienza agregando familias de equipos para tu cliente seleccionado.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {familias.map(fam => (
                        <div key={fam.id} className="glass-card" style={{ padding: '1.5rem', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => { setEditingId(fam.id); setNombre(fam.nombre); setDescripcion(fam.descripcion || ''); setShowForm(true); }} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: '5px' }}>
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(fam.id)} style={{ background: 'transparent', border: 'none', color: 'var(--error, #ef4444)', cursor: 'pointer', padding: '5px' }}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.5rem', paddingRight: '3rem' }}>{fam.nombre}</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{fam.descripcion || 'Sin descripción'}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
