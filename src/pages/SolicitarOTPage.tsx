import React, { useState, useEffect } from 'react';
import { Send, X, AlertCircle, UploadCloud, CheckCircle, Clock, Camera } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { createOT } from '../services/dataService';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { tenantStoragePath } from '../services/tenantContext';
import { CameraModal } from '../components/CameraModal';
import { useNotification } from '../context/NotificationContext';
import { getCatalogos } from '../services/dataService';
import type { Equipo, WorkOrder, Sucursal } from '../types';

export const SolicitarOTPage: React.FC = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastOTNumber, setLastOTNumber] = useState<number | null>(null);

    // Form State
    const [familia, setFamilia] = useState<Equipo['familia'] | ''>('');
    const [equipoId, setEquipoId] = useState('');
    const [descripcionFalla, setDescripcionFalla] = useState('');
    const [justificacion, setJustificacion] = useState('');
    const [tempFiles, setTempFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [selectedKardexPhotos, setSelectedKardexPhotos] = useState<string[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [selectedSucursalId, setSelectedSucursalId] = useState('');
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [familiasCatalogo, setFamiliasCatalogo] = useState<any[]>([]);

    // Cargar Catálogos (Familias)
    useEffect(() => {
        if (!user) return;
        const loadCats = async () => {
            const { getFamilias } = await import('../services/dataService');
            const [cats, fams] = await Promise.all([
                getCatalogos(user.clienteId),
                getFamilias(user.clienteId)
            ]);

            // Unir catálogos antiguos (con categoria Familia) y la nueva colección familias
            const legacyFams = cats.filter(c => c.categoria === 'Familia');
            const allFams = [...legacyFams, ...fams];

            setFamiliasCatalogo(allFams.sort((a, b) => a.nombre.localeCompare(b.nombre)));
        };
        loadCats();
    }, [user]);

    // Cargar Sucursales Permitidas
    useEffect(() => {
        if (!user) return;
        const loadSucs = async () => {
            const { getSucursales } = await import('../services/dataService');
            const data = await getSucursales(user.clienteId);

            // Si el usuario no es Admin/Coord de TODAS, filtrar por las que tiene permitidas
            const permitidas = user.sucursalesPermitidas || [];
            if (permitidas.includes('TODAS')) {
                setSucursales(data);
                if (data.length > 0) setSelectedSucursalId(data[0].id);
            } else {
                const filtered = data.filter(s => permitidas.includes(s.id));
                setSucursales(filtered);
                if (filtered.length > 0) setSelectedSucursalId(filtered[0].id);
            }
        };
        loadSucs();
    }, [user]);

    // Cargar Equipos Filtrados
    useEffect(() => {
        if (familia && selectedSucursalId) {
            setLoading(true);
            const loadEq = async () => {
                const { getEquipos } = await import('../services/dataService');
                const data = await getEquipos(selectedSucursalId, familia, user?.clienteId);
                setEquipos(data);
            }
            loadEq().finally(() => setLoading(false));
        } else {
            setEquipos([]);
        }
    }, [familia, selectedSucursalId, user?.clienteId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setTempFiles(prev => [...prev, ...files]);
            const urls = files.map(file => URL.createObjectURL(file));
            setPreviewUrls(prev => [...prev, ...urls]);
        }
    };

    const removeFile = (index: number) => {
        setTempFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        // VALIDACIÓN DE CAMPOS MANDATORIOS
        if (!familia) {
            showNotification("Seleccione una familia de equipo.", "warning");
            return;
        }
        if (!equipoId) {
            showNotification("Seleccione el equipo específico que presenta la falla.", "warning");
            return;
        }
        if (!descripcionFalla.trim()) {
            showNotification("La descripción de la falla es obligatoria.", "warning");
            return;
        }
        if (!justificacion.trim()) {
            showNotification("Debe incluir una justificación para el servicio.", "warning");
            return;
        }
        if (tempFiles.length === 0 && selectedKardexPhotos.length === 0) {
            showNotification("Debe adjuntar al menos una fotografía de evidencia (Cámara, Galería o Kardex).", "warning");
            return;
        }

        console.log("Iniciando envío de solicitud OT...", { equipoId, familia });
        setSubmitting(true);

        try {
            // 1. Subir fotos a Firebase Storage
            console.log(`Subiendo ${tempFiles.length} fotos de evidencia...`);
            const photoUrls = await Promise.all(tempFiles.map(async (file, index) => {
                const storageRef = ref(storage, tenantStoragePath(user, `evidencia_gerente/${Date.now()}_${index}_${file.name}`));
                const snapshot = await uploadBytes(storageRef, file);
                const url = await getDownloadURL(snapshot.ref);
                return url;
            }));

            // 2. Crear OT en Firestore (Atómico)
            const newOT: Omit<WorkOrder, 'id' | 'numero'> = {
                tipo: 'Correctivo',
                estatus: 'Pendiente',
                fechas: {
                    solicitada: new Date().toISOString()
                },
                solicitanteId: user.id,
                clienteId: user.clienteId,
                sucursalId: selectedSucursalId,
                equipoId,
                descripcionFalla,
                justificacion,
                fotosGerente: [...selectedKardexPhotos, ...photoUrls]
            };

            const result = await createOT(newOT, user);
            console.log("Orden de Trabajo creada exitosamente:", result);

            setLastOTNumber(result.numero);
            setShowSuccessModal(true);

            // Reset Form
            setSubmitting(false);
            setFamilia('');
            setEquipoId('');
            setDescripcionFalla('');
            setJustificacion('');
            setTempFiles([]);
            setPreviewUrls([]);

        } catch (error: any) {
            console.error("Error durante el envío de la OT:", error);
            setSubmitting(false);
            showNotification(`Error al crear la solicitud: ${error.message || 'Error desconocido'}`, "error");
        }
    };

    return (
        <div className="animate-fade" style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <div style={{ display: 'inline-flex', padding: '1rem', borderRadius: '50%', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', marginBottom: '1rem' }}>
                    <AlertCircle size={32} />
                </div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: '800' }}>Solicitar OT Correctiva</h1>
                <p style={{ color: 'var(--text-muted)' }}>Describe la falla y anexa evidencia fotográfica para asignación de técnico.</p>
            </div>

            <form onSubmit={handleSubmit} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Sucursal *</label>
                        <select
                            value={selectedSucursalId}
                            onChange={e => { setSelectedSucursalId(e.target.value); setEquipoId(''); }}
                            required
                            style={{ width: '100%', padding: '0.875rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                        >
                            <option value="">Seleccione Sucursal...</option>
                            {sucursales.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Familia de Equipo *</label>
                        <select
                            value={familia} onChange={e => { setFamilia(e.target.value as any); setEquipoId(''); }} required
                            style={{ width: '100%', padding: '0.875rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontWeight: '600' }}
                        >
                            <option value="">Seleccione Familia...</option>
                            {familiasCatalogo.map(f => (
                                <option key={f.id} value={f.nomenclatura || f.nombre} style={{ color: 'black' }}>
                                    {f.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Equipo Específico *</label>
                        <select
                            value={equipoId} onChange={e => setEquipoId(e.target.value)} required
                            disabled={!familia || loading}
                            style={{ width: '100%', padding: '0.875rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                        >
                            <option value="">{loading ? 'Cargando...' : 'Seleccione Equipo...'}</option>
                            {equipos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Descripción de la Falla *</label>
                    <textarea
                        value={descripcionFalla} onChange={e => setDescripcionFalla(e.target.value)}
                        placeholder="Ej: El refrigerador no enfría adecuadamente, se escucha un ruido extraño..."
                        maxLength={250} required
                        style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', minHeight: '100px', resize: 'vertical' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Justificación del Servicio *</label>
                    <textarea
                        value={justificacion} onChange={e => setJustificacion(e.target.value)}
                        placeholder="Ej: Afecta directamente la conservación de insumos críticos..."
                        required
                        style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', minHeight: '80px', resize: 'vertical' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '1.5rem', fontSize: '1.55rem', fontWeight: '600' }}>EVIDENCIA DOCUMENTAL</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                        {previewUrls.map((url, i) => (
                            <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                                <img src={url} alt="Evidencia" style={{ width: '100%', height: '100%', objectFit: 'cover', imageOrientation: 'from-image' }} />
                                <button
                                    type="button" onClick={() => removeFile(i)}
                                    style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', borderRadius: '50%', padding: '4px', cursor: 'pointer' }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => setIsCameraOpen(true)}
                                style={{
                                    flex: 1, borderRadius: '12px', border: '1px solid var(--glass-border)',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent)', padding: '0.5rem'
                                }}
                            >
                                <Camera size={20} />
                                <span style={{ fontSize: '0.6rem', marginTop: '4px', fontWeight: '800' }}>CÁMARA</span>
                            </button>
                            <label style={{
                                flex: 1, borderRadius: '12px', border: '1px solid var(--glass-border)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: 'var(--text-muted)', padding: '0.5rem', background: 'var(--bg-input)'
                            }}>
                                <UploadCloud size={20} />
                                <span style={{ fontSize: '0.6rem', marginTop: '4px', fontWeight: '700' }}>GALERÍA</span>
                                <input
                                    type="file" multiple accept="image/*"
                                    onChange={handleFileChange} style={{ display: 'none' }}
                                />
                            </label>
                        </div>
                    </div>
                </div>

                <button
                    type="submit" className="btn btn-primary"
                    disabled={submitting || !equipoId}
                    style={{ padding: '1.25rem', marginTop: '1rem', fontSize: '1.1rem', fontWeight: '700' }}
                >
                    {submitting ? 'Enviando Solicitud...' : 'Enviar Orden de Trabajo'}
                    {!submitting && <Send size={20} />}
                </button>
            </form>

            {/* Success Modal */}
            {showSuccessModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(5, 5, 5, 0.95)', backdropFilter: 'blur(20px)',
                    zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
                }}>
                    <div className="glass-card animate-scale-up" style={{
                        maxWidth: '600px', width: '100%', textAlign: 'center', padding: '4rem 3rem',
                        border: '2px solid var(--accent)', boxShadow: '0 0 80px rgba(37, 99, 235, 0.4)',
                        position: 'relative', overflow: 'hidden'
                    }}>
                        {/* Efecto de fondo premium */}
                        <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)', zIndex: -1 }}></div>

                        <div className="animate-bounce-subtle" style={{ color: '#22c55e', marginBottom: '2rem' }}>
                            <CheckCircle size={100} style={{ margin: '0 auto', filter: 'drop-shadow(0 0 20px rgba(34,197,94,0.5))' }} />
                        </div>

                        <h2 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '1.5rem', color: 'white', letterSpacing: '-1px' }}>
                            ¡REPORTE EXITOSO!
                        </h2>

                        <div style={{
                            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(37, 99, 235, 0.05) 100%)',
                            padding: '2.5rem', borderRadius: '24px',
                            marginBottom: '2.5rem', border: '1px solid rgba(37, 99, 235, 0.4)',
                            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)'
                        }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem', fontWeight: '600' }}>
                                Folio de Seguimiento
                            </p>
                            <p style={{ fontSize: '3rem', color: 'var(--accent)', fontWeight: '900', marginBottom: '1rem', textShadow: '0 0 15px rgba(37,99,235,0.3)' }}>
                                #{lastOTNumber}
                            </p>
                            <div style={{ height: '2px', background: 'rgba(255,255,255,0.1)', width: '60px', margin: '1.5rem auto' }}></div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', lineHeight: '1.6', fontWeight: '500' }}>
                                La solicitud ha sido registrada con éxito y ya es visible para el Coordinador.
                            </p>
                        </div>

                        <div style={{ textAlign: 'left', background: 'rgba(245, 158, 11, 0.05)', padding: '2rem', borderRadius: '20px', marginBottom: '3rem', borderLeft: '5px solid #F59E0B' }}>
                            <p style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', color: '#F59E0B', fontWeight: '800', fontSize: '1.1rem' }}>
                                <Clock size={24} /> PRÓXIMOS PASOS
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }}></div>
                                    Validación de impacto operativo
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }}></div>
                                    Asignación de técnico especializado
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'rgba(255,255,255,0.7)' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#F59E0B' }}></div>
                                    Notificación de visita programada
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="btn btn-primary animate-pulse-subtle"
                            style={{
                                width: '100%', padding: '1.5rem', fontSize: '1.25rem', fontWeight: '800',
                                borderRadius: '20px', boxShadow: '0 10px 30px rgba(37, 99, 235, 0.4)',
                                border: 'none', cursor: 'pointer', transition: 'all 0.3s'
                            }}
                        >
                            ENTENDIDO Y CERRAR
                        </button>
                    </div>
                </div>
            )}

            {isCameraOpen && (
                <CameraModal
                    onCapture={(blob) => {
                        const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
                        setTempFiles(prev => [...prev, file]);
                        setPreviewUrls(prev => [...prev, URL.createObjectURL(file)]);
                    }}
                    onClose={() => setIsCameraOpen(false)}
                />
            )}
        </div>
    );
};
