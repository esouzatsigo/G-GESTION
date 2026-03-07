import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { Camera, CheckCircle2, ChevronLeft, AlertCircle, Loader2, UploadCloud, RotateCcw } from 'lucide-react';
import type { WorkOrder, Equipo } from '../types';
import { SignaturePad } from '../components/SignaturePad';
import { CameraModal } from '../components/CameraModal';
import { useNotification } from '../context/NotificationContext';

export const EjecucionServicioPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [ot, setOt] = useState<WorkOrder | null>(null);
    const [equipo, setEquipo] = useState<Equipo | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { showNotification } = useNotification();

    // Form State (URLs from DB or local Files)
    const [fotoAntesUrl, setFotoAntesUrl] = useState<string | null>(null);
    const [fotoDespuesUrl, setFotoDespuesUrl] = useState<string | null>(null);
    const [fotoExtraUrl, setFotoExtraUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState<{ [key: string]: boolean }>({});

    const [descripcionTecnica, setDescripcionTecnica] = useState('');
    const [repuestosUtilizados, setRepuestosUtilizados] = useState('');
    const [firmaTecnico, setFirmaTecnico] = useState<string | null>(null);
    const [firmaCliente, setFirmaCliente] = useState<string | null>(null);
    const [comentariosCliente, setComentariosCliente] = useState('');

    // Camera Modal state
    const [cameraOpen, setCameraOpen] = useState<{ open: boolean, field: string | null }>({ open: false, field: null });

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            try {
                const otDoc = await getDoc(doc(db, 'ordenesTrabajo', id));
                if (otDoc.exists()) {
                    const otData = { id: otDoc.id, ...otDoc.data() } as WorkOrder;
                    setOt(otData);
                    setDescripcionTecnica(otData.descripcionServicio || '');
                    setRepuestosUtilizados(otData.repuestosUtilizados || '');
                    setFotoAntesUrl(otData.fotoAntes || null);
                    setFotoDespuesUrl(otData.fotoDespues || null);
                    setFotoExtraUrl(otData.fotoExtra || null);
                    setFirmaTecnico(otData.firmaTecnico || null);
                    setFirmaCliente(otData.firmaCliente || null);
                    setComentariosCliente(otData.comentariosCliente || '');
                    const eqDoc = await getDoc(doc(db, 'equipos', otData.equipoId));
                    if (eqDoc.exists()) setEquipo(eqDoc.data() as Equipo);
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        loadData();
    }, [id]);

    // Auto-save technical description and spare parts
    useEffect(() => {
        if (!ot || loading) return;
        const timer = setTimeout(async () => {
            if (descripcionTecnica !== ot.descripcionServicio || repuestosUtilizados !== ot.repuestosUtilizados) {
                try {
                    await updateDoc(doc(db, 'ordenesTrabajo', ot.id), {
                        descripcionServicio: descripcionTecnica,
                        repuestosUtilizados: repuestosUtilizados
                    });
                    // Update local state to avoid loop
                    setOt(prev => prev ? { ...prev, descripcionServicio: descripcionTecnica, repuestosUtilizados } : null);
                } catch (e) { console.error("Error auto-saving:", e); }
            }
        }, 1500);
        return () => clearTimeout(timer);
    }, [descripcionTecnica, repuestosUtilizados, ot, loading]);

    const handleUpload = async (file: File, path: string) => {
        const storageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        return getDownloadURL(snapshot.ref);
    };

    const handleImmediatePhotoUpload = async (file: File, field: 'fotoAntes' | 'fotoDespues' | 'fotoExtra') => {
        if (!ot) return;
        setIsUploading(prev => ({ ...prev, [field]: true }));
        try {
            const path = `servicios/${field.replace('foto', '').toLowerCase()}`;
            const url = await handleUpload(file, path);

            // Update Firestore immediately
            await updateDoc(doc(db, 'ordenesTrabajo', ot.id), {
                [field]: url
            });

            // Update local state
            if (field === 'fotoAntes') setFotoAntesUrl(url);
            if (field === 'fotoDespues') setFotoDespuesUrl(url);
            if (field === 'fotoExtra') setFotoExtraUrl(url);

            setOt(prev => prev ? { ...prev, [field]: url } : null);
        } catch (error) {
            console.error("Error uploading photo:", error);
            showNotification("Error al subir la imagen.", "error");
        } finally {
            setIsUploading(prev => ({ ...prev, [field]: false }));
        }
    };

    const dataURLtoBlob = (dataurl: string) => {
        const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)![1];
        const bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        let i = n;
        while (i--) u8arr[i] = bstr.charCodeAt(i);
        return new Blob([u8arr], { type: mime });
    };

    const handleTecnicoClosure = async () => {
        if (!ot) return;

        // VALIDACIÓN DE CAMPOS MANDATORIOS
        if (!descripcionTecnica.trim()) {
            showNotification("La descripción del trabajo realizado es obligatoria.", "warning");
            return;
        }
        if (!fotoAntesUrl) {
            showNotification("Debe cargar la fotografía de evidencia 'ANTES'.", "warning");
            return;
        }
        if (!fotoDespuesUrl) {
            showNotification("Debe cargar la fotografía de evidencia 'DESPUÉS'.", "warning");
            return;
        }
        if (!firmaTecnico) {
            showNotification("La firma del técnico es obligatoria para concluir su parte.", "warning");
            return;
        }

        setSubmitting(true);
        try {
            const urlFirmaTec = await handleUpload(dataURLtoBlob(firmaTecnico) as any, 'servicios/firmas/tecnico');

            const now = new Date();
            await updateDoc(doc(db, 'ordenesTrabajo', ot.id), {
                estatus: 'Concluida. Pendiente Firma Cliente',
                'fechas.concluidaTecnico': now.toISOString(),
                fotoAntes: fotoAntesUrl,
                fotoDespues: fotoDespuesUrl,
                fotoExtra: fotoExtraUrl,
                firmaTecnico: urlFirmaTec,
                descripcionServicio: descripcionTecnica,
                repuestosUtilizados
            });

            // Update local state to show message and lock fields
            const updatedOT: WorkOrder = {
                ...ot,
                estatus: 'Concluida. Pendiente Firma Cliente',
                fechas: { ...ot.fechas, concluidaTecnico: now.toISOString() }
            };
            setOt(updatedOT);

            showNotification("Parte técnica concluida. Por favor, notifique al cliente que el servicio está listo para su revisión y firma de conformidad.", "info");
        } catch (error) {
            console.error(error);
            showNotification("Error al concluir la parte técnica.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleFinalClosure = async () => {
        if (!ot) return;

        // VALIDACIÓN DE CAMPOS MANDATORIOS
        if (!comentariosCliente.trim()) {
            showNotification("Los comentarios del cliente son obligatorios para el cierre.", "warning");
            return;
        }
        if (!firmaCliente) {
            showNotification("La firma de conformidad del cliente es obligatoria.", "warning");
            return;
        }

        setSubmitting(true);
        try {
            const urlFirmaCli = await handleUpload(dataURLtoBlob(firmaCliente) as any, 'servicios/firmas/cliente');

            const now = new Date();
            const dateStr = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

            await updateDoc(doc(db, 'ordenesTrabajo', ot.id), {
                estatus: 'Concluida',
                'fechas.concluida': now.toISOString(),
                'fechas.concluidaFecha': dateStr,
                'fechas.concluidaHora': timeStr,
                firmaCliente: urlFirmaCli,
                comentariosCliente: comentariosCliente
            });

            showNotification("Servicio CERRADO formalmente con firma del cliente.", "success");
            navigate('/mis-servicios');
        } catch (error) {
            console.error(error);
            showNotification("Error al realizar el cierre formal.", "error");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando detalles del servicio...</div>;
    if (!ot) return <div style={{ textAlign: 'center', padding: '3rem' }}>Servicio no encontrado.</div>;

    const isLocked = ot.estatus === 'Concluida. Pendiente Firma Cliente' || ot.estatus === 'Concluida' || ot.estatus === 'Terminada';

    const PhotoInput = ({ label, url, field, required }: any) => (
        <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                {label} {required && <span style={{ color: 'var(--priority-alta)' }}>*</span>}
            </label>
            <div style={{
                overflow: 'hidden', position: 'relative', background: 'var(--bg-input)'
            }}>
                {isUploading[field] ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <Loader2 className="animate-spin" size={24} color="var(--primary)" />
                        <span style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: '700' }}>Subiendo...</span>
                    </div>
                ) : url ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <img src={url} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {!isLocked && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (field === 'fotoAntes') setFotoAntesUrl(null);
                                    if (field === 'fotoDespues') setFotoDespuesUrl(null);
                                    if (field === 'fotoExtra') setFotoExtraUrl(null);
                                }}
                                style={{
                                    position: 'absolute', top: '8px', right: '8px',
                                    background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.3)',
                                    color: 'white', padding: '6px 12px', borderRadius: '20px',
                                    fontSize: '0.65rem', fontWeight: '800', display: 'flex',
                                    alignItems: 'center', gap: '6px', cursor: 'pointer',
                                    backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                }}
                            >
                                <RotateCcw size={14} />
                                REPETIR
                            </button>
                        )}
                    </div>
                ) : (
                    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
                        <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => setCameraOpen({ open: true, field })}
                            style={{
                                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                cursor: isLocked ? 'default' : 'pointer', borderRight: '1px solid var(--glass-border)', transition: 'background 0.2s',
                                background: 'transparent', border: 'none', color: 'var(--text-main)', opacity: isLocked ? 0.5 : 1
                            }}
                            onMouseOver={e => !isLocked && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')} onMouseOut={e => !isLocked && (e.currentTarget.style.background = 'transparent')}
                        >
                            <Camera size={24} color="var(--primary)" />
                            <span style={{ fontSize: '0.6rem', marginTop: '6px', fontWeight: '800' }}>CÁMARA</span>
                        </button>
                        <label style={{
                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            cursor: isLocked ? 'default' : 'pointer', transition: 'background 0.2s', opacity: isLocked ? 0.5 : 1
                        }} onMouseOver={e => !isLocked && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')} onMouseOut={e => !isLocked && (e.currentTarget.style.background = 'transparent')}>
                            <UploadCloud size={24} color="var(--text-muted)" />
                            <span style={{ fontSize: '0.6rem', marginTop: '6px', fontWeight: '800', color: 'var(--text-muted)' }}>ARCHIVO</span>
                            <input
                                type="file" accept="image/*"
                                onChange={e => {
                                    if (e.target.files && e.target.files[0]) {
                                        handleImmediatePhotoUpload(e.target.files[0], field);
                                    }
                                }}
                                style={{ display: 'none' }}
                                disabled={isUploading[field] || isLocked}
                            />
                        </label>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="animate-fade mobile-view">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={() => navigate('/mis-servicios')} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)' }}><ChevronLeft size={24} /></button>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Atender OT #{ot.numero}</h1>
                        <span style={{
                            borderRadius: '4px', background: `var(--status-${ot.estatus.toLowerCase().replace(/ /g, '')})`, color: '#ffffff'
                        }}>
                            {ot.estatus}
                        </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{equipo?.nombre}</p>
                </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <PhotoInput label="FOTO ANTES" url={fotoAntesUrl} field="fotoAntes" required />
                    <PhotoInput label="FOTO EXTRA (OPCIONAL)" url={fotoExtraUrl} field="fotoExtra" />
                </div>

                <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,193,7,0.1)', borderRadius: '12px', border: '1px solid rgba(255,193,7,0.2)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <AlertCircle size={18} color="#ffc107" />
                    <p style={{ fontSize: '0.7rem', color: '#ffc107', fontWeight: '600', lineHeight: '1.4' }}>
                        Recuerda que estas fotos serán la base del reporte PDF para el cliente. Asegúrate de que sean claras y profesionales.
                    </p>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Descripción del Trabajo Realizado <span style={{ color: 'var(--priority-alta)' }}>*</span></label>
                    <textarea
                        value={descripcionTecnica} onChange={e => setDescripcionTecnica(e.target.value)} required
                        disabled={isLocked}
                        placeholder="Detalla las acciones tomadas para corregir la falla..."
                        style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', minHeight: '100px', opacity: isLocked ? 0.6 : 1 }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Repuestos / Materiales</label>
                    <textarea
                        value={repuestosUtilizados} onChange={e => setRepuestosUtilizados(e.target.value)}
                        disabled={isLocked}
                        placeholder="Lista de componentes reemplazados (opcional)..."
                        style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', minHeight: '60px', opacity: isLocked ? 0.6 : 1 }}
                    />
                </div>

                <div style={{ width: '50%' }}>
                    <PhotoInput label="FOTO DESPUÉS" url={fotoDespuesUrl} field="fotoDespues" required />
                </div>

                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '700', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', color: 'var(--primary)' }}>BLOQUE 1: CIERRE TÉCNICO</h3>

                    <SignaturePad label="Firma del Técnico" onSave={setFirmaTecnico} required disabled={isLocked} initialImage={firmaTecnico || undefined} />

                    {ot.estatus !== 'Concluida. Pendiente Firma Cliente' && ot.estatus !== 'Concluida' && ot.estatus !== 'Terminada' && (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleTecnicoClosure}
                            disabled={submitting || !fotoAntesUrl || !fotoDespuesUrl || !firmaTecnico || !descripcionTecnica.trim()}
                            style={{ padding: '1.25rem', marginTop: '0.5rem', background: 'var(--status-iniciada)' }}
                        >
                            {submitting ? 'Registrando...' : 'CONCLUIR SERVICIO Y FIRMAR'}
                            {!submitting && <CheckCircle2 size={20} />}
                        </button>
                    )}
                </div>

                {ot.estatus === 'Concluida. Pendiente Firma Cliente' && (
                    <div style={{ padding: '1.5rem', background: 'rgba(34,197,94,0.1)', borderRadius: '16px', border: '2px solid rgba(34,197,94,0.3)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <AlertCircle size={32} color="#22c55e" />
                        <div>
                            <h4 style={{ fontWeight: '800', color: '#22c55e' }}>¡TRABAJO CONCLUIDO POR TÉCNICO!</h4>
                            <p style={{ fontSize: '0.85rem' }}>Por favor, notifique al cliente que el trabajo está terminado y que solo requiere sus comentarios y firma para el cierre formal del servicio.</p>
                        </div>
                    </div>
                )}

                {(ot.estatus === 'Concluida. Pendiente Firma Cliente' || ot.estatus === 'Concluida' || ot.estatus === 'Terminada') && (
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: '700', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', color: 'var(--accent)' }}>BLOQUE 2: CONFORMIDAD DEL CLIENTE</h3>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600' }}>Comentarios del Cliente <span style={{ color: 'var(--priority-alta)' }}>*</span></label>
                            <textarea
                                value={comentariosCliente} onChange={e => setComentariosCliente(e.target.value)}
                                disabled={ot.estatus === 'Concluida' || ot.estatus === 'Terminada'}
                                placeholder="Escriba aquí los comentarios del cliente sobre el servicio recibido..."
                                style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', minHeight: '80px', marginBottom: '1rem' }}
                            />
                            <SignaturePad
                                label="Firma de Conformidad Cliente"
                                onSave={setFirmaCliente}
                                required
                                disabled={ot.estatus === 'Concluida' || ot.estatus === 'Terminada'}
                                initialImage={firmaCliente || undefined}
                            />
                        </div>

                        {ot.estatus === 'Concluida. Pendiente Firma Cliente' && (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleFinalClosure}
                                disabled={submitting || !firmaCliente || !comentariosCliente.trim()}
                                style={{ padding: '1.25rem', marginTop: '1rem', background: 'var(--status-concluida)' }}
                            >
                                {submitting ? 'Cerrando...' : 'Cerrar Orden con Firma Cliente'}
                                {!submitting && <CheckCircle2 size={20} />}
                            </button>
                        )}
                    </div>
                )}
            </div>

            {cameraOpen.open && (
                <CameraModal
                    onCapture={(blob) => handleImmediatePhotoUpload(blob as File, cameraOpen.field as any)}
                    onClose={() => setCameraOpen({ open: false, field: null })}
                    title={`Capturar ${cameraOpen.field?.replace('foto', '').toUpperCase()}`}
                />
            )}
        </div>
    );
};
