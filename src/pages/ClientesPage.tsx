import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Search, Save, X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useNotification } from '../context/NotificationContext';
import { getClientes, saveCliente } from '../services/dataService';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { useAuth } from '../hooks/useAuth';
import type { Cliente } from '../types';

export const ClientesPage: React.FC = () => {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchNombre, setSearchNombre] = useState('');
    const [searchRazonSocial, setSearchRazonSocial] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
    const { showNotification } = useNotification();
    const { user } = useAuth();

    // Form State
    const [nombre, setNombre] = useState('');
    const [razonSocial, setRazonSocial] = useState('');

    const fetchClientes = async () => {
        setLoading(true);
        try {
            const data = await getClientes();
            setClientes(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClientes();
    }, []);

    useEscapeKey(() => setIsModalOpen(false), isModalOpen);

    const handleOpenModal = (cliente?: Cliente) => {
        if (cliente) {
            setEditingCliente(cliente);
            setNombre(cliente.nombre);
            setRazonSocial(cliente.razonSocial);
        } else {
            setEditingCliente(null);
            setNombre('');
            setRazonSocial('');
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // VALIDACIÓN DE CAMPOS MANDATORIOS
        if (!nombre.trim()) {
            showNotification("El nombre comercial es obligatorio.", "warning");
            return;
        }
        if (!razonSocial.trim()) {
            showNotification("La razón social es obligatoria para facturación.", "warning");
            return;
        }

        try {
            if (user) {
                await saveCliente({ nombre, razonSocial }, user, editingCliente?.id);
            }
            showNotification(editingCliente ? "Cliente actualizado" : "Cliente creado", "success");
            setIsModalOpen(false);
            fetchClientes();
        } catch (error) {
            console.error(error);
            showNotification("Error al guardar cliente.", "error");
        }
    };

    const filteredClientes = clientes.filter(c =>
        c.nombre.toLowerCase().includes(searchNombre.toLowerCase()) &&
        c.razonSocial.toLowerCase().includes(searchRazonSocial.toLowerCase())
    );

    const exportToExcel = () => {
        const dataToExport = filteredClientes.map(c => ({
            Nombre: c.nombre,
            RazonSocial: c.razonSocial,
            ID: c.id
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
        XLSX.writeFile(workbook, "catalogo_clientes.xlsx");
    };

    return (
        <>
            <div className="animate-fade">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Catálogo de Clientes</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Administra las empresas y razones sociales.</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => handleOpenModal()}>
                        <Plus size={20} />
                        Nuevo Cliente
                    </button>
                </div>

                <div className="glass-card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre..."
                                value={searchNombre}
                                onChange={(e) => setSearchNombre(e.target.value)}
                                style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                            />
                        </div>

                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Buscar por razón social..."
                                value={searchRazonSocial}
                                onChange={(e) => setSearchRazonSocial(e.target.value)}
                                style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.25rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.85rem' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                        <button
                            className="btn"
                            onClick={() => {
                                setSearchNombre('');
                                setSearchRazonSocial('');
                            }}
                            style={{ background: 'var(--bg-input)', border: '1px solid var(--glass-border)', fontSize: '0.75rem', fontWeight: '600', padding: '0.6rem 1rem' }}
                        >
                            Limpiar Filtros
                        </button>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: '600' }}>
                            Mostrando {filteredClientes.length} registro(s) con los filtros actuales
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={exportToExcel}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#10b981', color: 'white', padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                            disabled={filteredClientes.length === 0}
                        >
                            <Download size={18} />
                            Exportar a Excel
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando clientes...</div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                        {filteredClientes.map(cliente => (
                            <div key={cliente.id} className="glass-card animate-fade" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.25rem' }}>{cliente.nombre}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{cliente.razonSocial}</p>

                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => handleOpenModal(cliente)}
                                        style={{ background: 'var(--bg-switch)', border: 'none', color: 'var(--text-muted)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>

            {/* Modal - Alta/Edición (Placed outside animate-fade to avoid stacking context traps) */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem', zIndex: 10000
                }}>
                    <div className="glass-card animate-fade" style={{ width: '100%', maxWidth: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 className="modal-title">
                                {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label className="modal-label">Nombre (Ej: GRUPO BPT)</label>
                                <input
                                    type="text"
                                    value={nombre}
                                    onChange={e => setNombre(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                />
                            </div>
                            <div>
                                <label className="modal-label">Razón Social</label>
                                <input
                                    type="text"
                                    value={razonSocial}
                                    onChange={e => setRazonSocial(e.target.value)}
                                    required
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                />
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
