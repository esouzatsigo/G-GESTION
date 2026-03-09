import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Search, Save, X, HardDrive, FileSpreadsheet, Store, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { downloadExcel, fileTimestamp } from '../utils/fileDownload';
import { useNotification } from '../context/NotificationContext';
import { ImportModal } from '../components/ImportModal';
import { getSucursales, getClientes, getFranquicias, logEntityChange, getCatalogos } from '../services/dataService';
import { tenantQuery } from '../services/tenantContext';
import { db } from '../services/firebase';
import { collection, doc, getDocs } from 'firebase/firestore';
import { trackedAddDoc, trackedUpdateDoc } from '../services/firestoreHelpers';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useAuth } from '../hooks/useAuth';
import type { Equipo, Cliente, Sucursal, Franquicia, CatalogoItem } from '../types';

export const EquiposPage: React.FC = () => {
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [franquicias, setFranquicias] = useState<Franquicia[]>([]);
    const [catalogos, setCatalogos] = useState<CatalogoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCliente, setFilterCliente] = useState('');
    const [filterFranquiciaId, setFilterFranquiciaId] = useState('');
    const [filterSucursalId, setFilterSucursalId] = useState('');
    const [filterFamilia, setFilterFamilia] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEquipo, setEditingEquipo] = useState<Equipo | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const { showNotification } = useNotification();
    const { user, activeClienteId, isSuperAdmin } = useAuth();

    // Form State
    const [clienteId, setClienteId] = useState('');
    const [sucursalId, setSucursalId] = useState('');
    const [familia, setFamilia] = useState<Equipo['familia']>('ESP_REFRIGERACION');
    const [nombre, setNombre] = useState('');
    const [franquiciaId, setFranquiciaId] = useState('');

    const defaultFamilias = [
        { id: 'ESP_AIRES', name: 'Aires' },
        { id: 'ESP_COCCION', name: 'Coccion' },
        { id: 'ESP_REFRIGERACION', name: 'Refrigeracion' },
        { id: 'ESP_COCINA', name: 'Cocina' },
        { id: 'ESP_RESTAURANTE', name: 'Restaurante' },
        { id: 'ESP_LOCAL', name: 'Local' },
        { id: 'ESP_AGUA', name: 'Agua' },
        { id: 'ESP_GENERADORES', name: 'Generadores' }
    ];

    const familias = React.useMemo(() => {
        const dynamicFamilias = catalogos
            .filter(c => c.categoria === 'Familia')
            .map(c => ({ id: c.nomenclatura, name: c.nombre }));

        if (dynamicFamilias.length > 0) return dynamicFamilias.sort((a, b) => a.name.localeCompare(b.name));
        return defaultFamilias;
    }, [catalogos]);

    const getFamiliaName = (id: string) => {
        const item = familias.find(f => f.id === id);
        return item ? item.name : id;
    };

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            // LÓGICA DE AISLAMIENTO: 
            // - SuperAdmin en 'ADMIN' -> Trae catálogos Maestros (ADMIN).
            // - SuperAdmin en un cliente real -> Trae solo ese cliente.
            // - Usuario normal -> Trae solo su cliente.
            const targetClienteId = (isSuperAdmin)
                ? (activeClienteId === 'ADMIN' ? 'ADMIN' : (activeClienteId || 'ADMIN'))
                : user?.clienteId;

            const qEquipos = tenantQuery('equipos', user);

            const [snapshot, sData, cData, fData, catData] = await Promise.all([
                getDocs(qEquipos),
                getSucursales(targetClienteId),
                getClientes(targetClienteId),
                getFranquicias(targetClienteId),
                getCatalogos(targetClienteId)
            ]);

            const eData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipo));
            setEquipos(eData);
            setSucursales(sData);
            setClientes(cData);
            setFranquicias(fData);
            setCatalogos(catData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [user, activeClienteId, isSuperAdmin]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEscapeKey(() => setIsModalOpen(false), isModalOpen);
    useEscapeKey(() => setIsImportModalOpen(false), isImportModalOpen);

    const handleOpenModal = (equipo?: Equipo) => {
        const effectiveClientId = (activeClienteId && activeClienteId !== 'ADMIN')
            ? activeClienteId
            : (user?.clienteId && user.clienteId !== 'ADMIN' ? user.clienteId : '');

        if (equipo) {
            setEditingEquipo(equipo);
            setClienteId(equipo.clienteId || '');
            setFranquiciaId(equipo.franquiciaId || '');
            setSucursalId(equipo.sucursalId || '');
            setFamilia(equipo.familia);
            setNombre(equipo.nombre);
        } else {
            setEditingEquipo(null);
            setClienteId(effectiveClientId || '');
            setFranquiciaId('');
            setSucursalId('');
            setFamilia('ESP_REFRIGERACION');
            setNombre('');
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
                await trackedUpdateDoc(doc(db, 'equipos', editingEquipo.id), data);
                if (user) {
                    await logEntityChange({
                        clienteId: data.clienteId,
                        entityName: 'Equipo',
                        entityId: editingEquipo.id,
                        oldData: editingEquipo,
                        newData: data,
                        user: user,
                        fieldsToTrack: ['nombre', 'familia', 'sucursalId']
                    });
                }
                showNotification("Equipo actualizado correctamente.", "success");
            } else {
                const docRef = await trackedAddDoc(collection(db, 'equipos'), data);
                if (user) {
                    await logEntityChange({
                        clienteId: data.clienteId,
                        entityName: 'Equipo',
                        entityId: docRef.id,
                        oldData: null,
                        newData: data,
                        user: user,
                        fieldsToTrack: []
                    });
                }
                showNotification("Equipo creado correctamente.", "success");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            showNotification("Error al guardar el equipo.", "error");
        }
    };

    const filteredEquipos = equipos.filter(e => {
        const matchSearch = e.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCliente = !filterCliente || e.clienteId === filterCliente;
        const matchFranquicia = !filterFranquiciaId || e.franquiciaId === filterFranquiciaId;
        const matchSucursal = !filterSucursalId || e.sucursalId === filterSucursalId;
        const matchFamilia = !filterFamilia || e.familia === filterFamilia;

        return matchSearch && matchCliente && matchFranquicia && matchSucursal && matchFamilia;
    });

    const exportToExcel = async () => {
        try {
            const dataToExport = filteredEquipos.map(e => ({
                Nombre: e.nombre,
                Familia: getFamiliaName(e.familia),
                Sucursal: sucursales.find(s => s.id === e.sucursalId)?.nombre || '',
                Franquicia: franquicias.find(f => f.id === e.franquiciaId)?.nombre || '',
                Cliente: clientes.find(c => c.id === e.clienteId)?.nombre || e.clienteId
            }));

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Equipos");
            const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            await downloadExcel(wbout, `catalogo_equipos_${fileTimestamp()}.xlsx`);
        } catch (err) {
            console.error('Error al exportar Equipos:', err);
        }
    };

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

                <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                            />
                        </div>

                        <select
                            value={filterFamilia}
                            onChange={(e) => setFilterFamilia(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem', appearance: 'none' }}
                        >
                            <option value="" style={{ color: 'black' }}>Todas las Familias</option>
                            {familias.map(f => (
                                <option key={f.id} value={f.id} style={{ color: 'black' }}>{f.name}</option>
                            ))}
                        </select>

                        {(activeClienteId === 'ADMIN' || !activeClienteId) && (
                            <div>
                                <select
                                    value={filterCliente}
                                    onChange={(e) => { setFilterCliente(e.target.value); setFilterFranquiciaId(''); setFilterSucursalId(''); }}
                                    style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem', appearance: 'none' }}
                                >
                                    <option value="" style={{ color: 'black' }}>Todas las Empresas</option>
                                    {clientes.map(c => (
                                        <option key={c.id} value={c.id} style={{ color: 'black' }}>{c.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <select
                                value={filterFranquiciaId}
                                onChange={(e) => { setFilterFranquiciaId(e.target.value); setFilterSucursalId(''); }}
                                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem', appearance: 'none' }}
                            >
                                <option value="" style={{ color: 'black' }}>Todas las Franquicias</option>
                                {franquicias.filter(f => !filterCliente || f.clienteId === filterCliente).map(f => (
                                    <option key={f.id} value={f.id} style={{ color: 'black' }}>{f.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <select
                                value={filterSucursalId}
                                onChange={(e) => setFilterSucursalId(e.target.value)}
                                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem', appearance: 'none' }}
                            >
                                <option value="" style={{ color: 'black' }}>Todas las Sucursales</option>
                                {sucursales.filter(s => !filterFranquiciaId || s.franquiciaId === filterFranquiciaId).map(s => (
                                    <option key={s.id} value={s.id} style={{ color: 'black' }}>{s.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <button
                                className="btn"
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterCliente('');
                                    setFilterFranquiciaId('');
                                    setFilterSucursalId('');
                                    setFilterFamilia('');
                                }}
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--glass-border)', fontSize: '0.75rem', fontWeight: '600', padding: '0.6rem 1rem' }}
                            >
                                Limpiar Filtros
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                            Mostrando {filteredEquipos.length} registro(s) con los filtros actuales
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={exportToExcel}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', color: 'white', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            disabled={filteredEquipos.length === 0}
                        >
                            <Download size={18} />
                            Exportar a Excel
                        </button>
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
                                        <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start', minWidth: 0, flex: 1 }}>
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

                                            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                                                {/* Nombre — siempre dentro de la tarjeta */}
                                                <h3 style={{
                                                    fontSize: '0.95rem',
                                                    fontWeight: '700',
                                                    color: 'var(--text-main)',
                                                    overflowWrap: 'break-word',
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'normal',
                                                    lineHeight: '1.35',
                                                    margin: '0 0 0.3rem 0'
                                                }}>{equipo.nombre}</h3>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{getFamiliaName(equipo.familia)}</span>
                                                    {equipo.franquiciaId && (
                                                        <>
                                                            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-muted)', flexShrink: 0, display: 'inline-block' }}></span>
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
                                            style={{ background: 'var(--bg-switch)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', flexShrink: 0, marginLeft: '0.5rem' }}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </div>

                                    {/* Todos los campos del catálogo */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--glass-border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                                            <Store size={13} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', wordBreak: 'break-word' }}>
                                                Sucursal: <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{sucursal?.nombre || 'N/A'}</span>
                                            </span>
                                        </div>
                                        {sucursal?.nomenclatura && (
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', paddingLeft: '1.1rem' }}>
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                    Nomenclatura: <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{sucursal.nomenclatura}</span>
                                                </span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', paddingLeft: '1.1rem' }}>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', wordBreak: 'break-word' }}>
                                                Cliente: <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{clientes.find(c => c.id === equipo.clienteId)?.nombre || equipo.clienteId || 'N/A'}</span>
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', paddingLeft: '1.1rem' }}>
                                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                ID: <span style={{ color: 'var(--text-main)', fontWeight: '600', fontSize: '0.65rem', fontFamily: 'monospace' }}>{equipo.id}</span>
                                            </span>
                                        </div>

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
                                    <label className="modal-label">Cliente (Contexto Activo)</label>
                                    <select
                                        value={clienteId} onChange={e => { setClienteId(e.target.value); setSucursalId(''); }} required
                                        disabled={true}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-switch)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
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
                                        value={familia} onChange={e => setFamilia(e.target.value)} required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                    >
                                        <option value="" style={{ color: 'black' }}>Seleccione Familia</option>
                                        {familias.map(f => <option key={f.id} value={f.id} style={{ color: 'black' }}>{f.name}</option>)}
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
