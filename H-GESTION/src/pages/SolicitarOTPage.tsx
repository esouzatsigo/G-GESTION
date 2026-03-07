import React, { useState, useEffect } from 'react';
import { Send, X, AlertCircle, UploadCloud, CheckCircle, Clock, Users, Calendar, Camera } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getEquipos, createOT } from '../services/dataService';
import { storage } from '../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { CameraModal } from '../components/CameraModal';
import { useNotification } from '../context/NotificationContext';
import type { Equipo, WorkOrder } from '../types';

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
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const familias: Equipo['familia'][] = ['Aires', 'Coccion', 'Refrigeracion', 'Cocina', 'Restaurante', 'Local'];

    useEffect(() => {
        if (familia && user?.sucursalesPermitidas[0]) {
            setLoading(true);
            getEquipos(user.sucursalesPermitidas[0], familia).then(setEquipos).finally(() => setLoading(false));
        }
    }, [familia, user]);

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
        if (tempFiles.length === 0) {
            showNotification("Debe adjuntar al menos una fotografía de evidencia.", "warning");
            return;
        }

        console.log("Iniciando envío de solicitud OT...", { equipoId, familia });
        setSubmitting(true);

        try {
            // 1. Subir fotos a Firebase Storage
            console.log(`Subiendo ${tempFiles.length} fotos de evidencia...`);
            const photoUrls = await Promise.all(tempFiles.map(async (file, index) => {
                const storageRef = ref(storage, `evidencia_gerente/${Date.now()}_${index}_${file.name}`);
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
                clienteId: user.clientId,
                sucursalId: user.sucursalesPermitidas?.[0] || 'SIN_SUCURSAL',
                equipoId,
                descripcionFalla,
                justificacion,
                fotosGerente: photoUrls
            };

            const result = await createOT(newOT);
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Familia de Equipo *</label>
                        <select
                            value={familia} onChange={e => { setFamilia(e.target.value as any); setEquipoId(''); }} required
                            style={{ width: '100%', padding: '0.875rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                        >
                            <option value="">Seleccione Familia...</option>
                            {familias.map(f => <option key={f} value={f}>{f}</option>)}
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
                    <label style={{ display: 'block', marginBottom: '1rem', fontSize: '0.875rem', fontWeight: '600' }}>Evidencia Fotográfica * (Mínimo 1)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                        {previewUrls.map((url, i) => (
                            <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                                <img src={url} alt="Evidencia" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                    background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(10px)',
                    zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
                }}>
                    <div className="glass-card animate-scale-up" style={{
                        maxWidth: '550px', width: '100%', textAlign: 'center', padding: '3rem',
                        border: '1px solid var(--accent)', boxShadow: '0 0 50px rgba(37, 99, 235, 0.2)'
                    }}>
                        <div style={{ color: '#22c55e', marginBottom: '1.5rem' }}>
                            <CheckCircle size={80} style={{ margin: '0 auto' }} />
                        </div>

                        <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '1rem', color: 'white' }}>
                            ¡ORDEN REGISTRADA!
                        </h2>

                        <div style={{
                            background: 'rgba(37, 99, 235, 0.1)', padding: '1.5rem', borderRadius: '16px',
                            marginBottom: '2rem', border: '1px solid rgba(37, 99, 235, 0.3)'
                        }}>
                            <p style={{ fontSize: '1.25rem', color: 'var(--accent)', fontWeight: '700', marginBottom: '0.5rem' }}>
                                Orden de Trabajo #: {lastOTNumber}
                            </p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6' }}>
                                Tu solicitud ha sido guardada correctamente en el sistema.
                            </p>
                        </div>

                        <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2.5rem' }}>
                            <p style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#fbbf24', fontWeight: '600' }}>
                                <Clock size={20} /> NOTA IMPORTANTE:
                            </p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', lineHeight: '1.6' }}>
                                Desde este momento, la orden aparecerá como <strong style={{ color: 'white' }}>PENDIENTE</strong> en el panel del Coordinador para su revisión.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', fontSize: '0.875rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                                    <Users size={16} /> Asignación de Técnico
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                                    <AlertCircle size={16} /> Definición de Prioridad
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                                    <Calendar size={16} /> Fecha de Atención
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '1.25rem', fontSize: '1.1rem', fontWeight: '700', borderRadius: '16px' }}
                        >
                            ACEPTAR Y CONTINUAR
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
