import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Search, Save, X, Navigation, MapPin, Map as MapIcon, FileSpreadsheet, Store, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { downloadExcel, fileTimestamp } from '../utils/fileDownload';
import { useNotification } from '../context/NotificationContext';
import { ImportModal } from '../components/ImportModal';
import { getSucursales, getClientes, getFranquicias, logEntityChange } from '../services/dataService';
import { db } from '../services/firebase';
import { addDoc, collection, doc, updateDoc } from 'firebase/firestore';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useAuth } from '../hooks/useAuth';
import type { Sucursal, Cliente, Franquicia } from '../types';
import { MapPickerModal } from '../components/MapPickerModal';

export const SucursalesPage: React.FC = () => {
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [franquicias, setFranquicias] = useState<Franquicia[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchNomenclatura, setSearchNomenclatura] = useState('');
    const [searchDireccion, setSearchDireccion] = useState('');
    const [filterCliente, setFilterCliente] = useState('');
    const [filterFranquiciaId, setFilterFranquiciaId] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSucursal, setEditingSucursal] = useState<Sucursal | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const { showNotification } = useNotification();
    const { user, activeClienteId, isSuperAdmin } = useAuth();

    // Form State
    const [clienteId, setClienteId] = useState('');
    const [franquiciaId, setFranquiciaId] = useState('');
    const [nombre, setNombre] = useState('');
    const [direccion, setDireccion] = useState('');
    const [nomenclatura, setNomenclatura] = useState('');
    const [lat, setLat] = useState<string>('');
    const [lng, setLng] = useState<string>('');
    const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            // Contexto de cliente para filtrar catálogos
            const targetClienteId = (isSuperAdmin && activeClienteId && activeClienteId !== 'ADMIN')
                ? activeClienteId
                : (!isSuperAdmin ? user?.clienteId : undefined);

            const [sData, cData, fData] = await Promise.all([
                getSucursales(targetClienteId),
                getClientes(targetClienteId),
                getFranquicias(targetClienteId)
            ]);
            setSucursales(sData);
            setClientes(cData);
            setFranquicias(fData);
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
    useEscapeKey(() => setIsMapPickerOpen(false), isMapPickerOpen);

    const handleOpenModal = (sucursal?: Sucursal) => {
        const effectiveClientId = (activeClienteId && activeClienteId !== 'ADMIN')
            ? activeClienteId
            : (user?.clienteId && user.clienteId !== 'ADMIN' ? user.clienteId : '');

        if (sucursal) {
            setEditingSucursal(sucursal);
            setClienteId(sucursal.clienteId);
            setFranquiciaId(sucursal.franquiciaId);
            setNombre(sucursal.nombre);
            setDireccion(sucursal.direccion);
            setNomenclatura(sucursal.nomenclatura || '');
            setLat(sucursal.coordenadas.lat.toString());
            setLng(sucursal.coordenadas.lng.toString());
        } else {
            setEditingSucursal(null);
            setClienteId(effectiveClientId || '');
            setFranquiciaId('');
            setNombre('');
            setDireccion('');
            setNomenclatura('');
            setLat('');
            setLng('');
        }
        setIsModalOpen(true);
    };

    const handleGetLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                setLat(pos.coords.latitude.toFixed(6));
                setLng(pos.coords.longitude.toFixed(6));
                showNotification("Ubicación obtenida con éxito.", "success");
            }, (err) => showNotification("Error al obtener ubicación: " + err.message, "error"));
        } else {
            showNotification("La geolocalización no está soportada en este navegador.", "error");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // VALIDACIÓN DE CAMPOS MANDATORIOS
        if (!clienteId) {
            showNotification("Seleccione un cliente para la sucursal.", "warning");
            return;
        }
        if (!franquiciaId) {
            showNotification("Seleccione la franquicia.", "warning");
            return;
        }
        if (!nombre.trim()) {
            showNotification("El nombre de la sucursal es obligatorio.", "warning");
            return;
        }
        if (!direccion.trim()) {
            showNotification("La dirección física es obligatoria.", "warning");
            return;
        }
        if (!lat || !lng) {
            showNotification("Las coordenadas geográficas son obligatorias para el mapa.", "warning");
            return;
        }

        const data = {
            clienteId,
            franquiciaId,
            nombre,
            nomenclatura,
            direccion,
            coordenadas: {
                lat: parseFloat(lat),
                lng: parseFloat(lng)
            }
        };

        try {
            if (editingSucursal) {
                await updateDoc(doc(db, 'sucursales', editingSucursal.id), data);
                if (user) {
                    await logEntityChange({
                        clienteId: data.clienteId,
                        entityName: 'Sucursal',
                        entityId: editingSucursal.id,
                        oldData: editingSucursal,
                        newData: data,
                        user: user,
                        fieldsToTrack: ['nombre', 'direccion', 'nomenclatura']
                    });
                }
                showNotification("Sucursal actualizada correctamente.", "success");
            } else {
                const docRef = await addDoc(collection(db, 'sucursales'), data);
                if (user) {
                    await logEntityChange({
                        clienteId: data.clienteId,
                        entityName: 'Sucursal',
                        entityId: docRef.id,
                        oldData: null,
                        newData: data,
                        user: user,
                        fieldsToTrack: []
                    });
                }
                showNotification("Sucursal creada correctamente.", "success");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            showNotification("Error al guardar la sucursal.", "error");
        }
    };

    const filteredSucursales = sucursales.filter(s => {
        const matchSearch = s.nombre.toLowerCase().includes(searchTerm.toLowerCase());
        const matchNomenclatura = !searchNomenclatura || (s.nomenclatura || '').toLowerCase().includes(searchNomenclatura.toLowerCase());
        const matchDireccion = !searchDireccion || (s.direccion || '').toLowerCase().includes(searchDireccion.toLowerCase());
        const matchCliente = !filterCliente || s.clienteId === filterCliente;
        const matchFranquicia = !filterFranquiciaId || s.franquiciaId === filterFranquiciaId;

        return matchSearch && matchNomenclatura && matchDireccion && matchCliente && matchFranquicia;
    });

    const exportToExcel = async () => {
        try {
            const dataToExport = filteredSucursales.map(s => ({
                Nombre: s.nombre,
                Nomenclatura: s.nomenclatura || '',
                Direccion: s.direccion || '',
                Latitud: s.coordenadas?.lat || '',
                Longitud: s.coordenadas?.lng || '',
                Franquicia: franquicias.find(f => f.id === s.franquiciaId)?.nombre || '',
                Cliente: clientes.find(c => c.id === s.clienteId)?.nombre || s.clienteId
            }));

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Sucursales");
            const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            await downloadExcel(wbout, `catalogo_sucursales_${fileTimestamp()}.xlsx`);
        } catch (err) {
            console.error('Error al exportar Sucursales:', err);
        }
    };

    return (
        <>
            <div className="animate-fade">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Catálogo de Sucursales</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Gestiona las ubicaciones y coordenadas de cada franquicia.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn btn-ghost" onClick={() => setIsImportModalOpen(true)} style={{ gap: '0.75rem', border: '1px solid var(--glass-border)' }}>
                            <FileSpreadsheet size={20} /> IMPORTAR EXCEL
                        </button>
                        <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ gap: '0.75rem' }}>
                            <Plus size={20} /> NUEVA SUCURSAL
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

                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Buscar por nomenclatura..."
                                value={searchNomenclatura}
                                onChange={(e) => setSearchNomenclatura(e.target.value)}
                                style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                            />
                        </div>

                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Buscar por dirección..."
                                value={searchDireccion}
                                onChange={(e) => setSearchDireccion(e.target.value)}
                                style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                            />
                        </div>

                        {(activeClienteId === 'ADMIN' || !activeClienteId) && (
                            <div>
                                <select
                                    value={filterCliente}
                                    onChange={(e) => { setFilterCliente(e.target.value); setFilterFranquiciaId(''); }}
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
                                onChange={(e) => setFilterFranquiciaId(e.target.value)}
                                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem', appearance: 'none' }}
                            >
                                <option value="" style={{ color: 'black' }}>Todas las Franquicias</option>
                                {franquicias.filter(f => !filterCliente || f.clienteId === filterCliente).map(f => (
                                    <option key={f.id} value={f.id} style={{ color: 'black' }}>{f.nombre}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <button
                                className="btn"
                                onClick={() => {
                                    setSearchTerm('');
                                    setSearchNomenclatura('');
                                    setSearchDireccion('');
                                    setFilterCliente('');
                                    setFilterFranquiciaId('');
                                }}
                                style={{ background: 'var(--bg-input)', border: '1px solid var(--glass-border)', fontSize: '0.75rem', fontWeight: '600', padding: '0.6rem 1rem' }}
                            >
                                Limpiar Filtros
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                            Mostrando {filteredSucursales.length} registro(s) con los filtros actuales
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={exportToExcel}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', color: 'white', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            disabled={filteredSucursales.length === 0}
                        >
                            <Download size={18} />
                            Exportar a Excel
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando sucursales...</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {filteredSucursales.map(sucursal => (
                            <div key={sucursal.id} className="glass-card animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    {/* Logo Container */}
                                    <div style={{
                                        width: '64px', height: '64px',
                                        background: franquicias.find(f => f.id === sucursal.franquiciaId)?.colorFondo || '#FFFFFF',
                                        borderRadius: '16px',
                                        padding: '8px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        flexShrink: 0
                                    }}>
                                        {(() => {
                                            const f = franquicias.find(f => f.id === sucursal.franquiciaId);
                                            return f?.logoUrl ? (
                                                <img src={f.logoUrl} alt={f.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                            ) : (
                                                <Store size={24} color="#94a3b8" />
                                            );
                                        })()}
                                    </div>

                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        fontSize: '0.6rem',
                                                        fontWeight: '900',
                                                        padding: '0.2rem 0.5rem',
                                                        background: 'var(--primary)',
                                                        color: 'white',
                                                        borderRadius: '6px',
                                                        textTransform: 'none',
                                                        letterSpacing: '0.05em'
                                                    }}>
                                                        {franquicias.find(f => f.id === sucursal.franquiciaId)?.nombre || 'N/A'}
                                                    </span>
                                                    {sucursal.nomenclatura && (
                                                        <span style={{
                                                            fontSize: '0.6rem',
                                                            fontWeight: '900',
                                                            padding: '0.2rem 0.5rem',
                                                            background: 'rgba(56, 189, 248, 0.1)',
                                                            color: 'var(--accent)',
                                                            borderRadius: '6px',
                                                            border: '1px solid rgba(56, 189, 248, 0.2)',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {sucursal.nomenclatura}
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginTop: '0.4rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sucursal.nombre}</h3>
                                            </div>
                                            <button
                                                onClick={() => handleOpenModal(sucursal)}
                                                style={{ background: 'var(--bg-switch)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', padding: '0.5rem', borderRadius: '10px', cursor: 'pointer', flexShrink: 0 }}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                            <MapPin size={16} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                                            <span style={{ lineHeight: '1.4' }}>{sucursal.direccion}</span>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const query = encodeURIComponent(`${sucursal.direccion} ${sucursal.nombre}`);
                                                const url = sucursal.coordenadas.lat ?
                                                    `https://www.google.com/maps/search/?api=1&query=${sucursal.coordenadas.lat},${sucursal.coordenadas.lng}` :
                                                    `https://www.google.com/maps/search/?api=1&query=${query}`;
                                                window.open(url, '_blank');
                                            }}
                                            className="btn"
                                            style={{
                                                padding: '0.4rem 0.75rem',
                                                fontSize: '0.65rem',
                                                fontWeight: '800',
                                                background: 'rgba(56, 189, 248, 0.1)',
                                                color: 'var(--accent)',
                                                border: '1px solid rgba(56, 189, 248, 0.2)',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.4rem',
                                                flexShrink: 0
                                            }}
                                        >
                                            <Navigation size={14} />
                                            MAPS
                                        </button>
                                    </div>

                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        fontSize: '0.7rem',
                                        padding: '0.5rem 0.75rem',
                                        background: 'rgba(0,0,0,0.2)',
                                        borderRadius: '8px',
                                        color: 'var(--text-muted)',
                                        fontFamily: 'monospace'
                                    }}>
                                        <span>COORD: {sucursal.coordenadas.lat.toFixed(4)}, {sucursal.coordenadas.lng.toFixed(4)}</span>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: sucursal.coordenadas.lat !== 0 ? '#10b981' : '#ef4444' }}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
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
                    <div className="glass-card animate-fade" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 className="modal-title">{editingSucursal ? 'Editar Sucursal' : 'Nueva Sucursal'}</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label className="modal-label">Cliente (Contexto Activo)</label>
                                    <select
                                        value={clienteId} onChange={e => { setClienteId(e.target.value); setFranquiciaId(''); }} required
                                        disabled={true}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-switch)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                                    >
                                        <option value="" style={{ color: 'black' }}>Seleccione Cliente</option>
                                        {clientes.map(c => <option key={c.id} value={c.id} style={{ color: 'black' }}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="modal-label">Franquicia</label>
                                    <select
                                        value={franquiciaId} onChange={e => setFranquiciaId(e.target.value)} required
                                        disabled={!clienteId}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                    >
                                        <option value="" style={{ color: 'black' }}>Seleccione Franquicia</option>
                                        {franquicias.filter(f => f.clienteId === clienteId).map(f => <option key={f.id} value={f.id} style={{ color: 'black' }}>{f.nombre}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="modal-label">Nombre de Sucursal</label>
                                <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Altabrisa" required
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-glass)', color: 'var(--text-main)' }} />
                            </div>

                            <div>
                                <label className="modal-label">Nomenclatura (Referencia Interna)</label>
                                <input type="text" value={nomenclatura} onChange={e => setNomenclatura(e.target.value)} placeholder="Ej: B-ALT-01"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }} />
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <label className="modal-label">Dirección Completa</label>
                                    <button
                                        type="button"
                                        onClick={() => setIsMapPickerOpen(true)}
                                        disabled={!direccion}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                                            padding: '0.2rem 0.6rem', fontSize: '0.65rem', fontWeight: '700',
                                            background: direccion ? 'var(--primary)' : 'var(--bg-glass)',
                                            color: 'white', border: 'none', borderRadius: '6px', cursor: direccion ? 'pointer' : 'default',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <MapIcon size={12} /> BUSCAR EN GOOGLE MAPS
                                    </button>
                                </div>
                                <textarea value={direccion} onChange={e => setDireccion(e.target.value)} rows={2} required
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', resize: 'none' }} />
                            </div>

                            <div>
                                <label className="modal-label">Coordenadas GPS</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input type="text" value={lat} onChange={e => setLat(e.target.value)} placeholder="Latitud" required
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }} />
                                    <input type="text" value={lng} onChange={e => setLng(e.target.value)} placeholder="Longitud" required
                                        style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }} />
                                    <button type="button" className="btn" onClick={handleGetLocation} style={{ background: 'var(--primary)', color: 'white' }}>
                                        <Navigation size={18} />
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                    Puedes capturar las coordenadas actuales con el botón azul o ingresarlas manualmente desde Google Maps.
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn" onClick={() => setIsModalOpen(false)} style={{ flex: 1, background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                    <Save size={18} />
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div >
                </div >
            )}
            {
                isMapPickerOpen && (
                    <div style={{ zIndex: 11000, position: 'relative' }}>
                        <MapPickerModal
                            isOpen={isMapPickerOpen}
                            onClose={() => setIsMapPickerOpen(false)}
                            initialAddress={direccion}
                            initialLat={lat ? parseFloat(lat) : undefined}
                            initialLng={lng ? parseFloat(lng) : undefined}
                            onSelect={(nLat, nLng) => {
                                setLat(nLat.toFixed(6));
                                setLng(nLng.toFixed(6));
                                setIsMapPickerOpen(false);
                            }}
                        />
                    </div>
                )
            }

            <ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                type="sucursales"
                onSuccess={fetchData}
            />
        </>
    );
};
