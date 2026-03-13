import React, { useRef, useState, useEffect } from 'react';
import { X, Check, RotateCcw, PenTool } from 'lucide-react';

interface PhotoMarkupModalProps {
    imageUrl: string;
    onSave: (blob: Blob) => void;
    onClose: () => void;
    title: string;
}

export const PhotoMarkupModal: React.FC<PhotoMarkupModalProps> = ({ imageUrl, onSave, onClose, title }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#ef4444'); // Rojo por defecto para fallas
    const historyRef = useRef<ImageData[]>([]);
    const [canUndo, setCanUndo] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Cargar la imagen via blob URL para evitar restricciones CORS del canvas con Firebase Storage
        const loadImage = async () => {
            try {
                let objectUrl: string | null = null;
                let src = imageUrl;

                // Si es una URL remota (Firebase), la bajamos como blob para evitar CORS en canvas
                if (imageUrl.startsWith('http')) {
                    const resp = await fetch(imageUrl, { mode: 'cors', credentials: 'omit' });
                    const blob = await resp.blob();
                    objectUrl = URL.createObjectURL(blob);
                    src = objectUrl;
                }

                const img = new Image();
                img.onload = () => {
                    // OPTIMIZACIÓN: Aumentamos el espacio de trabajo para evitar el "efecto pantalla negra"
                    const maxWidth = window.innerWidth * 0.98;
                    const maxHeight = window.innerHeight * 0.78;
                    let w = img.width;
                    let h = img.height;
                    if (w > maxWidth) { h *= maxWidth / w; w = maxWidth; }
                    if (h > maxHeight) { w *= maxHeight / h; h = maxHeight; }
                    canvas.width = w;
                    canvas.height = h;
                    ctx.drawImage(img, 0, 0, w, h);
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 5; // Aumentar un poco el grosor para pantallas de alta densidad
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    
                    setTimeout(() => {
                        historyRef.current = [ctx.getImageData(0, 0, w, h)];
                        setCanUndo(false);
                    }, 50);

                    if (objectUrl) URL.revokeObjectURL(objectUrl);
                };
                img.onerror = () => {
                    if (objectUrl) URL.revokeObjectURL(objectUrl);
                };
                img.src = src;
            } catch (e) {
                console.error('Error cargando imagen en canvas:', e);
            }
        };

        loadImage();
    }, [imageUrl]);

    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) ctx.strokeStyle = color;
    }, [color]);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
            ctx.beginPath();
            historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
            setCanUndo(historyRef.current.length > 1);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const rect = canvas.getBoundingClientRect();
        // Soporte para escalado dinámico de coordenadas
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left) * scaleX;
        const y = (('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top) * scaleY;

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const handleSave = () => {
        canvasRef.current?.toBlob((blob) => {
            if (blob) onSave(blob);
        }, 'image/jpeg', 0.95); // Mayor calidad
    };

    const handleUndo = () => {
        if (historyRef.current.length > 1) {
            historyRef.current.pop(); 
            const prevFrame = historyRef.current[historyRef.current.length - 1];
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (canvas && ctx) {
                ctx.putImageData(prevFrame, 0, 0);
            }
            setCanUndo(historyRef.current.length > 1);
        }
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(15px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 30000, padding: '0.25rem'
        }}>
            {/* Header Compacto */}
            <div style={{ position: 'absolute', top: '10px', left: 0, right: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.5rem', zIndex: 10 }}>
                <h2 style={{ color: 'white', fontSize: '1.2rem', fontWeight: '900', textShadow: '0 2px 4px rgba(0,0,0,0.5)', margin: 0 }}>{title}</h2>
                <button onClick={onClose} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={24} /></button>
            </div>

            <div style={{ position: 'relative', background: 'black', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 0 30px rgba(0,0,0,0.5)' }}>
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    style={{ cursor: 'crosshair', display: 'block', touchAction: 'none' }}
                />
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.8rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', borderRadius: '40px' }}>
                    {['#ef4444', '#22c55e', '#3b82f6', '#eab308'].map(c => (
                        <button
                            key={c}
                            onClick={() => setColor(c)}
                            style={{
                                width: '32px', height: '32px', borderRadius: '50%', background: c,
                                border: color === c ? '2px solid white' : 'none', cursor: 'pointer'
                            }}
                        />
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn" onClick={handleUndo} disabled={!canUndo} style={{ background: 'rgba(255,255,255,0.1)', color: 'white', padding: '0.6rem 1rem', fontSize: '0.85rem', opacity: !canUndo ? 0.3 : 1 }}>
                        <RotateCcw size={16} /> DESHACER
                    </button>

                    <button className="btn btn-primary" onClick={handleSave} style={{ padding: '0.6rem 1.5rem', fontSize: '1rem', fontWeight: '900' }}>
                        <Check size={20} /> GUARDAR
                    </button>
                </div>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <PenTool size={12} style={{ display: 'inline', marginRight: '5px' }} />
                Dibuja para resaltar hallazgos
            </p>
        </div>
    );
};
