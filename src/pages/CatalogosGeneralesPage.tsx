import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Search, Save, X, Settings2, Tag, Briefcase, Database, Download, History, RotateCcw } from 'lucide-react';
import * as XLSX from 'xlsx';
import { downloadExcel, fileTimestamp } from '../utils/fileDownload';
import { useNotification } from '../context/NotificationContext';
import { getCatalogos, saveCatalogo, getClientes, getBitacoraCatalogos, undoUniversalChange, checkUndoImpact, type BitacoraEntry } from '../services/dataService';
import type { CatalogoItem, Cliente } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useEscapeKey } from '../hooks/useEscapeKey';


export const CatalogosGeneralesPage: React.FC = () => {
    const [catalogos, setCatalogos] = useState<CatalogoItem[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();
    const { user, activeClienteId } = useAuth();

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategoria, setFilterCategoria] = useState('');
    const [filterCliente, setFilterCliente] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCatalogo, setEditingCatalogo] = useState<CatalogoItem | null>(null);

    // Form State
    const [clienteId, setClienteId] = useState('');
    const [categoria, setCategoria] = useState<'Rol' | 'Especialidad' | 'Familia'>('Rol');
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [colorFondo, setColorFondo] = useState('#2563eb');
    const [nomenclatura, setNomenclatura] = useState(''); // El Vínculo de Hierro
    const [uploading, setUploading] = useState(false);

    // History State
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyEntries, setHistoryEntries] = useState<BitacoraEntry[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isUndoing, setIsUndoing] = useState(false);

    useEscapeKey(() => setIsModalOpen(false), isModalOpen);

    const fetchData = React.useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // SuperAdmin in "Vista Global (ADMIN)" or no client selected → fetch ALL catalogs (pass null)
            // SuperAdmin with a specific real client selected → show only that client's catalogs
            // Regular admin → always filter by their own clienteId
            const isSuperAdmin = user.rol === 'Admin General';
            const targetClienteId = isSuperAdmin
                ? (activeClienteId === 'ADMIN' ? 'ADMIN' : (activeClienteId || 'ADMIN'))
                : user.clienteId;

            const [catData, cliData] = await Promise.all([
                getCatalogos(targetClienteId),
                getClientes()
            ]);

            setCatalogos(catData);
            setClientes(cliData);
        } catch (error) {
            console.error(error);
            showNotification("Error al cargar los catálogos.", "error");
        } finally {
            setLoading(false);
        }
    }, [user, activeClienteId, showNotification]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenModal = (catalogo?: CatalogoItem) => {
        // Determine the effective client for new records:
        // A SuperAdmin viewing a specific client will create for that client.
        // A regular client admin will always create for their own client.
        const effectiveClientId = activeClienteId || user?.clienteId || '';

        if (catalogo) {
            setEditingCatalogo(catalogo);
            setClienteId(catalogo.clienteId);
            setCategoria(catalogo.categoria);
            setNombre(catalogo.nombre);
            setNomenclatura(catalogo.nomenclatura || '');
            setDescripcion(catalogo.descripcion || '');
            setColorFondo(catalogo.colorFondo || '#2563eb');
        } else {
            setEditingCatalogo(null);
            setClienteId(effectiveClientId || '');
            setCategoria('Rol');
            setNombre('');
            setNomenclatura('');
            setDescripcion('');
            setColorFondo('#2563eb');
        }
        setIsModalOpen(true);
    };


    // Undo Last Change for a specific catalog card
    const handleUndoForCard = async (catalogo: CatalogoItem) => {
        // Find the most recent bitacora entry for this specific document
        const allHistory = await getBitacoraCatalogos();
        const lastEntry = allHistory.find(e => e.otId === catalogo.id);

        if (!lastEntry) {
            showNotification(`No hay cambios recientes para revertir en "${catalogo.nombre}".`, "info");
            return;
        }

        const impact = checkUndoImpact(lastEntry.collectionName || 'catalogos', lastEntry.campo);

        if (impact.level === 'blocked') {
            window.alert(impact.message);
            return;
        }

        const confirmMsg = impact.level === 'warning'
            ? `${impact.message}\n\n¿Deseas continuar de todas formas?`
            : `¿Revertir el campo "${lastEntry.campo}" de "${lastEntry.valorNuevo}" → "${lastEntry.valorAnterior}" en "${catalogo.nombre}"?`;

        if (!window.confirm(confirmMsg)) return;

        setIsUndoing(true);
        try {
            const result = await undoUniversalChange(lastEntry);
            if (result.level === 'blocked') {
                window.alert(result.message);
            } else {
                showNotification(`Último cambio en "${catalogo.nombre}" revertido con éxito.`, "success");
                fetchData();
            }
        } catch {
            showNotification("Error al revertir el cambio.", "error");
        } finally {
            setIsUndoing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!clienteId) {
            showNotification("Seleccione un cliente (empresa).", "warning");
            return;
        }
        if (!nombre.trim()) {
            showNotification("El nombre del registro es obligatorio.", "warning");
            return;
        }

        setUploading(true);
        try {
            // Generar nomenclatura automática si está vacía
            const finalNomenclatura = nomenclatura.trim() ||
                `${categoria.toUpperCase()}_${nombre.trim().toUpperCase().replace(/\s+/g, '_')}`;

            const data: Omit<CatalogoItem, 'id'> = {
                clienteId,
                categoria,
                nomenclatura: finalNomenclatura,
                nombre: nombre.trim(),
                descripcion: descripcion.trim(),
                colorFondo
            };

            await saveCatalogo(data, user!, editingCatalogo?.id);
            showNotification(`Registro ${editingCatalogo ? 'actualizado' : 'creado'} correctamente.`, "success");
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            showNotification("Error al guardar el registro.", "error");
        } finally {
            setUploading(false);
        }
    };

    const handleOpenHistory = async () => {
        setIsHistoryModalOpen(true);
        setLoadingHistory(true);
        try {
            const entries = await getBitacoraCatalogos();
            setHistoryEntries(entries);
        } catch (err) {
            showNotification("Error al cargar historial", "error");
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleUndo = async (entry: BitacoraEntry) => {
        const { checkUndoImpact } = await import('../services/dataService');
        const impact = checkUndoImpact(entry.collectionName || 'catalogos', entry.campo);

        if (impact.level === 'blocked') {
            window.alert(impact.message);
            return;
        }

        const confirmMsg = impact.level === 'warning'
            ? `${impact.message}\n\n¿Deseas continuar de todas formas?`
            : `¿Seguro que deseas revertir el campo "${entry.campo}" de "${entry.valorNuevo}" → "${entry.valorAnterior}"?`;

        if (!window.confirm(confirmMsg)) return;

        setIsUndoing(true);
        try {
            const result = await undoUniversalChange(entry);
            if (result.level === 'blocked') {
                window.alert(result.message);
                return;
            }
            showNotification("Cambio revertido con éxito.", "success");
            fetchData();
            handleOpenHistory(); // refresh history
        } catch (err) {
            showNotification("Error al revertir.", "error");
        } finally {
            setIsUndoing(false);
        }
    };


    const filteredCatalogos = catalogos.filter(c => {
        const matchNombre = c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchCategoria = !filterCategoria || c.categoria === filterCategoria;
        const matchCliente = !filterCliente || c.clienteId === filterCliente;
        return matchNombre && matchCategoria && matchCliente;
    });

    const exportToExcel = async () => {
        try {
            const dataToExport = filteredCatalogos.map(c => ({
                Nombre: c.nombre,
                Categoria: c.categoria,
                Descripcion: c.descripcion || '',
                Cliente: clientes.find(cli => cli.id === c.clienteId)?.nombre || c.clienteId,
                ColorFondo: c.colorFondo || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Catalogos");
            const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            await downloadExcel(wbout, `catalogos_generales_${fileTimestamp()}.xlsx`);
        } catch (err) {
            console.error('Error al exportar Catálogos:', err);
        }
    };

    const getIconForCategory = (cat: string) => {
        switch (cat) {
            case 'Rol': return <Briefcase size={32} color="currentColor" />;
            case 'Especialidad': return <Settings2 size={32} color="currentColor" />;
            case 'Familia': return <Tag size={32} color="currentColor" />;
            default: return <Database size={32} color="currentColor" />;
        }
    };

    const isAdminGeneral = user?.rol === 'Admin General' || user?.rol === 'Admin';

    if (!isAdminGeneral) {
        return (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                Esta sección es exclusiva para el Administrador General.
            </div>
        );
    }

    return (
        <div className="animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Catálogos Dinámicos</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Administración independiente de Roles y Especialidades.</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn" onClick={handleOpenHistory} style={{ gap: '0.5rem', background: 'var(--bg-switch)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}>
                        <History size={18} /> HISTORIAL / DESHACER
                    </button>
                    <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ gap: '0.75rem' }}>
                        <Plus size={20} /> NUEVO REGISTRO
                    </button>
                </div>
            </div>

            {/* Ribbon Filtros */}
            <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>

                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o desc..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                        />
                    </div>

                    <div>
                        <select
                            value={filterCategoria}
                            onChange={(e) => setFilterCategoria(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem', appearance: 'none' }}
                        >
                            <option value="" style={{ color: 'black' }}>Todas las Categorías</option>
                            <option value="Rol" style={{ color: 'black' }}>Roles</option>
                            <option value="Especialidad" style={{ color: 'black' }}>Especialidades</option>
                            <option value="Familia" style={{ color: 'black' }}>Familias</option>
                        </select>
                    </div>

                    {(activeClienteId === 'ADMIN' || !activeClienteId) && (
                        <div>
                            <select
                                value={filterCliente}
                                onChange={(e) => setFilterCliente(e.target.value)}
                                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem', appearance: 'none' }}
                            >
                                <option value="" style={{ color: 'black' }}>Todos los Clientes</option>
                                <option value="ADMIN" style={{ color: 'black' }}>GLOBAL (ADMIN)</option>
                                {clientes.map(c => (
                                    <option key={c.id} value={c.id} style={{ color: 'black' }}>{c.nombre}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                    <button
                        className="btn"
                        onClick={() => {
                            setSearchTerm('');
                            setFilterCategoria('');
                            setFilterCliente('');
                        }}
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--glass-border)', fontSize: '0.75rem', fontWeight: '600', padding: '0.6rem 1rem' }}
                    >
                        Limpiar Filtros
                    </button>

                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                        Mostrando {filteredCatalogos.length} registro(s)
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={exportToExcel}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', color: 'white', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                        disabled={filteredCatalogos.length === 0}
                    >
                        <Download size={18} />
                        Exportar
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando catálogo...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {filteredCatalogos.map(catalogo => {
                        const cliente = clientes.find(c => c.id === catalogo.clienteId);

                        return (
                            <div key={catalogo.id} className="glass-card animate-fade hover:bg-primary/5 transition-all" style={{
                                padding: '1.5rem',
                                border: '1px solid rgba(255,255,255,0.08)',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    <div style={{
                                        width: '60px', height: '60px', borderRadius: '16px',
                                        background: catalogo.colorFondo || '#2563eb',
                                        color: '#ffffff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 8px 20px -6px rgba(0,0,0,0.4)',
                                        flexShrink: 0
                                    }}>
                                        {getIconForCategory(catalogo.categoria)}
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => handleOpenModal(catalogo)}
                                            style={{
                                                background: 'var(--bg-switch)', border: '1px solid var(--glass-border)',
                                                color: 'var(--text-main)', padding: '0.5rem', borderRadius: '10px',
                                                cursor: 'pointer'
                                            }}
                                            className="hover:bg-primary transition-all"
                                            title="Editar registro"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleUndoForCard(catalogo)}
                                            disabled={isUndoing}
                                            style={{
                                                background: 'var(--bg-switch)', border: '1px solid var(--glass-border)',
                                                color: 'var(--text-muted)', padding: '0.5rem', borderRadius: '10px',
                                                cursor: 'pointer',
                                                opacity: isUndoing ? 0.5 : 1
                                            }}
                                            className="hover:border-orange-400 hover:text-orange-400 transition-all"
                                            title="Deshacer último cambio"
                                        >
                                            <RotateCcw size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                        <span style={{
                                            background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.5rem',
                                            borderRadius: '6px', fontSize: '0.65rem', fontWeight: '800',
                                            textTransform: 'uppercase', letterSpacing: '0.05em'
                                        }}>
                                            {catalogo.categoria}
                                        </span>
                                    </div>
                                    <h3 style={{ fontSize: '1.35rem', fontWeight: '800', margin: '0 0 0.2rem 0', color: 'var(--text-main)' }}>
                                        {catalogo.nombre}
                                    </h3>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--accent)', marginBottom: '0.5rem', fontFamily: 'monospace' }}>
                                        ID: {catalogo.nomenclatura}
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '1rem' }}>
                                        {catalogo.descripcion || 'Sin descripción...'}
                                    </p>
                                </div>

                                <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '0.75rem', marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {cliente?.nombre || catalogo.clienteId}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem', zIndex: 10000
                }}>
                    <div className="glass-card animate-fade" style={{ width: '100%', maxWidth: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 className="modal-title">{editingCatalogo ? 'Editar Registro' : 'Nuevo Registro'}</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label className="modal-label">Empresa (Cliente)</label>
                                {activeClienteId && activeClienteId !== 'ADMIN' ? (
                                    <input
                                        type="text"
                                        value={clientes.find(c => c.id === clienteId)?.nombre || 'Cargando...'}
                                        disabled
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-switch)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                                    />
                                ) : (
                                    <select
                                        value={clienteId} onChange={e => setClienteId(e.target.value)} required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                    >
                                        <option value="" style={{ color: 'black' }}>-- Seleccione un Cliente --</option>
                                        {clientes.map(c => <option key={c.id} value={c.id} style={{ color: 'black' }}>{c.nombre}</option>)}
                                    </select>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="modal-label">Categoría</label>
                                    <select
                                        value={categoria} onChange={e => setCategoria(e.target.value as any)} required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                    >
                                        <option value="Rol" style={{ color: 'black' }}>Rol de Usuario</option>
                                        <option value="Especialidad" style={{ color: 'black' }}>Especialidad de Técnico</option>
                                        <option value="Familia" style={{ color: 'black' }}>Familia de Equipo</option>
                                    </select>
                                </div>
                                <div style={{ width: '100px' }}>
                                    <label className="modal-label">Color (Hex)</label>
                                    <input
                                        type="color" value={colorFondo} onChange={e => setColorFondo(e.target.value)}
                                        style={{ width: '100%', height: '44px', padding: '0', borderRadius: '10px', border: '1px solid var(--glass-border)', cursor: 'pointer', background: 'transparent' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label className="modal-label">ID de Referencia (Vínculo de Hierro)</label>
                                    <input
                                        type="text" value={nomenclatura} onChange={e => setNomenclatura(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                                        placeholder="Ej: ROL_AUDITOR"
                                        title="Identificador Único para lógica interna. No debe cambiar una vez asignado."
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--accent)', fontWeight: 'bold' }}
                                    />
                                    <small style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>* Si se deja vacío, se generará desde el nombre.</small>
                                </div>
                                <div>
                                    <label className="modal-label">Nombre (Mostrado en listas)</label>
                                    <input
                                        type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                                        placeholder="Ej: Auditor" required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="modal-label">Descripción (Breve)</label>
                                <textarea
                                    value={descripcion} onChange={e => setDescripcion(e.target.value)}
                                    placeholder="Opcional. Describe la utilidad o alcance."
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', minHeight: '80px', resize: 'vertical' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn" onClick={() => setIsModalOpen(false)} style={{ flex: 1, background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={uploading} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', fontWeight: '800' }}>
                                    <Save size={18} />
                                    {uploading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isHistoryModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem', zIndex: 10000
                }}>
                    <div className="glass-card animate-fade" style={{ width: '100%', maxWidth: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><History size={24} /> Historial de Cambios</h2>
                            <button onClick={() => setIsHistoryModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }} className="custom-scrollbar">
                            {loadingHistory ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando historial...</div>
                            ) : historyEntries.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No hay cambios recientes registrados.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {historyEntries.map(entry => (
                                        <div key={entry.id} style={{ background: 'var(--bg-switch)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <div style={{ fontWeight: '700', color: 'var(--primary)' }}>{entry.accion}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(entry.fecha).toLocaleString()}</div>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                                Por: <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{entry.usuarioNombre}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.1)', padding: '0.75rem', borderRadius: '8px' }}>
                                                <div>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '800' }}>CAMPO: {entry.campo}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span style={{ color: 'var(--priority-alta)', textDecoration: 'line-through' }}>{String(entry.valorAnterior || 'Vacío')}</span>
                                                        <span style={{ color: 'var(--text-muted)' }}>→</span>
                                                        <span style={{ color: 'var(--accent)', fontWeight: '700' }}>{String(entry.valorNuevo || 'Vacío')}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleUndo(entry)}
                                                    disabled={isUndoing}
                                                    className="btn hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--glass-border)', background: 'transparent', color: 'var(--text-main)', fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
                                                >
                                                    <RotateCcw size={14} /> DESHACER
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
