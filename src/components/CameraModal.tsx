import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, RotateCcw, Check, SwitchCamera, Loader2, Upload } from 'lucide-react';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface CameraModalProps {
    onCapture: (blob: Blob) => void;
    onClose: () => void;
    title?: string;
}

export const CameraModal: React.FC<CameraModalProps> = ({ onCapture, onClose, title = "Capturar Fotografía" }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [flashFeedback, setFlashFeedback] = useState(false);

    useEscapeKey(onClose, true);

    const startCamera = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        // Stop any existing stream
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });

            setStream(newStream);
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
        } catch (err: any) {
            console.error("Error accessing camera:", err);
            setError("No se pudo acceder a la cámara. Asegúrate de dar los permisos necesarios.");
        } finally {
            setIsLoading(false);
        }
    }, [facingMode]);

    useEffect(() => {
        startCamera();
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [facingMode]);

    const takePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const context = canvas.getContext('2d');
            if (context) {
                // Flip horizontally if using front camera
                if (facingMode === 'user') {
                    context.translate(canvas.width, 0);
                    context.scale(-1, 1);
                }
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

                // Flash feedback
                setFlashFeedback(true);
                setTimeout(() => setFlashFeedback(false), 200);

                setCapturedImage(dataUrl);
            }
        }
    };

    const confirmPhoto = () => {
        if (capturedImage) {
            // Convert dataUrl to Blob
            fetch(capturedImage)
                .then(res => res.blob())
                .then(blob => {
                    onCapture(blob);
                    onClose();
                });
        }
    };

    const switchCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                if (dataUrl) {
                    setCapturedImage(dataUrl);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'black', zIndex: 9999,
            display: 'flex', flexDirection: 'column',
            touchAction: 'none'
        }}>
            {/* Flash feedback overlay */}
            {flashFeedback && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'white', zIndex: 100, opacity: 0.7,
                    pointerEvents: 'none', transition: 'opacity 0.15s'
                }} />
            )}

            {/* Full Screen Viewfinder / Preview */}
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
            }}>
                {isLoading && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', color: 'white', zIndex: 1 }}>
                        <Loader2 className="animate-spin" size={40} />
                        <p>Iniciando Cámara...</p>
                    </div>
                )}

                {error && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444', zIndex: 1 }}>
                        <p>{error}</p>
                        <button onClick={startCamera} style={{ marginTop: '1rem', padding: '0.5rem 1rem', borderRadius: '8px', background: 'var(--primary)', color: 'white', border: 'none' }}>Reintentar</button>
                    </div>
                )}

                {!capturedImage ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        onClick={takePhoto}
                        style={{
                            width: '100%', height: '100%', objectFit: 'cover',
                            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                            cursor: 'pointer',
                            background: '#000'
                        }}
                    />
                ) : (
                    <img src={capturedImage} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#000' }} />
                )}

                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            {/* UI Layer */}
            <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* TOP MASK (RECORTADO ARRIBA) + CONTROLES */}
                <div style={{
                    background: 'rgba(0,0,0,0.85)',
                    padding: '0.5rem 0',
                    display: 'flex',
                    flexDirection: 'column',
                    borderBottom: '2px solid rgba(255,255,255,0.1)'
                }}>
                    {/* Header Tiny */}
                    <div style={{ padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: '900', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{title}</span>
                        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <X size={18} />
                        </button>
                    </div>

                    {/* CONTROLES PRINCIPALES - "ENCERRADOS" EN EL MARCO SUPERIOR */}
                    <div style={{
                        padding: '1rem 0 2rem 0',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '2rem'
                    }}>
                        {!capturedImage ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
                                <button
                                    onClick={switchCamera}
                                    style={{
                                        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)', color: 'white',
                                        width: '48px', height: '48px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    <SwitchCamera size={22} />
                                </button>

                                <button
                                    onClick={takePhoto}
                                    style={{
                                        width: '90px', height: '90px', borderRadius: '50%', border: '4px solid white',
                                        background: 'transparent', padding: '6px', display: 'flex',
                                        boxShadow: '0 0 30px rgba(255,255,255,0.3)', position: 'relative'
                                    }}
                                >
                                    <div style={{ flex: 1, background: 'white', borderRadius: '50%' }} />
                                    <div style={{ position: 'absolute', bottom: '-22px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: '0.75rem', fontWeight: '950', color: 'white', textShadow: '0 2px 4px black' }}>CAPTURAR</div>
                                </button>

                                <label
                                    style={{
                                        background: 'rgba(59,130,246,0.3)', border: '1px solid rgba(59,130,246,0.5)', color: 'white',
                                        width: '48px', height: '48px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Upload size={20} />
                                    <input type="file" accept="image/*" hidden onChange={handleFileUpload} />
                                </label>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3rem' }}>
                                <button
                                    onClick={() => setCapturedImage(null)}
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'white' }}
                                >
                                    <div style={{
                                        width: '60px', height: '60px', borderRadius: '50%',
                                        background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: '2px solid #ef4444'
                                    }}>
                                        <RotateCcw size={26} />
                                    </div>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '900' }}>REINTENTAR</span>
                                </button>

                                <button
                                    onClick={confirmPhoto}
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'white' }}
                                >
                                    <div style={{
                                        width: '90px', height: '90px', borderRadius: '50%',
                                        background: '#22c55e', color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 0 40px rgba(34, 197, 94, 0.6)',
                                        border: '4px solid white'
                                    }}>
                                        <Check size={48} />
                                    </div>
                                    <span style={{ fontSize: '1rem', fontWeight: '950', color: '#4ade80', textShadow: '0 2px 4px black' }}>ACEPTAR FOTO</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* VISOR CENTRAL (ÁREA LIBRE) */}
                <div style={{ flex: 1, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {!capturedImage && (
                        <div style={{
                            border: '1px dashed rgba(255,255,255,0.3)',
                            width: '80%', height: '60%',
                            borderRadius: '20px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' }}>FOTO AQUÍ</span>
                        </div>
                    )}
                </div>

                {/* BOTTOM MASK (RECORTADO ABAJO) - ESTO EMPUJA TODO HACIA ARRIBA CON FUERZA */}
                <div style={{
                    background: 'rgba(0,0,0,0.92)',
                    padding: '3rem 1rem 35vh 1rem', // 35% del alto de la pantalla libre abajo
                    textAlign: 'center',
                    borderTop: '2px solid rgba(255,255,255,0.1)'
                }}>
                    {!capturedImage && (
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Toca el visor para capturar
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
