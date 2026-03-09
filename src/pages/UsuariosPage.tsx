import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Search, Save, X, UserCheck, Shield, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { downloadExcel, fileTimestamp } from '../utils/fileDownload';
import { useNotification } from '../context/NotificationContext';
import { db } from '../services/firebase';
import { collection, doc, getDocs } from 'firebase/firestore';
import { trackedAddDoc, trackedUpdateDoc } from '../services/firestoreHelpers';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useAuth } from '../hooks/useAuth';
import { tenantQuery } from '../services/tenantContext';
import { logEntityChange, getClientes, getCatalogos } from '../services/dataService';
import type { User, Sucursal, Cliente, UserRole, Franquicia, CatalogoItem } from '../types';

export const UsuariosPage: React.FC = () => {
    const [usuarios, setUsuarios] = useState<User[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [franquicias, setFranquicias] = useState<Franquicia[]>([]);
    const [catalogos, setCatalogos] = useState<CatalogoItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchEmail, setSearchEmail] = useState('');
    const [searchSucursal, setSearchSucursal] = useState('');
    const [filterRol, setFilterRol] = useState('');
    const [filterFranquicia, setFilterFranquicia] = useState('');
    const [filterSucursalId, setFilterSucursalId] = useState('');
    const [filterCliente, setFilterCliente] = useState('');
    const [filterEspecialidad, setFilterEspecialidad] = useState('');
    const [filterSupervisorId, setFilterSupervisorId] = useState('');
    const [filterCoordinadorId, setFilterCoordinadorId] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const { showNotification } = useNotification();

    // Form State
    const [clienteId, setClienteId] = useState('');
    const [franquiciaId, setFranquiciaId] = useState('');
    const [rol, setRol] = useState<UserRole>('Tecnico');
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [sucursalesPermitidas, setSucursalesPermitidas] = useState<string[]>([]);
    const [especialidad, setEspecialidad] = useState<User['especialidad']>();
    const [supervisorId, setSupervisorId] = useState('');
    const [coordinadorId, setCoordinadorId] = useState('');

    const defaultRoles = [
        { id: 'ROL_ADMIN_GENERAL', name: 'Admin General' },
        { id: 'ROL_COORD', name: 'Coordinador' },
        { id: 'ROL_GERENTE', name: 'Gerente' },
        { id: 'ROL_SUPERVISOR', name: 'Supervisor' },
        { id: 'ROL_TECNICO', name: 'Tecnico' },
        { id: 'ROL_TECNICO_EXTERNO', name: 'TecnicoExterno' }
    ];
    const dynamicRoles = catalogos.filter(c => c.categoria === 'Rol').map(c => ({ id: c.nomenclatura, name: c.nombre }));
    const roles = dynamicRoles.length > 0 ? dynamicRoles : defaultRoles;

    const defaultEsp = [
        { id: 'ESP_AIRES', name: 'Aires' },
        { id: 'ESP_COCCION', name: 'Coccion' },
        { id: 'ESP_REFRIGERACION', name: 'Refrigeracion' },
        { id: 'ESP_COCINA', name: 'Cocina' },
        { id: 'ESP_RESTAURANTE', name: 'Restaurante' },
        { id: 'ESP_LOCAL', name: 'Local' },
        { id: 'ESP_AGUA', name: 'Agua' },
        { id: 'ESP_GENERADORES', name: 'Generadores' }
    ];
    const dynamicEsp = catalogos.filter(c => c.categoria === 'Especialidad').map(c => ({ id: c.nomenclatura, name: c.nombre }));
    const especialidades = dynamicEsp.length > 0 ? dynamicEsp : defaultEsp;

    const getCatalogoName = (id: string, categoria: 'Rol' | 'Especialidad') => {
        const item = catalogos.find(c => c.categoria === categoria && c.nomenclatura === id);
        return item ? item.nombre : id;
    };

    // Helper roles identification (Iron Link) - Strictly Nomenclature
    const _isCoordinador = (r: string) => r?.startsWith('ROL_COORD') || r === 'Coordinador' || r === 'Coordinador CN';
    const _isSupervisor = (r: string) => r?.startsWith('ROL_SUPERVISOR') || r === 'Supervisor';
    const _isTecnico = (r: string) => r?.startsWith('ROL_TECNICO') || r === 'Tecnico' || r === 'TecnicoExterno';

    const { user: currentUser, activeClienteId, isAdmin } = useAuth();

    const fetchData = React.useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const targetClienteId = (isAdmin && activeClienteId && activeClienteId !== 'ADMIN')
                ? activeClienteId
                : (!isAdmin ? currentUser?.clienteId : undefined);

            const snapshot = await getDocs(tenantQuery('usuarios', currentUser));
            const uData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            const [sData, cData, fData, catData] = await Promise.all([
                getDocs(tenantQuery('sucursales', currentUser)),
                getClientes(targetClienteId),
                getDocs(tenantQuery('franquicias', currentUser)),
                getCatalogos(targetClienteId)
            ]);
            setUsuarios(uData);
            setSucursales(sData.docs.map(d => ({ id: d.id, ...d.data() } as Sucursal)));
            setClientes(cData);
            setFranquicias(fData.docs.map(d => ({ id: d.id, ...d.data() } as Franquicia)));
            setCatalogos(catData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [currentUser, activeClienteId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (isModalOpen && !editingUser && clienteId) {
            // Auto-asignación de Coordinador si solo hay uno
            const availableCoordinators = usuarios.filter(u => _isCoordinador(u.rol) && u.clienteId === clienteId);
            if (availableCoordinators.length === 1 && !coordinadorId) {
                setCoordinadorId(availableCoordinators[0].id);
            }
            // Auto-asignación de Supervisor si solo hay uno
            const availableSupervisors = usuarios.filter(u => _isSupervisor(u.rol) && u.clienteId === clienteId);
            if (availableSupervisors.length === 1 && !supervisorId) {
                setSupervisorId(availableSupervisors[0].id);
            }
        }
    }, [isModalOpen, editingUser, usuarios, coordinadorId, supervisorId, clienteId]);

    useEscapeKey(() => setIsModalOpen(false), isModalOpen);

    const handleOpenModal = (usuario?: User) => {
        const effectiveClientId = (activeClienteId && activeClienteId !== 'ADMIN')
            ? activeClienteId
            : (currentUser?.clienteId && currentUser.clienteId !== 'ADMIN' ? currentUser.clienteId : '');

        if (usuario) {
            setEditingUser(usuario);
            setNombre(usuario.nombre);
            setEmail(usuario.email);
            setContrasena(usuario.contrasena || '');
            setRol(usuario.rol);
            setClienteId(usuario.clienteId || '');
            setFranquiciaId(usuario.franquiciaId || '');
            setSucursalesPermitidas(usuario.sucursalesPermitidas || []);
            setSupervisorId(usuario.supervisorId || '');
            setCoordinadorId(usuario.coordinadorId || '');
            setEspecialidad(usuario.especialidad);
        } else {
            setEditingUser(null);
            setNombre('');
            setEmail('');
            setContrasena('');
            setRol('ROL_TECNICO'); // Default to standard Nomenclature ID
            setClienteId(effectiveClientId);
            setFranquiciaId('');
            setSucursalesPermitidas([]);
            setSupervisorId('');
            setEspecialidad(undefined);

            // AUTO-PRESELECCIÓN DE COORDINADOR ÚNICO (Usando ID Interno)
            const availableCoordinators = usuarios.filter(u => _isCoordinador(u.rol));
            if (availableCoordinators.length === 1) {
                setCoordinadorId(availableCoordinators[0].id);
            } else {
                setCoordinadorId('');
            }
        }
        setIsModalOpen(true);
    };

    const toggleSucursal = (id: string) => {
        setSucursalesPermitidas(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // VALIDACIÓN DE CAMPOS MANDATORIOS
        if (!nombre.trim()) {
            showNotification("El nombre completo es obligatorio.", "warning");
            return;
        }
        if (!email.trim() || !email.includes('@')) {
            showNotification("Ingrese un email válido.", "warning");
            return;
        }
        if (!contrasena.trim()) {
            showNotification("La contraseña es obligatoria.", "warning");
            return;
        }
        if (!clienteId) {
            showNotification("Seleccione un cliente para el usuario.", "warning");
            return;
        }
        if (rol !== 'TecnicoExterno' && !_isSupervisor(rol) && !_isCoordinador(rol) && !franquiciaId) {
            showNotification("Seleccione una franquicia para el usuario.", "warning");
            return;
        }

        // Validación específica para Técnicos
        if (!sucursalesPermitidas || sucursalesPermitidas.length === 0) {
            showNotification("Debe asignar al menos una sucursal al usuario.", "warning");
            return;
        }

        // Validación específica para Técnicos
        if (_isTecnico(rol)) {
            if (rol === 'ROL_TECNICO_EXTERNO' && !especialidad) {
                showNotification("Los técnicos externos deben tener una especialidad asignada.", "warning");
                return;
            }
        }

        // Validación de Coordinador: Todos excepto el Coordinador deben tener uno (opcional para Supervisor)
        if (!_isCoordinador(rol) && !_isSupervisor(rol) && !coordinadorId) {
            showNotification("El Coordinador Asignado es obligatorio para este rol.", "warning");
            return;
        }

        // Validación de Supervisor: Técnicos y Gerentes deben tener uno
        if (_isTecnico(rol) && !supervisorId) {
            showNotification("El Supervisor Asignado es obligatorio para técnicos.", "warning");
            return;
        }

        const data = {
            clienteId: clienteId,
            franquiciaId: (rol === 'ROL_TECNICO_EXTERNO') ? null : (franquiciaId || null),
            rol,
            nombre,
            email,
            contrasena,
            sucursalesPermitidas: sucursalesPermitidas || [],
            especialidad: (rol === 'ROL_TECNICO_EXTERNO') ? (especialidad || null) : null,
            supervisorId: (_isTecnico(rol) || rol === 'ROL_GERENTE' || _isSupervisor(rol)) ? (supervisorId || null) : null,
            coordinadorId: !_isCoordinador(rol) ? (coordinadorId || null) : null
        };

        try {
            if (editingUser) {
                await trackedUpdateDoc(doc(db, 'usuarios', editingUser.id), data);
                if (currentUser) {
                    await logEntityChange({
                        clienteId: data.clienteId,
                        entityName: 'Usuario',
                        entityId: editingUser.id,
                        oldData: editingUser,
                        newData: data,
                        user: currentUser,
                        fieldsToTrack: ['nombre', 'email', 'rol', 'clienteId']
                    });
                }
                showNotification("Usuario actualizado correctamente.", "success");
            } else {
                const docRef = await trackedAddDoc(collection(db, 'usuarios'), data);
                if (currentUser) {
                    await logEntityChange({
                        clienteId: data.clienteId,
                        entityName: 'Usuario',
                        entityId: docRef.id,
                        oldData: null,
                        newData: data,
                        user: currentUser,
                        fieldsToTrack: []
                    });
                }
                showNotification("Usuario creado correctamente.", "success");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            showNotification("Error al procesar la solicitud del usuario.", "error");
        }
    };

    const filteredUsuarios = usuarios.filter(u => {
        const matchNombre = (u.nombre || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchEmail = (u.email || '').toLowerCase().includes(searchEmail.toLowerCase());
        const matchRol = !filterRol || u.rol === filterRol;

        const isGlobalRole = u.rol === 'ROL_ADMIN_GENERAL' || u.rol.includes('COORD');

        const matchFranquicia = !filterFranquicia || u.sucursalesPermitidas?.some(sid => {
            const suc = sucursales.find(s => s.id === sid);
            return suc?.franquiciaId === filterFranquicia;
        }) || isGlobalRole;

        const matchSucursalId = !filterSucursalId || u.sucursalesPermitidas?.includes(filterSucursalId) || u.sucursalesPermitidas?.includes('TODAS') || isGlobalRole;

        const matchNombreSucursal = !searchSucursal || u.sucursalesPermitidas?.some(sid => {
            const suc = sucursales.find(s => s.id === sid);
            return (suc?.nombre || '').toLowerCase().includes(searchSucursal.toLowerCase());
        }) || isGlobalRole;

        const matchCliente = !filterCliente || u.clienteId === filterCliente;
        const matchEspecialidad = !filterEspecialidad || u.especialidad === filterEspecialidad;
        const matchSupervisor = !filterSupervisorId || u.supervisorId === filterSupervisorId;
        const matchCoordinador = !filterCoordinadorId || u.coordinadorId === filterCoordinadorId;

        return matchNombre && matchEmail && matchRol && matchFranquicia && matchSucursalId && matchNombreSucursal && matchCliente && matchEspecialidad && matchSupervisor && matchCoordinador;
    });

    const exportToExcel = async () => {
        try {
            const dataToExport = filteredUsuarios.map(u => ({
                Nombre: u.nombre,
                Email: u.email,
                Contraseña: u.contrasena || '',
                Rol: u.rol,
                Franquicia: franquicias.find(f => f.id === u.franquiciaId)?.nombre || '',
                Sucursales: u.sucursalesPermitidas?.includes('TODAS') ? 'TODAS' : u.sucursalesPermitidas?.map(sid => sucursales.find(s => s.id === sid)?.nombre).filter(Boolean).join(', ') || '',
                Especialidad: u.especialidad || '',
                Supervisor: usuarios.find(sup => sup.id === u.supervisorId)?.nombre || '',
                Coordinador: usuarios.find(coord => coord.id === u.coordinadorId)?.nombre || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(dataToExport);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");
            const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            await downloadExcel(wbout, `catalogo_usuarios_${fileTimestamp()}.xlsx`);
        } catch (err) {
            console.error('Error al exportar Usuarios:', err);
        }
    };

    return (
        <>
            <div className="animate-fade">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Gestión de Usuarios</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Control de acceso y permisos por rol.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        <Plus size={20} />
                        Nuevo Usuario
                    </button>
                </div>

                <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        {/* Nombre */}
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Nombre..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                            />
                        </div>

                        {/* Empresa */}
                        {(activeClienteId === 'ADMIN' || !activeClienteId) && (
                            <select
                                value={filterCliente}
                                onChange={(e) => { setFilterCliente(e.target.value); setFilterFranquicia(''); setFilterSucursalId(''); }}
                                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                            >
                                <option value="">Todas las Empresas</option>
                                {clientes.map(c => <option key={c.id} value={c.id} style={{ color: 'black' }}>{c.nombre}</option>)}
                            </select>
                        )}

                        {/* Email */}
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Email..."
                                value={searchEmail}
                                onChange={(e) => setSearchEmail(e.target.value)}
                                style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                            />
                        </div>

                        {/* Rol */}
                        <select
                            value={filterRol}
                            onChange={(e) => setFilterRol(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                        >
                            <option value="">Todos los Roles</option>
                            {roles.map(r => <option key={r.id} value={r.id} style={{ color: 'black' }}>{r.name}</option>)}
                        </select>

                        {/* Franquicia */}
                        <select
                            value={filterFranquicia}
                            onChange={(e) => { setFilterFranquicia(e.target.value); setFilterSucursalId(''); }}
                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                        >
                            <option value="">Todas las Franquicias</option>
                            {franquicias.filter(f => !filterCliente || f.clienteId === filterCliente).map(f => <option key={f.id} value={f.id} style={{ color: 'black' }}>{f.nombre}</option>)}
                        </select>

                        {/* Sucursal ID Selector */}
                        <select
                            value={filterSucursalId}
                            onChange={(e) => setFilterSucursalId(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                        >
                            <option value="">Todas las Sucursales</option>
                            {sucursales.filter(s => !filterFranquicia || s.franquiciaId === filterFranquicia).map(s => (
                                <option key={s.id} value={s.id} style={{ color: 'black' }}>{s.nombre}</option>
                            ))}
                        </select>

                        {/* Nombre Sucursal Text */}
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Nombre Sucursal..."
                                value={searchSucursal}
                                onChange={(e) => setSearchSucursal(e.target.value)}
                                style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                            />
                        </div>

                        {/* Especialidad */}
                        <select
                            value={filterEspecialidad}
                            onChange={(e) => setFilterEspecialidad(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                        >
                            <option value="">Todas las Especialidades</option>
                            {especialidades.map(e => <option key={e.id} value={e.id} style={{ color: 'black' }}>{e.name}</option>)}
                        </select>

                        {/* Supervisor */}
                        <select
                            value={filterSupervisorId}
                            onChange={(e) => setFilterSupervisorId(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                        >
                            <option value="">Todos los Supervisores</option>
                            {usuarios.filter(u => _isSupervisor(u.rol)).map(u => <option key={u.id} value={u.id} style={{ color: 'black' }}>{u.nombre}</option>)}
                        </select>

                        {/* Coordinador */}
                        <select
                            value={filterCoordinadorId}
                            onChange={(e) => setFilterCoordinadorId(e.target.value)}
                            style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                        >
                            <option value="">Todos los Coordinadores</option>
                            {usuarios.filter(u => _isCoordinador(u.rol)).map(u => <option key={u.id} value={u.id} style={{ color: 'black' }}>{u.nombre}</option>)}
                        </select>

                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                        <button
                            className="btn"
                            onClick={() => {
                                setSearchTerm('');
                                setSearchEmail('');
                                setSearchSucursal('');
                                setFilterRol('');
                                setFilterFranquicia('');
                                setFilterSucursalId('');
                                setFilterCliente('');
                                setFilterEspecialidad('');
                                setFilterSupervisorId('');
                                setFilterCoordinadorId('');
                            }}
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--glass-border)', fontSize: '0.75rem', fontWeight: '600', padding: '0.6rem 1rem' }}
                        >
                            Limpiar Filtros
                        </button>

                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                            Mostrando {filteredUsuarios.length} registro(s) con los filtros actuales
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={exportToExcel}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', color: 'white', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            disabled={filteredUsuarios.length === 0}
                        >
                            <Download size={18} />
                            Exportar a Excel
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando usuarios...</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {filteredUsuarios.map(u => (
                            <div key={u.id} className="glass-card animate-fade">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        <div style={{ padding: '0.5rem', background: (u.rol === 'ROL_ADMIN_GENERAL' || u.rol === 'Admin General') ? 'rgba(37, 99, 235, 0.15)' : 'var(--bg-input)', borderRadius: '8px', color: (u.rol === 'ROL_ADMIN_GENERAL' || u.rol === 'Admin General') ? 'var(--primary-light)' : 'var(--text-main)' }}>
                                            {(u.rol === 'ROL_ADMIN_GENERAL' || u.rol === 'Admin General') ? <Shield size={20} /> : <UserCheck size={20} />}
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)' }}>{u.nombre}</h3>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{getCatalogoName(u.rol, 'Rol')} • {clientes.find(c => c.id === u.clienteId)?.nombre || u.clienteId}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleOpenModal(u)} style={{ background: 'var(--bg-input)', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--glass-border)', color: 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s' }}>
                                        <Edit2 size={16} />
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{u.email}</p>
                                <div style={{ marginBottom: '0.75rem' }}>
                                    <p style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Estructura Asignada</p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                                        {u.sucursalesPermitidas?.includes('TODAS') ? (
                                            <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary-light)', borderRadius: '4px', border: '1px solid rgba(37, 99, 235, 0.2)' }}>
                                                Acceso a Todas las Sucursales
                                            </span>
                                        ) : (
                                            u.sucursalesPermitidas?.slice(0, 3).map(sid => {
                                                const s = sucursales.find(suc => suc.id === sid);
                                                const f = franquicias.find(fran => fran.id === s?.franquiciaId);
                                                return (
                                                    <span key={sid} style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', background: 'var(--bg-input)', color: 'var(--text-main)', borderRadius: '4px', border: '1px solid var(--glass-border)' }}>
                                                        {f?.nombre ? `${f.nombre} - ` : ''}{s?.nombre || 'Desconocida'}
                                                    </span>
                                                );
                                            })
                                        )}
                                        {u.sucursalesPermitidas && u.sucursalesPermitidas.length > 3 && !u.sucursalesPermitidas.includes('TODAS') && (
                                            <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', color: 'var(--text-muted)' }}>
                                                +{u.sucursalesPermitidas.length - 3} más...
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {u.especialidad && <span style={{ fontSize: '0.65rem', padding: '0.25rem 0.6rem', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent)', borderRadius: '6px', fontWeight: 'bold' }}>{getCatalogoName(u.especialidad, 'Especialidad')}</span>}
                                    {u.supervisorId && (
                                        <span style={{ fontSize: '0.65rem', padding: '0.25rem 0.6rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-concluida)', borderRadius: '6px', fontWeight: 'bold' }}>
                                            SUP: {usuarios.find(sup => sup.id === u.supervisorId)?.nombre || u.supervisorId}
                                        </span>
                                    )}
                                    {u.coordinadorId && (
                                        <span style={{ fontSize: '0.65rem', padding: '0.25rem 0.6rem', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--status-finalizada)', borderRadius: '6px', fontWeight: 'bold' }}>
                                            COORD: {usuarios.find(c => c.id === u.coordinadorId)?.nombre || u.coordinadorId}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>

            {/* Modal - Alta/Edición (Placed outside animate-fade to avoid stacking context traps) */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem', zIndex: 10000
                }}>
                    <div className="glass-card animate-fade" style={{ width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 className="modal-title">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                <div>
                                    <label className="modal-label">Nombre Completo</label>
                                    <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label className="modal-label">Usuario (Email de Acceso)</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }} />
                                </div>
                                <div>
                                    <label className="modal-label">Contraseña</label>
                                    <input type="text" value={contrasena} onChange={e => setContrasena(e.target.value)} required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label className="modal-label">Rol</label>
                                    <select value={rol} onChange={e => {
                                        const newRol = e.target.value as any;
                                        setRol(newRol);
                                    }} required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                    >
                                        {roles.map(r => <option key={r.id} value={r.id} style={{ color: 'black' }}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="modal-label">Cliente Principal (Contexto Activo)</label>
                                    <select value={clienteId} onChange={e => setClienteId(e.target.value)} required
                                        disabled={true}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-switch)', color: 'var(--text-muted)', cursor: 'not-allowed' }}
                                    >
                                        <option value="" style={{ color: 'black' }}>Seleccione Cliente</option>
                                        <option value="ADMIN" style={{ color: 'black' }}>ADMIN (Todo)</option>
                                        {clientes.map(c => <option key={c.id} value={c.id} style={{ color: 'black' }}>{c.nombre}</option>)}
                                    </select>
                                </div>
                                {rol !== 'TecnicoExterno' && (
                                    <div>
                                        <label className="modal-label">Franquicia {!_isSupervisor(rol) && !_isCoordinador(rol) && <span style={{ color: '#ef4444' }}>*</span>}</label>
                                        <select value={franquiciaId} onChange={e => {
                                            setFranquiciaId(e.target.value);
                                            // Reset sucursales if franchise changes to prevent cross-franchise assignments
                                            setSucursalesPermitidas([]);
                                        }} required={!_isSupervisor(rol) && !_isCoordinador(rol)}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                        >
                                            <option value="" style={{ color: 'black' }}>Seleccione Franquicia...</option>
                                            {franquicias.map(f => <option key={f.id} value={f.id} style={{ color: 'black' }}>{f.nombre}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {rol === 'ROL_TECNICO_EXTERNO' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                                    <div>
                                        <label className="modal-label">
                                            Especialidad <span style={{ color: '#ef4444' }}>*</span>
                                        </label>
                                        <select value={especialidad || ''} onChange={e => setEspecialidad(e.target.value as any)}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                            required
                                        >
                                            <option value="" style={{ color: 'black' }}>Seleccione Especialidad...</option>
                                            {especialidades.map(es => <option key={es.id} value={es.id} style={{ color: 'black' }}>{es.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {(!_isCoordinador(rol) || !_isSupervisor(rol)) && (
                                <div style={{ display: 'grid', gridTemplateColumns: (!_isCoordinador(rol) && !_isSupervisor(rol)) ? '1fr 1fr' : '1fr', gap: '1rem' }}>
                                    {!_isSupervisor(rol) && (
                                        <div>
                                            <label className="modal-label">Supervisor Asignado {_isTecnico(rol) && <span style={{ color: '#ef4444' }}>*</span>}</label>
                                            <select value={supervisorId} onChange={e => setSupervisorId(e.target.value)}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                                required={_isTecnico(rol)}
                                            >
                                                <option value="" style={{ color: 'black' }}>Sin Supervisor</option>
                                                {usuarios.filter(u => _isSupervisor(u.rol)).map(u => (
                                                    <option key={u.id} value={u.id} style={{ color: 'black' }}>{u.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {!_isCoordinador(rol) && (
                                        <div>
                                            <label className="modal-label">Coordinador Asignado {!_isSupervisor(rol) && <span style={{ color: '#ef4444' }}>*</span>}</label>
                                            <select value={coordinadorId} onChange={e => setCoordinadorId(e.target.value)}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                                required={!_isSupervisor(rol)}
                                            >
                                                <option value="" style={{ color: 'black' }}>Seleccione Coordinador...</option>
                                                {usuarios.filter(u => _isCoordinador(u.rol)).map(u => (
                                                    <option key={u.id} value={u.id} style={{ color: 'black' }}>{u.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <label style={{ fontSize: '0.875rem', fontWeight: '800', color: 'var(--text-main)' }}>SUCURSALES PERMITIDAS</label>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const visible = sucursales
                                                    .filter(s => clienteId === 'ADMIN' || s.clienteId === clienteId)
                                                    .map(s => s.id);
                                                setSucursalesPermitidas(visible);
                                            }}
                                            style={{ fontSize: '0.65rem', padding: '2px 8px', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', border: '1px solid #4ade80', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            TODAS
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSucursalesPermitidas([])}
                                            style={{ fontSize: '0.65rem', padding: '2px 8px', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid #f87171', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            NINGUNA
                                        </button>
                                    </div>
                                </div>
                                <div className="custom-scrollbar" style={{
                                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem',
                                    maxHeight: '180px', overflowY: 'auto', padding: '1rem',
                                    background: 'var(--bg-input)', borderRadius: '12px', border: '1px solid var(--glass-border)',
                                    color: 'var(--text-main)'
                                }}>
                                    {sucursales.filter(s => {
                                        // Filter by both client and selected franchise
                                        const matchClient = (clienteId === 'ADMIN' || !clienteId || s.clienteId === clienteId);
                                        const matchFranchise = !franquiciaId || s.franquiciaId === franquiciaId;
                                        return matchClient && matchFranchise;
                                    }).map(s => (
                                        <label key={s.id} style={{
                                            display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem',
                                            cursor: 'pointer', color: 'var(--text-main)', padding: '0.4rem', borderRadius: '6px',
                                            background: sucursalesPermitidas.includes(s.id) ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                                            transition: 'all 0.2s'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={sucursalesPermitidas.includes(s.id) || sucursalesPermitidas.includes('TODAS')}
                                                onChange={() => toggleSucursal(s.id)}
                                                style={{ accentColor: 'var(--primary)' }}
                                            />
                                            <span style={{ opacity: sucursalesPermitidas.includes(s.id) ? 1 : 0.8 }}>
                                                {s.nombre} <small style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>({franquicias.find(f => f.id === s.franquiciaId)?.nombre || 'S/F'})</small>
                                            </span>
                                        </label>
                                    ))}
                                    {clienteId === 'ADMIN' && (
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', cursor: 'pointer', color: 'var(--accent)', padding: '0.4rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={sucursalesPermitidas.includes('TODAS')}
                                                onChange={() => setSucursalesPermitidas(['TODAS'])}
                                            />
                                            ACCESO TOTAL (TODAS)
                                        </label>
                                    )}
                                </div>
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
        </>
    );
};

