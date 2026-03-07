import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, RotateCcw, Check, SwitchCamera, Loader2 } from 'lucide-react';
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
                            width: '100%', height: '100%', objectFit: 'contain',
                            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                            cursor: 'pointer',
                            background: '#000'
                        }}
                    />
                ) : (
                    <img src={capturedImage} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
                )}

                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            {/* UI Layer */}
            <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                {/* Header with title + close */}
                <div style={{
                    padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'white',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)'
                }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: '800', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{title}</h2>
                    <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.4)', border: 'none', color: 'white', cursor: 'pointer', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <X size={28} />
                    </button>
                </div>

                {/* Controls - positioned BELOW the header for easy reach on mobile */}
                <div style={{
                    padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                    background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.7))'
                }}>
                    {!capturedImage ? (
                        <>
                            <button
                                onClick={switchCamera}
                                style={{
                                    background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white',
                                    width: '56px', height: '56px', borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    backdropFilter: 'blur(5px)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                                }}
                            >
                                <SwitchCamera size={26} />
                            </button>

                            <button
                                onClick={takePhoto}
                                style={{
                                    width: '80px', height: '80px', borderRadius: '50%', border: '5px solid white',
                                    background: 'transparent', padding: '5px', display: 'flex',
                                    boxShadow: '0 0 20px rgba(255,255,255,0.3)'
                                }}
                            >
                                <div style={{ flex: 1, background: 'white', borderRadius: '50%' }} />
                            </button>

                            <div style={{ width: '56px' }} /> {/* Spacer */}
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setCapturedImage(null)}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: 'white' }}
                            >
                                <div style={{
                                    width: '60px', height: '60px', borderRadius: '50%',
                                    background: 'rgba(239, 68, 68, 0.3)', color: '#ef4444',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '2px solid #ef4444', boxShadow: '0 2px 12px rgba(239,68,68,0.3)'
                                }}>
                                    <RotateCcw size={28} />
                                </div>
                                <span style={{ fontSize: '0.85rem', fontWeight: '800' }}>REPETIR</span>
                            </button>

                            <button
                                onClick={confirmPhoto}
                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: 'transparent', border: 'none', color: 'white' }}
                            >
                                <div style={{
                                    width: '80px', height: '80px', borderRadius: '50%',
                                    background: 'var(--status-concluida)', color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 0 20px rgba(74, 222, 128, 0.5)'
                                }}>
                                    <Check size={48} />
                                </div>
                                <span style={{ fontSize: '1rem', fontWeight: '900' }}>USAR FOTO</span>
                            </button>

                            <div style={{ width: '60px' }} /> {/* Spacer */}
                        </>
                    )}
                </div>

                {/* Tap hint - only when video is live */}
                {!capturedImage && !isLoading && !error && (
                    <div style={{
                        position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.6)', padding: '0.5rem 1.25rem', borderRadius: '20px',
                        backdropFilter: 'blur(5px)', pointerEvents: 'none'
                    }}>
                        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.75rem', fontWeight: '600' }}>
                            Toca la pantalla para capturar
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
