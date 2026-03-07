import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Search, Save, X, HardDrive, FileSpreadsheet, Store } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { ImportModal } from '../components/ImportModal';
import { getSucursales, getClientes, getFranquicias } from '../services/dataService';
import { db } from '../services/firebase';
import { addDoc, collection, doc, updateDoc, getDocs } from 'firebase/firestore';
import { useEscapeKey } from '../hooks/useEscapeKey';
import type { Equipo, Cliente, Sucursal, Franquicia } from '../types';

export const EquiposPage: React.FC = () => {
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [franquicias, setFranquicias] = useState<Franquicia[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEquipo, setEditingEquipo] = useState<Equipo | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const { showNotification } = useNotification();

    // Form State
    const [clienteId, setClienteId] = useState('');
    const [sucursalId, setSucursalId] = useState('');
    const [familia, setFamilia] = useState<Equipo['familia']>('Refrigeracion');
    const [nombre, setNombre] = useState('');
    const [franquiciaId, setFranquiciaId] = useState('');

    const familias: Equipo['familia'][] = ['Aires', 'Coccion', 'Refrigeracion', 'Cocina', 'Restaurante', 'Local', 'Agua', 'Generadores'];

    const fetchData = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'equipos'));
            const eData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipo));
            const [sData, cData, fData] = await Promise.all([getSucursales(), getClientes(), getFranquicias()]);
            setEquipos(eData);
            setSucursales(sData);
            setClientes(cData);
            setFranquicias(fData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEscapeKey(() => setIsModalOpen(false), isModalOpen);
    useEscapeKey(() => setIsImportModalOpen(false), isImportModalOpen);

    const handleOpenModal = (equipo?: Equipo) => {
        if (equipo) {
            setEditingEquipo(equipo);
            setClienteId(equipo.clienteId);
            setSucursalId(equipo.sucursalId);
            setFamilia(equipo.familia);
            setNombre(equipo.nombre);
            setFranquiciaId(equipo.franquiciaId || '');
        } else {
            setEditingEquipo(null);
            setClienteId('');
            setSucursalId('');
            setFamilia('Refrigeracion');
            setNombre('');
            setFranquiciaId('');
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // REGLAS DE NEGOCIO: TODOS LOS CAMPOS SON REQUERIDOS
        if (!clienteId) {
            showNotification("El Cliente es requerido.", "warning");
            return;
        }
        if (!franquiciaId) {
            showNotification("La Franquicia es requerida.", "warning");
            return;
        }
        if (!sucursalId) {
            showNotification("La Sucursal es requerida.", "warning");
            return;
        }
        if (!familia) {
            showNotification("La Familia de equipo es requerida.", "warning");
            return;
        }
        if (!nombre.trim()) {
            showNotification("El Nombre del equipo es requerido.", "warning");
            return;
        }

        const data = {
            clienteId,
            franquiciaId,
            sucursalId,
            familia,
            nombre: nombre.trim()
        };

        try {
            if (editingEquipo) {
                await updateDoc(doc(db, 'equipos', editingEquipo.id), data);
                showNotification("Equipo actualizado correctamente.", "success");
            } else {
                await addDoc(collection(db, 'equipos'), data);
                showNotification("Equipo creado correctamente.", "success");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            showNotification("Error al guardar el equipo.", "error");
        }
    };

    const filteredEquipos = equipos.filter(e =>
        e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.familia.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
            <div className="animate-fade">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Catálogo de Equipos</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Administra los activos de cada sucursal.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn btn-ghost" onClick={() => setIsImportModalOpen(true)} style={{ gap: '0.75rem', border: '1px solid var(--glass-border)' }}>
                            <FileSpreadsheet size={20} /> IMPORTAR EXCEL
                        </button>
                        <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ gap: '0.75rem' }}>
                            <Plus size={20} /> NUEVO EQUIPO
                        </button>
                    </div>
                </div>

                <div className="glass-card" style={{ marginBottom: '2rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o familia..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', outline: 'none' }}
                        />
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando equipos...</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {filteredEquipos.map(equipo => {
                            const sucursal = sucursales.find(s => s.id === equipo.sucursalId);
                            return (
                                <div key={equipo.id} className="glass-card animate-fade" style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center' }}>
                                            {/* Logo / Icon Container */}
                                            <div style={{
                                                width: '50px', height: '50px',
                                                background: franquicias.find(f => f.id === equipo.franquiciaId)?.colorFondo || 'var(--bg-switch)',
                                                borderRadius: '12px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                padding: '6px',
                                                flexShrink: 0
                                            }}>
                                                {(() => {
                                                    const f = franquicias.find(f => f.id === equipo.franquiciaId);
                                                    return f?.logoUrl ? (
                                                        <img src={f.logoUrl} alt={f.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                    ) : (
                                                        <HardDrive size={24} color="var(--accent)" />
                                                    );
                                                })()}
                                            </div>

                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                    <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{equipo.nombre}</h3>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
                                                    <span style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{equipo.familia}</span>
                                                    {equipo.franquiciaId && (
                                                        <>
                                                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-muted)' }}></span>
                                                            <span style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                                                {franquicias.find(f => f.id === equipo.franquiciaId)?.nombre || 'N/A'}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleOpenModal(equipo)}
                                            style={{ background: 'var(--bg-switch)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </div>
                                    <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Store size={14} color="var(--text-muted)" />
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            En: <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{sucursal?.nombre || 'N/A'}</span>
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

            </div>

            {/* Modals are placed outside animate-fade to avoid stacking context traps (z-index) */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem', zIndex: 10000
                }}>
                    <div className="glass-card animate-fade" style={{ width: '100%', maxWidth: '550px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 className="modal-title">{editingEquipo ? 'Editar Equipo' : 'Nuevo Equipo'}</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label className="modal-label">Cliente *</label>
                                    <select
                                        value={clienteId} onChange={e => { setClienteId(e.target.value); setSucursalId(''); }} required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                    >
                                        <option value="" style={{ color: 'black' }}>Seleccione Cliente</option>
                                        {clientes.map(c => <option key={c.id} value={c.id} style={{ color: 'black' }}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="modal-label">Franquicia *</label>
                                    <select
                                        value={franquiciaId} onChange={e => { setFranquiciaId(e.target.value); setSucursalId(''); }} required
                                        disabled={!clienteId}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', opacity: clienteId ? 1 : 0.5 }}
                                    >
                                        <option value="" style={{ color: 'black' }}>Seleccione Franquicia</option>
                                        {franquicias.filter(f => f.clienteId === clienteId).map(f => <option key={f.id} value={f.id} style={{ color: 'black' }}>{f.nombre}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label className="modal-label">Sucursal *</label>
                                    <select
                                        value={sucursalId} onChange={e => setSucursalId(e.target.value)} required
                                        disabled={!franquiciaId}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', opacity: franquiciaId ? 1 : 0.5 }}
                                    >
                                        <option value="" style={{ color: 'black' }}>Seleccione Sucursal</option>
                                        {sucursales.filter(s =>
                                            (s.clienteId === clienteId && (s.franquiciaId === franquiciaId || !s.franquiciaId)) ||
                                            s.id === editingEquipo?.sucursalId
                                        ).map(s => <option key={s.id} value={s.id} style={{ color: 'black' }}>{s.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="modal-label">Familia *</label>
                                    <select
                                        value={familia} onChange={e => setFamilia(e.target.value as any)} required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                    >
                                        {familias.map(f => <option key={f} value={f} style={{ color: 'black' }}>{f}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="modal-label">Nombre del Equipo *</label>
                                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Refrigerador de Masas 1" required
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }} />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn" onClick={() => setIsModalOpen(false)} style={{ flex: 1, background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                    <Save size={18} />
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                type="equipos"
                onSuccess={fetchData}
            />
        </>
    );
};
