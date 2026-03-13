import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { trackedUpdateDoc } from '../services/firestoreHelpers';
import { ref, uploadBytes, getDownloadURL, uploadString } from 'firebase/storage';
import { db, storage } from '../services/firebase';
import { Camera, CheckCircle2, ChevronLeft, AlertCircle, Loader2, RotateCcw } from 'lucide-react';
import { updateOTStatus, updateOTWithAudit } from '../services/dataService';
import type { WorkOrder, Equipo, Sucursal } from '../types';
import { SignaturePad } from '../components/SignaturePad';
import { CameraModal } from '../components/CameraModal';
import { UnifiedVoiceInput } from '../components/UnifiedVoiceInput';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../hooks/useAuth';
import { tenantStoragePath } from '../services/tenantContext';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { PhotoMarkupModal } from '../components/PhotoMarkupModal';
import { Navigation, Phone, Edit3 } from 'lucide-react';
import { FamiliaIcon } from '../components/FamiliaIcon';

export const EjecucionServicioPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [ot, setOt] = useState<WorkOrder | null>(null);
    const [equipo, setEquipo] = useState<Equipo | null>(null);
    const [sucursal, setSucursal] = useState<Sucursal | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const { showNotification } = useNotification();
    const [isSynced, setIsSynced] = useState(true);
    const [pendingSync, setPendingSync] = useState(false);

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
    const [audioClienteUrl, setAudioClienteUrl] = useState<string | null>(null);
    const [audioClienteBlob, setAudioClienteBlob] = useState<Blob | null>(null);
    const [audioTecnicoBlob, setAudioTecnicoBlob] = useState<Blob | null>(null);
    const [audioTecnicoUrl, setAudioTecnicoUrl] = useState<string | null>(null);

    // Camera Modal state
    const [cameraOpen, setCameraOpen] = useState<{ open: boolean, field: string | null }>({ open: false, field: null });
    const [markupOpen, setMarkupOpen] = useState<{ open: boolean, field: string | null, url: string | null }>({ open: false, field: null, url: null });

    // Refs for focus flow
    const descripcionRef = useRef<HTMLTextAreaElement>(null);
    const repuestosRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const loadData = async () => {
            if (!id) return;
            try {
                const otDoc = await getDoc(doc(db, 'ordenesTrabajo', id));
                if (!otDoc.exists()) {
                    setLoading(false);
                    return;
                }

                const otData = { id: otDoc.id, ...otDoc.data() } as WorkOrder;
                setOt(otData);

                // CARGA EN PARALELO de Equipo y Sucursal
                const [eqDoc, sucDoc, prefResult] = await Promise.all([
                    getDoc(doc(db, 'equipos', otData.equipoId)),
                    getDoc(doc(db, 'sucursales', otData.sucursalId)),
                    Preferences.get({ key: `ot_progress_${id}` })
                ]);

                if (eqDoc.exists()) setEquipo(eqDoc.data() as Equipo);
                if (sucDoc.exists()) setSucursal({ id: sucDoc.id, ...sucDoc.data() } as Sucursal);

                // Inicializar estados con data de la OT
                setDescripcionTecnica(otData.descripcionServicio || (otData.tipo === 'Preventivo' ? 'MANTENIMIENTO PREVENTIVO REALIZADO SEGÚN PROTOCOLO' : ''));
                setRepuestosUtilizados(otData.repuestosUtilizados || '');
                setFotoAntesUrl(otData.fotoAntes || null);
                setFotoDespuesUrl(otData.fotoDespues || null);
                setFotoExtraUrl(otData.fotoExtra || null);
                setFirmaTecnico(otData.firmaTecnico || null);
                setFirmaCliente(otData.firmaCliente || null);
                setComentariosCliente(otData.comentariosCliente || '');
                setAudioClienteUrl(otData.audioComentarioClienteUrl || null);
                setAudioTecnicoUrl(otData.audioDescripcionServicioUrl || null);

                // Aplicar progreso local si es más reciente
                if (prefResult.value) {
                    const localProgress = JSON.parse(prefResult.value);
                    if (localProgress.ts > (otData.fechas.concluidaTecnico || 0)) {
                        if (localProgress.descripcionServicio) setDescripcionTecnica(localProgress.descripcionServicio);
                        if (localProgress.repuestosUtilizados) setRepuestosUtilizados(localProgress.repuestosUtilizados);
                        if (localProgress.comentariosCliente) setComentariosCliente(localProgress.comentariosCliente);
                    }
                }

                // REGLA: SI EL TÉCNICO ENTRA Y ESTÁ EN 'Llegada a Sitio', PASAR A 'Iniciada'
                if (otData.estatus === 'Llegada a Sitio' && user) {
                    console.log("Detectada llegada previa. Registrando inicio de servicio...");
                    await updateOTStatus(otData.id, 'Iniciada', user, {
                        'fechas.iniciada': new Date().toISOString()
                    });
                    setOt(prev => prev ? { ...prev, estatus: 'Iniciada' } : null);
                }
            } catch (e) { 
                console.error("Error loading execution data:", e); 
            } finally { 
                setLoading(false); 
            }
        };
        loadData();
    }, [id, user]);

    // Auto-save technical description, spare parts and client comments
    useEffect(() => {
        if (!ot || loading) return;
        const timer = setTimeout(async () => {
            const hasTechChanges = descripcionTecnica !== ot.descripcionServicio || repuestosUtilizados !== ot.repuestosUtilizados;
            const hasClientChanges = comentariosCliente !== ot.comentariosCliente;

            if (hasTechChanges || hasClientChanges) {
                setPendingSync(true);
                setIsSynced(false);
                try {
                    const updates: any = {};
                    if (hasTechChanges) {
                        updates.descripcionServicio = descripcionTecnica;
                        updates.repuestosUtilizados = repuestosUtilizados;
                    }
                    if (hasClientChanges) {
                        updates.comentariosCliente = comentariosCliente;
                    }

                    await trackedUpdateDoc(doc(db, 'ordenesTrabajo', ot.id), updates);
                    setOt(prev => prev ? { ...prev, ...updates } : null);
                    setIsSynced(true);

                    // SAVE TO LOCAL PREFERENCES TOO
                    await Preferences.set({
                        key: `ot_progress_${id}`,
                        value: JSON.stringify({
                            descripcionServicio: descripcionTecnica,
                            repuestosUtilizados: repuestosUtilizados,
                            comentariosCliente: comentariosCliente,
                            ts: new Date().toISOString()
                        })
                    });
                } catch (e) { 
                    console.error("Error auto-saving:", e);
                } finally {
                    setPendingSync(false);
                }
            }
        }, 2000);
        return () => clearTimeout(timer);
    }, [descripcionTecnica, repuestosUtilizados, comentariosCliente, ot, loading, id]);

    const saveField = async (field: string, value: string) => {
        if (!ot || value === (ot as any)[field]) return;
        try {
            await trackedUpdateDoc(doc(db, 'ordenesTrabajo', ot.id), { [field]: value });
            setOt(prev => prev ? { ...prev, [field]: value } : null);
        } catch (e) {
            console.error(`Error saving ${field}:`, e);
        }
    };

    const handleUpload = async (file: File | Blob, path: string) => {
        if (!user) throw new Error("No autenticado");
        const filename = (file as File).name || 'firma.png';
        const storageRef = ref(storage, tenantStoragePath(user, `${path}/${Date.now()}_${filename}`));
        const snapshot = await uploadBytes(storageRef, file);
        return getDownloadURL(snapshot.ref);
    };

    const handleImmediatePhotoUpload = async (file: File, field: 'fotoAntes' | 'fotoDespues' | 'fotoExtra') => {
        if (!ot) return;
        setIsUploading(prev => ({ ...prev, [field]: true }));
        try {
            const path = `servicios/${field.replace('foto', '').toLowerCase()}`;
            const url = await handleUpload(file, path);

            // Guardar en la DB siempre, ya que updateOTWithAudit no actualizaba `fotoAntes`, `fotoDespues`.
            await trackedUpdateDoc(doc(db, 'ordenesTrabajo', ot.id), { [field]: url });

            // Solo registrar auditoría visual sin depender de que modifique la base de datos
            if (user) {
                await updateOTWithAudit(ot.id, ot, { [field]: url }, user, `Carga de Foto: ${field}`);
            }

            // Update local state
            if (field === 'fotoAntes') setFotoAntesUrl(url);
            if (field === 'fotoDespues') setFotoDespuesUrl(url);
            if (field === 'fotoExtra') setFotoExtraUrl(url);

            setOt(prev => prev ? { ...prev, [field]: url } : null);

            // Focus flow: after FOTO ANTES, scroll to description
            if (field === 'fotoAntes') {
                setTimeout(() => {
                    descripcionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    descripcionRef.current?.focus();
                }, 400);
            }

            // Focus flow: after FOTO DESPUES, scroll to firma tecnico
            if (field === 'fotoDespues') {
                setTimeout(() => {
                    const firmaTecEl = document.getElementById('firma-tecnico');
                    if (firmaTecEl) {
                        firmaTecEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 400);
            }
        } catch (error) {
            console.error("Error uploading photo:", error);
            showNotification("Error al subir la imagen.", "error");
        } finally {
            setIsUploading(prev => ({ ...prev, [field]: false }));
        }
    };

    const handleImmediateBase64Upload = async (base64Str: string, field: 'fotoAntes' | 'fotoDespues' | 'fotoExtra') => {
        if (!ot || !user) return;
        setIsUploading(prev => ({ ...prev, [field]: true }));
        try {
            const path = `servicios/${field.replace('foto', '').toLowerCase()}`;
            const filename = `capture_${Date.now()}.jpg`;
            const storageRef = ref(storage, tenantStoragePath(user, `${path}/${filename}`));
            
            // Subida estricta como base64: arregla bug de archivo vacío en Android WebView
            const snapshot = await uploadString(storageRef, base64Str, 'base64', { contentType: 'image/jpeg' });
            const url = await getDownloadURL(snapshot.ref);

            // Guardado directo asegurado: ya que audit ignoraba campos de foto
            await trackedUpdateDoc(doc(db, 'ordenesTrabajo', ot.id), { [field]: url });
            await updateOTWithAudit(ot.id, ot, { [field]: url }, user, `Carga de Foto (Nativa): ${field}`);

            // Actualizar estado local
            if (field === 'fotoAntes') setFotoAntesUrl(url);
            if (field === 'fotoDespues') setFotoDespuesUrl(url);
            if (field === 'fotoExtra') setFotoExtraUrl(url);

            setOt(prev => prev ? { ...prev, [field]: url } : null);

            // Bajar focus
            if (field === 'fotoAntes') {
                setTimeout(() => { descripcionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); descripcionRef.current?.focus(); }, 400);
            }
            if (field === 'fotoDespues') {
                setTimeout(() => { document.getElementById('firma-tecnico')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 400);
            }
        } catch (error) {
            console.error("Error base64 upload:", error);
            showNotification("Error de conexión, la foto no guardó.", "error");
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

        const isPreventivo = ot.tipo === 'Preventivo';

        // VALIDACIÓN DE CAMPOS MANDATORIOS
        if (!descripcionTecnica.trim() && !isPreventivo) {
            showNotification("La descripción del trabajo realizado es obligatoria.", "warning");
            return;
        }
        if (!fotoAntesUrl && !isPreventivo) {
            showNotification("Debe cargar la fotografía de evidencia 'ANTES'.", "warning");
            return;
        }
        if (!fotoDespuesUrl && !isPreventivo) {
            showNotification("Debe cargar la fotografía de evidencia 'DESPUÉS'.", "warning");
            return;
        }
        if (!firmaTecnico) {
            showNotification("La firma del técnico es obligatoria para concluir su parte.", "warning");
            return;
        }

        setSubmitting(true);
        try {
            let userCoords: { lat: number, lng: number } | undefined;
            
            if (Capacitor.isNativePlatform()) {
                try {
                    const position = await Geolocation.getCurrentPosition({
                        enableHighAccuracy: true,
                        timeout: 10000
                    });
                    userCoords = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                } catch (geoErr) {
                    console.error("Native Geolocation error:", geoErr);
                    // Continue without coords if blocked
                }
            } else if (navigator.geolocation) {
                try {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 5000 });
                    });
                    userCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
                } catch (geoErr) {
                    console.error("Web Geolocation error:", geoErr);
                }
            }

            let urlAudioTec = audioTecnicoUrl;
            if (audioTecnicoBlob) {
                const audioFilename = `audio_tecnico_${ot.numero}_${Date.now()}.webm`;
                const audioStorageRef = ref(storage, tenantStoragePath(user!, `audios/${audioFilename}`));
                const audioSnapshot = await uploadBytes(audioStorageRef, audioTecnicoBlob);
                urlAudioTec = await getDownloadURL(audioSnapshot.ref);
            }

            const urlFirmaTec = await handleUpload(dataURLtoBlob(firmaTecnico) as any, 'servicios/firmas/tecnico');

            const now = new Date();
            if (user) {
                await updateOTStatus(ot.id, 'Concluida. Pendiente Firma Cliente', user, {
                    'fechas.concluidaTecnico': now.toISOString(),
                    fotoAntes: fotoAntesUrl,
                    fotoDespues: fotoDespuesUrl,
                    fotoExtra: fotoExtraUrl,
                    firmaTecnico: urlFirmaTec,
                    coordsFirmaTecnico: userCoords || null, // Guardar coords
                    descripcionServicio: descripcionTecnica,
                    audioDescripcionServicioUrl: urlAudioTec,
                    repuestosUtilizados
                });
            } else {
                await trackedUpdateDoc(doc(db, 'ordenesTrabajo', ot.id), {
                    estatus: 'Concluida. Pendiente Firma Cliente',
                    'fechas.concluidaTecnico': now.toISOString(),
                    fotoAntes: fotoAntesUrl,
                    fotoDespues: fotoDespuesUrl,
                    fotoExtra: fotoExtraUrl,
                    firmaTecnico: urlFirmaTec,
                    coordsFirmaTecnico: userCoords || null, // Guardar coords
                    descripcionServicio: descripcionTecnica,
                    audioDescripcionServicioUrl: urlAudioTec,
                    repuestosUtilizados
                });
            }

            // Update local state to show message and lock fields
            const updatedOT: WorkOrder = {
                ...ot,
                estatus: 'Concluida. Pendiente Firma Cliente',
                fechas: { ...ot.fechas, concluidaTecnico: now.toISOString() },
                firmaTecnico: urlFirmaTec,
                descripcionServicio: descripcionTecnica,
                repuestosUtilizados: repuestosUtilizados,
                fotoAntes: fotoAntesUrl || ot.fotoAntes,
                fotoDespues: fotoDespuesUrl || ot.fotoDespues,
                fotoExtra: fotoExtraUrl || ot.fotoExtra,
                coordsFirmaTecnico: userCoords || ot.coordsFirmaTecnico
            };
            setOt(updatedOT);
            setFirmaTecnico(urlFirmaTec); // Sync signature state too
            setAudioTecnicoUrl(urlAudioTec);

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
        if (!comentariosCliente.trim() && ot.tipo !== 'Preventivo') {
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

            let urlAudioCli = audioClienteUrl;
            if (audioClienteBlob) {
                const audioFilename = `audio_cliente_${ot.numero}.webm`;
                const audioStorageRef = ref(storage, tenantStoragePath(user!, `audios/${audioFilename}`));
                const audioSnapshot = await uploadBytes(audioStorageRef, audioClienteBlob);
                urlAudioCli = await getDownloadURL(audioSnapshot.ref);
            }

            if (user) {
                await updateOTStatus(ot.id, 'Concluida', user, {
                    'fechas.concluida': now.toISOString(),
                    'fechas.concluidaFecha': dateStr,
                    'fechas.concluidaHora': timeStr,
                    firmaCliente: urlFirmaCli,
                    comentariosCliente: comentariosCliente,
                    audioComentarioClienteUrl: urlAudioCli
                });
            }

            // Update local state
            setOt(prev => prev ? {
                ...prev,
                estatus: 'Concluida',
                fechas: {
                    ...prev.fechas,
                    concluida: now.toISOString(),
                    concluidaFecha: dateStr,
                    concluidaHora: timeStr
                },
                firmaCliente: urlFirmaCli,
                comentariosCliente: comentariosCliente
            } : null);
            setFirmaCliente(urlFirmaCli);

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

    const isLocked = ot.estatus === 'Concluida' || ot.estatus === 'Finalizada';
    // isTechnicalLocked: true si ya pasó el cierre técnico (Bloque 1)
    const isTechnicalLocked = ot.estatus === 'Concluida. Pendiente Firma Cliente' || isLocked;

    const PhotoInput = ({ label, url, field, required }: any) => (
        <div style={{ width: '100%', flex: 'none', boxSizing: 'border-box' }}>
            <label className="mobile-label">
                {label} {required && <span style={{ color: 'var(--priority-alta)' }}>*</span>}
            </label>
            <div style={{
                overflow: 'hidden',
                position: 'relative',
                background: 'var(--bg-input)',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                aspectRatio: url ? 'auto' : '16/9',
                minHeight: url ? 'auto' : '200px',
                maxWidth: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                boxSizing: 'border-box'
            }}>
                {isUploading[field] ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '2rem' }}>
                        <Loader2 className="animate-spin" size={36} color="var(--primary)" />
                        <span style={{ fontSize: '1.05rem', color: 'var(--primary)', fontWeight: '700' }}>Subiendo...</span>
                    </div>
                ) : url ? (
                    <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                            src={url}
                            alt={label}
                            style={{
                                width: '100%',
                                height: 'auto',
                                maxHeight: '80vh',
                                objectFit: 'contain',
                                display: 'block',
                                imageOrientation: 'from-image'
                            }}
                        />
                        {!isLocked && (
                            <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => setMarkupOpen({ open: true, field: field, url: url })}
                                    style={{
                                        background: 'rgba(59, 130, 246, 0.85)', border: '1px solid rgba(255,255,255,0.3)',
                                        color: 'white', padding: '8px 12px', borderRadius: '12px',
                                        fontSize: '1rem', fontWeight: '800', display: 'flex',
                                        alignItems: 'center', gap: '8px', cursor: 'pointer',
                                        backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                    }}
                                >
                                    <Edit3 size={18} />
                                    MARCAR
                                </button>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (field === 'fotoAntes') setFotoAntesUrl(null);
                                        if (field === 'fotoDespues') setFotoDespuesUrl(null);
                                        if (field === 'fotoExtra') setFotoExtraUrl(null);

                                        // Clear in DB immediately
                                        try {
                                            await trackedUpdateDoc(doc(db, 'ordenesTrabajo', ot.id), { [field]: null });
                                            setOt(prev => prev ? { ...prev, [field]: null } : null);
                                        } catch (e) {
                                            console.error("Error clearing photo in DB:", e);
                                        }
                                    }}
                                    style={{
                                        background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.3)',
                                        color: 'white', padding: '8px 12px', borderRadius: '12px',
                                        fontSize: '1rem', fontWeight: '800', display: 'flex',
                                        alignItems: 'center', gap: '8px', cursor: 'pointer',
                                        backdropFilter: 'blur(10px)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                    }}
                                >
                                    <RotateCcw size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        type="button"
                        disabled={isTechnicalLocked}
                        onClick={async () => {
                            if (Capacitor.isNativePlatform()) {
                                try {
                                    showNotification("Las fotos se guardan TEMPORALMENTE en la app por si llegas a trabajar sin internet y mientras concluyes una OT. Se ELIMINARÁN inmediatamente en cuanto cierres la OT y tengas internet.", "info");

                                    const image = await CapCamera.getPhoto({
                                        quality: 85,
                                        allowEditing: false,
                                        resultType: CameraResultType.Base64, // más confiable en Android
                                        source: CameraSource.Camera,
                                        saveToGallery: false,
                                        promptLabelPhoto: 'Seleccionar de Galería',
                                        promptLabelPicture: 'Tomar Foto'
                                    });

                                    if (image.base64String) {
                                        // Usar uploadString nativamente directo de Base64
                                        handleImmediateBase64Upload(image.base64String, field);
                                    } else {
                                        showNotification("No se pudo obtener la imagen. Intenta nuevamente.", "info");
                                    }
                                } catch (err: any) {
                                    // Cancelado por el usuario → silencioso
                                    if (err?.message && !err.message.toLowerCase().includes('cancel')) {
                                        showNotification("Cámara no disponible. Intenta de nuevo.", "info");
                                        console.error("Native camera error:", err);
                                    }
                                }
                            } else {
                                setCameraOpen({ open: true, field });
                            }
                        }}
                        style={{
                            width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            cursor: isLocked ? 'default' : 'pointer', transition: 'background 0.2s', padding: '2rem',
                            background: 'transparent', border: 'none', color: 'var(--text-main)', opacity: isLocked ? 0.5 : 1
                        }}
                    >
                        <Camera size={54} color="var(--primary)" />
                        <span style={{ fontSize: '1.35rem', marginTop: '12px', fontWeight: '900', letterSpacing: '1px' }}>TOMAR FOTO</span>
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="animate-fade mobile-view">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', flexWrap: 'nowrap' }}>
                <button onClick={() => navigate('/mis-servicios')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', borderRadius: '10px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ChevronLeft size={28} />
                </button>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <h1 style={{ fontSize: '1.25rem', fontWeight: '900', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                            {ot.tipo === 'Preventivo' ? `OT P-${ot.numero}` : `OT #${ot.numero}`}
                        </h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1px' }}>
                        <FamiliaIcon familia={equipo?.familiaId || equipo?.familia || ''} size={22} />
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '800', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{equipo?.nombre}</p>
                    </div>
                </div>

                {/* Status de Sincronización */}
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0
                }}>
                    <div style={{
                        width: '10px', height: '10px', borderRadius: '50%',
                        background: pendingSync ? '#ffc107' : (isSynced ? '#22c55e' : '#ef4444'),
                        boxShadow: `0 0 8px ${pendingSync ? '#ffc10780' : (isSynced ? '#22c55e80' : '#ef444480')}`,
                    }} />
                    <span style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--text-muted)' }}>
                        {pendingSync ? 'SYNC' : (isSynced ? 'CLOUD' : 'OFF')}
                    </span>
                </div>

                {/* Botón de Mapas Directo */}
                <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                    <button
                        onClick={() => {
                            const suc = ot.sucursalNombre || '';
                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(suc)}`, '_blank');
                        }}
                        style={{
                            background: 'var(--primary)', color: 'white',
                            border: 'none', borderRadius: '10px', width: '38px', height: '38px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <Navigation size={20} />
                    </button>

                    <button
                        onClick={() => {
                            if (sucursal?.telefono) {
                                window.location.href = `tel:${sucursal.telefono}`;
                            } else {
                                showNotification("Sin teléfono", "warning");
                            }
                        }}
                        style={{
                            background: 'var(--status-concluida)', color: 'white',
                            border: 'none', borderRadius: '10px', width: '38px', height: '38px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                    >
                        <Phone size={20} />
                    </button>
                </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem' }}>
                <div>
                    <PhotoInput label="FOTO ANTES" url={fotoAntesUrl} field="fotoAntes" required={ot.tipo !== 'Preventivo'} />
                </div>
                <div>
                    <PhotoInput label="FOTO EXTRA (OPCIONAL)" url={fotoExtraUrl} field="fotoExtra" />
                </div>

                <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(255,193,7,0.1)', borderRadius: '12px', border: '1px solid rgba(255,193,7,0.2)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <AlertCircle size={20} color="#ffc107" />
                    <p style={{ fontSize: '0.8rem', color: '#ffc107', fontWeight: '600', lineHeight: '1.3' }}>
                        Recuerda que estas fotos serán la base del reporte PDF. Asegúrate de que sean claras.
                    </p>
                </div>

                <div>
                    <label className="mobile-label" style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>Descripción del Trabajo Realizado {(ot.tipo !== 'Preventivo') && <span style={{ color: 'var(--priority-alta)' }}>*</span>}</label>
                    <textarea
                        ref={descripcionRef}
                        id="descripcion-trabajo"
                        className="mobile-input"
                        value={descripcionTecnica} 
                        onChange={e => setDescripcionTecnica(e.target.value)} 
                        onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                        onBlur={() => saveField('descripcionServicio', descripcionTecnica)}
                        required
                        disabled={isTechnicalLocked}
                        placeholder="Detalla las acciones tomadas..."
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', minHeight: '100px', opacity: isTechnicalLocked ? 0.6 : 1, lineHeight: '1.4', overflowY: 'hidden', fontSize: '0.9rem' }}
                    />
                    {!isLocked && (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '-45px', marginRight: '10px', position: 'relative', zIndex: 10 }}>
                            {audioTecnicoUrl && <audio src={audioTecnicoUrl} controls style={{ height: '32px', width: '120px' }} />}
                            <UnifiedVoiceInput 
                                onTextResult={(text) => setDescripcionTecnica(prev => prev + (prev ? ' ' : '') + text)}
                                onAudioBlob={(blob) => setAudioTecnicoBlob(blob)}
                                disabled={isTechnicalLocked}
                            />
                        </div>
                    )}
                </div>

                <div>
                    <label className="mobile-label" style={{ color: 'var(--text-main)', fontSize: '0.85rem' }}>Repuestos / Materiales</label>
                    <textarea
                        ref={repuestosRef}
                        id="repuestos-materiales"
                        className="mobile-input"
                        value={repuestosUtilizados} 
                        onChange={e => setRepuestosUtilizados(e.target.value)}
                        onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                        onBlur={() => saveField('repuestosUtilizados', repuestosUtilizados)}
                        disabled={isTechnicalLocked}
                        placeholder="Componentes reemplazados..."
                        style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', minHeight: '70px', opacity: isTechnicalLocked ? 0.6 : 1, lineHeight: '1.4', overflowY: 'hidden', fontSize: '0.9rem' }}
                    />
                    {!isLocked && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-45px', marginRight: '10px', position: 'relative', zIndex: 10 }}>
                            <UnifiedVoiceInput 
                                onTextResult={(text) => setRepuestosUtilizados(prev => prev + (prev ? ' ' : '') + text)}
                                onAudioBlob={() => {}} // No saving audio for spare parts for now unless needed
                                disabled={isTechnicalLocked}
                            />
                        </div>
                    )}
                </div>

                <div id="foto-despues-container">
                    <PhotoInput label="FOTO DESPUÉS" url={fotoDespuesUrl} field="fotoDespues" required={ot.tipo !== 'Preventivo'} />
                </div>

                <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '900', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.4rem', color: 'var(--primary)' }}>BLOQUE 1: CIERRE TÉCNICO</h3>

                    {ot.estatus !== 'Concluida. Pendiente Firma Cliente' && ot.estatus !== 'Concluida' && ot.estatus !== 'Finalizada' && (
                        <div style={{ padding: '1rem', background: '#0f172a', borderRadius: '16px', border: '1px solid #1e293b', display: 'flex', gap: '0.75rem', alignItems: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.5rem', borderRadius: '10px' }}>
                                <AlertCircle size={28} color="#3b82f6" />
                            </div>
                            <p style={{ fontSize: '0.9rem', color: '#f8fafc', fontWeight: '400', lineHeight: '1.4' }}>
                                <span style={{ color: '#3b82f6', fontWeight: '900', display: 'block', fontSize: '1.1rem', marginBottom: '0.2rem' }}>COMPROMISO DE CALIDAD</span>
                                Tu cierre técnico marcará la hora y ubicación satelital. <strong style={{ color: '#3b82f6' }}>No podrás editar más después de este paso.</strong>
                            </p>
                        </div>
                    )}

                    <SignaturePad id="firma-tecnico" label="Firma del Técnico" onSave={setFirmaTecnico} required disabled={isLocked} initialImage={firmaTecnico || undefined} />

                    {ot.estatus !== 'Concluida. Pendiente Firma Cliente' && ot.estatus !== 'Concluida' && ot.estatus !== 'Finalizada' && (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleTecnicoClosure}
                            style={{ padding: '1rem', marginTop: '0.5rem', background: 'var(--status-iniciada)', fontSize: '1.1rem', height: 'auto', borderRadius: '12px', border: 'none', color: 'white', fontWeight: '800' }}
                        >
                            {submitting ? 'Registrando...' : 'CONCLUIR Y FIRMAR'}
                            {!submitting && <CheckCircle2 size={20} />}
                        </button>
                    )}
                </div>

                {ot.estatus === 'Concluida. Pendiente Firma Cliente' && (
                    <div style={{ padding: '0.75rem 1rem', background: 'rgba(34,197,94,0.1)', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.3)', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <AlertCircle size={24} color="#22c55e" />
                        <div>
                            <h4 style={{ fontWeight: '900', color: '#22c55e', fontSize: '1rem' }}>¡TRABAJO CONCLUIDO POR TÉCNICO!</h4>
                            <p style={{ fontSize: '0.9rem' }}>Por favor, solicita la firma de conformidad del cliente.</p>
                        </div>
                    </div>
                )}

                {(ot.estatus === 'Concluida. Pendiente Firma Cliente' || ot.estatus === 'Concluida' || ot.estatus === 'Finalizada') && (
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '900', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.4rem', color: 'var(--accent)' }}>BLOQUE 2: CONFORMIDAD DEL CLIENTE</h3>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '1rem', fontWeight: '800' }}>Comentarios del Cliente {ot.tipo !== 'Preventivo' && <span style={{ color: 'var(--priority-alta)' }}>*</span>}</label>
                            <textarea
                                value={comentariosCliente} 
                                onChange={e => setComentariosCliente(e.target.value)}
                                onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                                onBlur={() => saveField('comentariosCliente', comentariosCliente)}
                                disabled={ot.estatus === 'Concluida' || ot.estatus === 'Finalizada'}
                                placeholder="Escriba aquí los comentarios..."
                                style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '12px', border: '1px solid var(--glass-border)', background: 'var(--bg-input)', color: 'var(--text-main)', minHeight: '80px', marginBottom: '1rem', fontSize: '0.95rem', lineHeight: '1.4', overflowY: 'hidden' }}
                            />
                            {ot.estatus === 'Concluida. Pendiente Firma Cliente' && (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '-45px', marginRight: '10px', position: 'relative', zIndex: 10, marginBottom: '20px' }}>
                                    {audioClienteUrl && <audio src={audioClienteUrl} controls style={{ height: '32px', width: '120px' }} />}
                                    <UnifiedVoiceInput 
                                        onTextResult={(text: string) => setComentariosCliente(prev => prev + (prev ? ' ' : '') + text)}
                                        onAudioBlob={(blob: Blob) => setAudioClienteBlob(blob)}
                                        disabled={false}
                                    />
                                </div>
                            )}

                            {(ot.estatus === 'Concluida' || ot.estatus === 'Finalizada') && audioClienteUrl && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '900', color: 'var(--accent)' }}>Audio del Cliente</label>
                                    <audio controls src={audioClienteUrl} style={{ width: '100%' }} />
                                </div>
                            )}

                            <SignaturePad
                                id="firma-cliente"
                                label="Firma de Conformidad Cliente"
                                onSave={setFirmaCliente}
                                required
                                disabled={ot.estatus === 'Concluida' || ot.estatus === 'Finalizada'}
                                initialImage={firmaCliente || undefined}
                            />
                        </div>

                        {ot.estatus === 'Concluida. Pendiente Firma Cliente' && (
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleFinalClosure}
                                disabled={submitting || !firmaCliente || !comentariosCliente.trim()}
                                style={{ padding: '1.25rem', marginTop: '0.5rem', background: 'var(--status-concluida)', fontSize: '1.25rem', height: 'auto', borderRadius: '12px' }}
                            >
                                {submitting ? 'Cerrando...' : 'FINALIZAR ORDEN'}
                                {!submitting && <CheckCircle2 size={24} />}
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

            {markupOpen.open && markupOpen.url && (
                <PhotoMarkupModal
                    imageUrl={markupOpen.url}
                    title={`Marcar ${markupOpen.field?.replace('foto', '').toUpperCase()}`}
                    onClose={() => setMarkupOpen({ open: false, field: null, url: null })}
                    onSave={(blob) => {
                        handleImmediatePhotoUpload(blob as File, markupOpen.field as any);
                        setMarkupOpen({ open: false, field: null, url: null });
                    }}
                />
            )}
        </div>
    );
};
