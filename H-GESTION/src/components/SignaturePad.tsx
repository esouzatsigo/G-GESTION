import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw, PenTool } from 'lucide-react';

interface SignaturePadProps {
    label: string;
    onSave: (dataUrl: string | null) => void;
    required?: boolean;
    disabled?: boolean;
    initialImage?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ label, onSave, required, disabled, initialImage }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);

    const imageRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const drawStoredImage = () => {
            if (imageRef.current && canvas) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
                    setIsEmpty(false);
                }
            }
        };

        const resizeCanvas = () => {
            const rect = canvas.parentElement?.getBoundingClientRect();
            if (rect) {
                canvas.width = rect.width;
                canvas.height = 220;
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                drawStoredImage();
            }
        };

        if (initialImage) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                imageRef.current = img;
                drawStoredImage();
            };
            img.src = initialImage;
        } else {
            imageRef.current = null;
            setIsEmpty(true);
        }

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [initialImage]);

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        } else {
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e as any);
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        setIsEmpty(false);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        const { x, y } = getCoordinates(e as any);
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            const dataUrl = canvasRef.current?.toDataURL();
            onSave(dataUrl || null);
        }
    };

    const clear = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            setIsEmpty(true);
            onSave(null);
        }
    };

    return (
        <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                {label.toUpperCase()} {required && <span style={{ color: 'var(--priority-alta)' }}>*</span>}
            </label>
            <div style={{
                position: 'relative',
                background: '#ffffff', // White background (Digital Paper) for black ink consistency
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                overflow: 'hidden',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
            }}>
                <canvas
                    ref={canvasRef}
                    onMouseDown={!disabled ? startDrawing : undefined}
                    onMouseMove={!disabled ? draw : undefined}
                    onMouseUp={!disabled ? stopDrawing : undefined}
                    onMouseOut={!disabled ? stopDrawing : undefined}
                    onTouchStart={!disabled ? startDrawing : undefined}
                    onTouchMove={!disabled ? draw : undefined}
                    onTouchEnd={!disabled ? stopDrawing : undefined}
                    style={{ cursor: disabled ? 'default' : 'crosshair', display: 'block', width: '100%', touchAction: 'none' }}
                />

                {isEmpty && (
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                        pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center',
                        opacity: 0.3, color: '#64748b' // Darker grey for visibility on white background
                    }}>
                        <PenTool size={32} />
                        <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>{disabled ? 'Sin firma' : 'Firme aquí'}</span>
                    </div>
                )}

                {!disabled && (
                    <button
                        type="button"
                        onClick={clear}
                        style={{
                            position: 'absolute', bottom: '8px', right: '8px', padding: '6px',
                            background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '6px', color: '#64748b', cursor: 'pointer'
                        }}
                    >
                        <RotateCcw size={16} />
                    </button>
                )}
            </div>
        </div>
    );
};
