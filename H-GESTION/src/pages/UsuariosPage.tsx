import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Search, Save, X, UserCheck, Shield } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { db } from '../services/firebase';
import { addDoc, collection, doc, updateDoc, getDocs } from 'firebase/firestore';
import type { User, Sucursal, Cliente, UserRole, Franquicia } from '../types';

export const UsuariosPage: React.FC = () => {
    const [usuarios, setUsuarios] = useState<User[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [franquicias, setFranquicias] = useState<Franquicia[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const { showNotification } = useNotification();

    // Form State
    const [clienteId, setClienteId] = useState('');
    const [rol, setRol] = useState<UserRole>('Tecnico');
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [sucursalesPermitidas, setSucursalesPermitidas] = useState<string[]>([]);
    const [especialidad, setEspecialidad] = useState<User['especialidad']>();
    const [supervisorId, setSupervisorId] = useState('');
    const [coordinadorId, setCoordinadorId] = useState('');

    const roles: UserRole[] = ['Admin', 'Coordinador', 'Gerente', 'Supervisor', 'Tecnico', 'TecnicoExterno'];
    const especialidades: User['especialidad'][] = ['Aires', 'Coccion', 'Refrigeracion', 'Agua', 'Generadores'];

    const fetchData = async () => {
        setLoading(true);
        try {
            const snapshot = await getDocs(collection(db, 'usuarios'));
            const uData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            const [sData, cData, fData] = await Promise.all([
                getDocs(collection(db, 'sucursales')),
                getDocs(collection(db, 'clientes')),
                getDocs(collection(db, 'franquicias'))
            ]);
            setUsuarios(uData);
            setSucursales(sData.docs.map(d => ({ id: d.id, ...d.data() } as Sucursal)));
            setClientes(cData.docs.map(d => ({ id: d.id, ...d.data() } as Cliente)));
            setFranquicias(fData.docs.map(d => ({ id: d.id, ...d.data() } as Franquicia)));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setClienteId(user.clientId);
            setRol(user.rol);
            setNombre(user.nombre);
            setEmail(user.email);
            setSucursalesPermitidas(user.sucursalesPermitidas);
            setEspecialidad(user.especialidad);
            setSupervisorId(user.supervisorId || '');
            setCoordinadorId(user.coordinadorId || '');
        } else {
            setEditingUser(null);
            setClienteId('');
            setRol('Tecnico');
            setNombre('');
            setEmail('');
            setSucursalesPermitidas([]);
            setEspecialidad(undefined);
            setSupervisorId('');
            setCoordinadorId('');
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
        if (!clienteId) {
            showNotification("Seleccione un cliente para el usuario.", "warning");
            return;
        }

        // Validación específica para Técnicos
        if (rol === 'Tecnico' || rol === 'TecnicoExterno') {
            if (rol === 'TecnicoExterno' && !especialidad) {
                showNotification("Los técnicos externos deben tener una especialidad asignada.", "warning");
                return;
            }
            if (!sucursalesPermitidas || sucursalesPermitidas.length === 0) {
                showNotification("Los técnicos deben tener al menos una sucursal asignada.", "warning");
                return;
            }
        }

        const data = {
            clientId: clienteId,
            rol,
            nombre,
            email,
            sucursalesPermitidas: sucursalesPermitidas || [],
            especialidad: (rol === 'TecnicoExterno') ? (especialidad || null) : null,
            supervisorId: (rol === 'Tecnico' || rol === 'TecnicoExterno') ? (supervisorId || null) : null,
            coordinadorId: (rol === 'Tecnico' || rol === 'TecnicoExterno') ? (coordinadorId || null) : null
        };

        try {
            if (editingUser) {
                await updateDoc(doc(db, 'usuarios', editingUser.id), data);
                showNotification("Usuario actualizado correctamente.", "success");
            } else {
                await addDoc(collection(db, 'usuarios'), data);
                showNotification("Usuario creado correctamente.", "success");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            showNotification("Error al procesar la solicitud del usuario.", "error");
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

                <div className="glass-card" style={{ marginBottom: '2rem' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', outline: 'none' }}
                        />
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando usuarios...</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {usuarios.filter(u => u.nombre.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
                            <div key={u.id} className="glass-card animate-fade">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                        <div style={{ padding: '0.5rem', background: u.rol === 'Admin' ? 'rgba(37, 99, 235, 0.15)' : 'var(--bg-input)', borderRadius: '8px', color: u.rol === 'Admin' ? 'var(--primary-light)' : 'var(--text-main)' }}>
                                            {u.rol === 'Admin' ? <Shield size={20} /> : <UserCheck size={20} />}
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-main)' }}>{u.nombre}</h3>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.rol} • {clientes.find(c => c.id === u.clientId)?.nombre || u.clientId}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleOpenModal(u)} style={{ background: 'var(--bg-input)', padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--glass-border)', color: 'var(--text-main)', cursor: 'pointer', transition: 'all 0.2s' }}>
                                        <Edit2 size={16} />
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{u.email}</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {u.especialidad && <span style={{ fontSize: '0.65rem', padding: '0.25rem 0.6rem', background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent)', borderRadius: '6px', fontWeight: 'bold' }}>{u.especialidad}</span>}
                                    {u.supervisorId && (
                                        <span style={{ fontSize: '0.65rem', padding: '0.25rem 0.6rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-concluida)', borderRadius: '6px', fontWeight: 'bold' }}>
                                            SUP: {usuarios.find(sup => sup.id === u.supervisorId)?.nombre || u.supervisorId}
                                        </span>
                                    )}
                                    {u.coordinadorId && (
                                        <span style={{ fontSize: '0.65rem', padding: '0.25rem 0.6rem', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--status-terminada)', borderRadius: '6px', fontWeight: 'bold' }}>
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
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label className="modal-label">Nombre Completo</label>
                                    <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }} />
                                </div>
                                <div>
                                    <label className="modal-label">Email de Acceso</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label className="modal-label">Rol</label>
                                    <select value={rol} onChange={e => {
                                        const newRol = e.target.value as any;
                                        setRol(newRol);
                                        if (newRol !== 'TecnicoExterno') setEspecialidad(undefined);
                                    }} required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                    >
                                        {roles.map(r => <option key={r} value={r} style={{ color: 'black' }}>{r}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="modal-label">Cliente Principal</label>
                                    <select value={clienteId} onChange={e => setClienteId(e.target.value)} required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                    >
                                        <option value="" style={{ color: 'black' }}>Seleccione Cliente</option>
                                        <option value="ADMIN" style={{ color: 'black' }}>ADMIN (Todo)</option>
                                        {clientes.map(c => <option key={c.id} value={c.id} style={{ color: 'black' }}>{c.nombre}</option>)}
                                    </select>
                                </div>
                            </div>

                            {(rol === 'Tecnico' || rol === 'TecnicoExterno') && (
                                <>
                                    {rol === 'TecnicoExterno' && (
                                        <div>
                                            <label className="modal-label">Especialidad</label>
                                            <select value={especialidad} onChange={e => setEspecialidad(e.target.value as any)}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                            >
                                                <option value="" style={{ color: 'black' }}>Seleccione...</option>
                                                {especialidades.map(es => <option key={es} value={es} style={{ color: 'black' }}>{es}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label className="modal-label">Supervisor Asignado</label>
                                            <select value={supervisorId} onChange={e => setSupervisorId(e.target.value)}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                            >
                                                <option value="" style={{ color: 'black' }}>Sin Supervisor</option>
                                                {usuarios.filter(u => u.rol === 'Supervisor').map(u => (
                                                    <option key={u.id} value={u.id} style={{ color: 'black' }}>{u.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="modal-label">Coordinador Asignado</label>
                                            <select value={coordinadorId} onChange={e => setCoordinadorId(e.target.value)}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                            >
                                                <option value="" style={{ color: 'black' }}>Sin Coordinador</option>
                                                {usuarios.filter(u => u.rol === 'Coordinador').map(u => (
                                                    <option key={u.id} value={u.id} style={{ color: 'black' }}>{u.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </>
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
                                        if (clienteId === 'ADMIN') return true;
                                        if (!clienteId) return true;
                                        return s.clienteId === clienteId;
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

