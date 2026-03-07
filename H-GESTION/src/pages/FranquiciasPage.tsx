import React, { useEffect, useState, useCallback } from 'react';
import { Plus, Edit2, Search, Save, X, Building2, Globe, Image as ImageIcon, ExternalLink, Loader2, Clipboard, Store } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { getFranquicias, getClientes } from '../services/dataService';
import { db, storage } from '../services/firebase';
import { addDoc, collection, doc, updateDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Franquicia, Cliente, Sucursal, Equipo } from '../types';

export const FranquiciasPage: React.FC = () => {
    const [franquicias, setFranquicias] = useState<Franquicia[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFranquicia, setEditingFranquicia] = useState<Franquicia | null>(null);
    const { showNotification } = useNotification();

    // Form State
    const [clienteId, setClienteId] = useState('');
    const [nombre, setNombre] = useState('');
    const [sitioWeb, setSitioWeb] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoUrl, setLogoUrl] = useState('');
    const [colorFondo, setColorFondo] = useState('#FFFFFF');
    const [uploading, setUploading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [fData, cData] = await Promise.all([getFranquicias(), getClientes()]);
            // Also fetch sucursales and equipos for stats
            const sSnapshot = await getDocs(collection(db, 'sucursales'));
            const eSnapshot = await getDocs(collection(db, 'equipos'));

            setFranquicias(fData);
            setClientes(cData);
            setSucursales(sSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Sucursal)));
            setEquipos(eSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Equipo)));
        } catch (error) {
            console.error(error);
            showNotification("Error al cargar datos.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (franquicia?: Franquicia) => {
        if (franquicia) {
            setEditingFranquicia(franquicia);
            setClienteId(franquicia.clienteId);
            setNombre(franquicia.nombre);
            setSitioWeb(franquicia.sitioWeb || '');
            setLogoUrl(franquicia.logoUrl || '');
            setColorFondo(franquicia.colorFondo || '#FFFFFF');
        } else {
            setEditingFranquicia(null);
            setClienteId('');
            setNombre('');
            setSitioWeb('');
            setLogoUrl('');
            setColorFondo('#FFFFFF');
        }
        setLogoFile(null);
        setIsModalOpen(true);
    };

    // Intelligent Background Detection
    const analyzeLogo = useCallback((url: string) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let r = 0, g = 0, b = 0, count = 0;

            for (let i = 0; i < data.length; i += 40) {
                if (data[i + 3] < 128) continue;
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
                count++;
            }

            if (count > 0) {
                r = Math.floor(r / count);
                g = Math.floor(g / count);
                b = Math.floor(b / count);

                // Calculate luminance to decide contrast
                const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

                // If it's a very light/white logo, give it a subtle gray/blue background
                // If it's dark, give it a very light tinted version of its own color
                if (lum > 0.85) {
                    setColorFondo('#F1F5F9'); // Light slate
                } else if (lum < 0.15) {
                    setColorFondo('#FFFFFF'); // Pure white for very dark logos
                } else {
                    // Solid Hex wash: Mix 8% of dominant color with 92% white
                    const mix = (c: number) => Math.floor(c * 0.08 + 255 * 0.92);
                    const toHex = (c: number) => c.toString(16).padStart(2, '0');
                    const finalColor = `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
                    setColorFondo(finalColor.toUpperCase());
                }
            }
        };
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setLogoFile(file);
            const url = URL.createObjectURL(file);
            setLogoUrl(url);
            analyzeLogo(url);
        }
    };

    // Clipboard Paste Handler
    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                if (blob) {
                    setLogoFile(blob);
                    const url = URL.createObjectURL(blob);
                    setLogoUrl(url);
                    analyzeLogo(url);
                    showNotification("Imagen pegada e inteligente aplicada", "success");
                }
            }
        }
    }, [showNotification, analyzeLogo]);

    const uploadLogo = async (file: File): Promise<string> => {
        const storageRef = ref(storage, `franquicias/logos/${Date.now()}_${file.name || 'clipboard.png'}`);
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!clienteId) {
            showNotification("Seleccione un cliente (empresa).", "warning");
            return;
        }
        if (!nombre.trim()) {
            showNotification("El nombre de la franquicia es obligatorio.", "warning");
            return;
        }

        setUploading(true);
        try {
            let currentLogoUrl = logoUrl;
            if (logoFile) {
                currentLogoUrl = await uploadLogo(logoFile);
            }

            const data = {
                clienteId,
                nombre,
                sitioWeb: sitioWeb.trim(),
                logoUrl: currentLogoUrl,
                colorFondo: colorFondo
            };

            if (editingFranquicia) {
                await updateDoc(doc(db, 'franquicias', editingFranquicia.id), data);
                showNotification("Franquicia actualizada correctamente.", "success");
            } else {
                await addDoc(collection(db, 'franquicias'), data);
                showNotification("Franquicia creada correctamente.", "success");
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error(error);
            showNotification("Error al guardar la franquicia.", "error");
        } finally {
            setUploading(false);
        }
    };

    const filteredFranquicias = franquicias.filter(f =>
        f.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="animate-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Catálogo de Franquicias</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Gestiona las marcas y su identidad corporativa.</p>
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ gap: '0.75rem' }}>
                    <Plus size={20} /> NUEVA FRANQUICIA
                </button>
            </div>

            <div className="glass-card" style={{ marginBottom: '2rem' }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre de franquicia..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', outline: 'none' }}
                    />
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando franquicias...</div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '2rem' }}>
                    {filteredFranquicias.map(franquicia => {
                        const cliente = clientes.find(c => c.id === franquicia.clienteId);
                        const sucsCount = sucursales.filter(s => s.franquiciaId === franquicia.id).length;
                        const eqsCount = equipos.filter(e => e.franquiciaId === franquicia.id).length;

                        return (
                            <div key={franquicia.id} className="glass-card animate-fade" style={{
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '1.75rem',
                                border: '1px solid rgba(255,255,255,0.08)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {/* Header Info */}
                                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                    <div style={{
                                        width: '120px', height: '120px',
                                        background: franquicia.colorFondo || '#FFFFFF',
                                        borderRadius: '32px',
                                        padding: '16px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 12px 30px -8px rgba(0,0,0,0.4)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        flexShrink: 0,
                                        position: 'relative',
                                        zIndex: 1
                                    }}>
                                        {franquicia.logoUrl ? (
                                            <img src={franquicia.logoUrl} alt={franquicia.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        ) : (
                                            <Building2 size={48} color="#94a3b8" />
                                        )}
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ flex: 1 }}>
                                                <h3 style={{
                                                    fontSize: '1.75rem',
                                                    fontWeight: '950',
                                                    letterSpacing: '-0.04em',
                                                    lineHeight: '1',
                                                    color: 'var(--text-main)',
                                                    marginBottom: '0.4rem'
                                                }}>
                                                    {franquicia.nombre}
                                                </h3>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--primary)' }}></span>
                                                    <p style={{
                                                        fontSize: '0.75rem',
                                                        color: 'var(--text-muted)',
                                                        fontWeight: '800',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.1em'
                                                    }}>
                                                        {cliente?.nombre || 'CLIENTE SIN ASIGNAR'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleOpenModal(franquicia)}
                                                style={{
                                                    background: 'var(--bg-switch)',
                                                    border: '1px solid var(--glass-border)',
                                                    color: 'var(--text-main)',
                                                    padding: '0.6rem',
                                                    borderRadius: '14px',
                                                    cursor: 'pointer',
                                                    marginLeft: '0.5rem'
                                                }}
                                                className="hover:bg-primary transition-all"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                        </div>

                                        {/* Quick Stats in Header */}
                                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ fontSize: '1.125rem', fontWeight: '900', color: 'var(--text-main)', lineHeight: '1' }}>{sucsCount}</p>
                                                <p style={{ fontSize: '0.6rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sucursales</p>
                                            </div>
                                            <div style={{ width: '1px', background: 'var(--glass-border)', height: '24px' }}></div>
                                            <div style={{ textAlign: 'center' }}>
                                                <p style={{ fontSize: '1.125rem', fontWeight: '900', color: 'var(--text-main)', lineHeight: '1' }}>{eqsCount}</p>
                                                <p style={{ fontSize: '0.6rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Equipos</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Website Section */}
                                {franquicia.sitioWeb && (
                                    <a
                                        href={franquicia.sitioWeb}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            marginTop: '1.25rem',
                                            padding: '1rem',
                                            background: 'var(--bg-glass)',
                                            borderRadius: '16px',
                                            border: '1px solid var(--glass-border)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            textDecoration: 'none'
                                        }}
                                        className="hover:bg-primary/10 transition-all"
                                    >
                                        <Globe size={18} color="var(--primary-light)" />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.1rem' }}>Sitio Web Oficial</p>
                                            <p style={{
                                                fontSize: '0.85rem',
                                                color: 'var(--primary-light)',
                                                fontWeight: '600',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {franquicia.sitioWeb.replace(/^https?:\/\//, '')}
                                            </p>
                                        </div>
                                        <ExternalLink size={16} style={{ opacity: 0.4 }} />
                                    </a>
                                )}

                                {/* Branches List Section */}
                                <div style={{ marginTop: '1.5rem', flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        <Store size={14} color="var(--text-muted)" />
                                        <span style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sucursales Registradas</span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {sucursales.filter(s => s.franquiciaId === franquicia.id).length > 0 ? (
                                            sucursales.filter(s => s.franquiciaId === franquicia.id).map(s => (
                                                <span key={s.id} style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: '700',
                                                    padding: '0.3rem 0.6rem',
                                                    background: 'var(--bg-switch)',
                                                    border: '1px solid var(--glass-border)',
                                                    borderRadius: '8px',
                                                    color: 'var(--text-main)'
                                                }}>
                                                    {s.nombre}
                                                </span>
                                            ))
                                        ) : (
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin sucursales asignadas</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isModalOpen && (
                <div
                    onPaste={handlePaste}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '1rem', zIndex: 10000
                    }}
                >
                    <div className="glass-card animate-fade" style={{ width: '100%', maxWidth: '500px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 className="modal-title">{editingFranquicia ? 'Editar Franquicia' : 'Nueva Franquicia'}</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer' }}><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                <div
                                    onClick={() => document.getElementById('logo-upload')?.click()}
                                    style={{
                                        width: '160px', height: '160px',
                                        borderRadius: '40px',
                                        background: colorFondo,
                                        border: '2px solid rgba(255,255,255,0.1)',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', overflow: 'hidden', position: 'relative',
                                        padding: '16px',
                                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <>
                                            <ImageIcon size={48} color="#94a3b8" />
                                            <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '1rem', fontWeight: '900', letterSpacing: '0.1em' }}>SUBIR LOGO</span>
                                        </>
                                    )}
                                    <input id="logo-upload" type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                    <Clipboard size={14} />
                                    <span>También puedes pegar una imagen (Ctrl+V)</span>
                                </div>

                                <div style={{ width: '100%', marginTop: '0.5rem' }}>
                                    <label className="modal-label" style={{ opacity: 0.6, fontSize: '0.75rem', letterSpacing: '0.05em' }}>
                                        🎨 Personalizar Fondo (Hex/Color)
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <div style={{
                                            width: '44px', height: '44px', borderRadius: '10px',
                                            background: colorFondo,
                                            border: '1px solid var(--glass-border)',
                                            flexShrink: 0,
                                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                                        }}></div>
                                        <input
                                            type="text"
                                            value={colorFondo}
                                            onChange={e => setColorFondo(e.target.value)}
                                            placeholder="#FFFFFF o transparente"
                                            style={{
                                                flex: 1, padding: '0.75rem', borderRadius: '10px',
                                                border: '1px solid var(--glass-border)',
                                                background: 'var(--bg-input)',
                                                color: 'var(--text-main)',
                                                fontFamily: 'monospace',
                                                fontSize: '0.9rem'
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="modal-label">Empresa (Cliente)</label>
                                <select
                                    value={clienteId} onChange={e => setClienteId(e.target.value)} required
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                >
                                    <option value="" style={{ color: 'black' }}>Seleccione Empresa</option>
                                    {clientes.map(c => <option key={c.id} value={c.id} style={{ color: 'black' }}>{c.nombre}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
                                <div>
                                    <label className="modal-label">Nombre de la Franquicia</label>
                                    <input
                                        type="text" value={nombre} onChange={e => setNombre(e.target.value)}
                                        placeholder="Ej: MB Chicken" required
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                    />
                                </div>
                                <div>
                                    <label className="modal-label">Sitio Web (Opcional)</label>
                                    <div style={{ position: 'relative' }}>
                                        <Globe size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                        <input
                                            type="url" value={sitioWeb} onChange={e => setSitioWeb(e.target.value)}
                                            placeholder="https://www.mbchicken.mx"
                                            style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '10px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                                <button type="button" className="btn" onClick={() => setIsModalOpen(false)} style={{ flex: 1, background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" disabled={uploading} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', fontWeight: '800' }}>
                                    {uploading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    {uploading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
