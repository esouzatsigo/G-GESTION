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
                {/* TOP HEADER */}
                <div style={{
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.95), transparent)',
                    padding: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</span>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', cursor: 'pointer', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={28} />
                    </button>
                </div>

                {/* VISOR CENTRAL (ÁREA LIBRE) */}
                <div style={{ flex: 1, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                    {!capturedImage && (
                        <div style={{
                            border: '2px dashed rgba(255,255,255,0.4)',
                            width: '90%', height: '70%',
                            borderRadius: '24px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                        </div>
                    )}
                </div>

                {/* BOTTOM CONTROLS - "ZONA SEGURA" ELEVADA */}
                <div style={{
                    background: 'rgba(0,0,0,0.85)',
                    padding: '2rem 1rem calc(2rem + env(safe-area-inset-bottom)) 1rem',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <div style={{
                        maxWidth: '400px',
                        margin: '0 auto',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '2.5rem'
                    }}>
                        {!capturedImage ? (
                            <>
                                <button
                                    onClick={switchCamera}
                                    style={{
                                        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'white',
                                        width: '60px', height: '60px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    <SwitchCamera size={28} />
                                </button>

                                <button
                                    onClick={takePhoto}
                                    style={{
                                        width: '100px', height: '100px', borderRadius: '50%', border: '6px solid white',
                                        background: 'transparent', padding: '8px', display: 'flex',
                                        boxShadow: '0 0 40px rgba(255,255,255,0.2)', position: 'relative'
                                    }}
                                >
                                    <div style={{ flex: 1, background: 'white', borderRadius: '50%' }} />
                                    <div style={{ position: 'absolute', bottom: '-28px', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', fontSize: '0.9rem', fontWeight: '900', color: 'white', textShadow: '0 2px 6px black' }}>CAPTURAR</div>
                                </button>

                                <label
                                    style={{
                                        background: 'rgba(59,130,246,0.3)', border: '1px solid rgba(59,130,246,0.5)', color: 'white',
                                        width: '60px', height: '60px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Upload size={28} />
                                    <input type="file" accept="image/*" hidden onChange={handleFileUpload} />
                                </label>
                            </>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4rem' }}>
                                <button
                                    onClick={() => setCapturedImage(null)}
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', color: 'white' }}
                                >
                                    <div style={{
                                        width: '70px', height: '70px', borderRadius: '50%',
                                        background: 'rgba(239, 68, 68, 0.25)', color: '#ef4444',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: '3px solid #ef4444'
                                    }}>
                                        <RotateCcw size={32} />
                                    </div>
                                    <span style={{ fontSize: '0.9rem', fontWeight: '900' }}>REPETIR</span>
                                </button>

                                <button
                                    onClick={confirmPhoto}
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', background: 'transparent', border: 'none', color: 'white' }}
                                >
                                    <div style={{
                                        width: '100px', height: '100px', borderRadius: '50%',
                                        background: '#22c55e', color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 0 50px rgba(34, 197, 94, 0.4)',
                                        border: '6px solid white'
                                    }}>
                                        <Check size={56} />
                                    </div>
                                    <span style={{ fontSize: '1.1rem', fontWeight: '950', color: '#4ade80', textShadow: '0 2px 6px black' }}>LISTO!</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
