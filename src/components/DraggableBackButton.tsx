import React, { useState, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Botón flotante arrastrable para navegar hacia atrás.
 * El técnico puede moverlo a cualquier posición de la pantalla.
 * La posición se guarda en localStorage.
 */
export const DraggableBackButton: React.FC = () => {
    const navigate = useNavigate();

    const savedPos = (): { x: number; y: number } => {
        try {
            const p = JSON.parse(localStorage.getItem('back_btn_pos') || 'null');
            if (p && typeof p.x === 'number' && typeof p.y === 'number') return p;
        } catch { /* ignore */ }
        return { x: 16, y: window.innerHeight - 80 };
    };

    const [pos, setPos] = useState(savedPos);
    const dragging = useRef(false);
    const hasDragged = useRef(false);
    const startRef = useRef<{ tx: number; ty: number; bx: number; by: number } | null>(null);

    const onTouchStart = (e: React.TouchEvent) => {
        dragging.current = true;
        hasDragged.current = false;
        const t = e.touches[0];
        startRef.current = { tx: t.clientX, ty: t.clientY, bx: pos.x, by: pos.y };
    };

    const onTouchMove = (e: React.TouchEvent) => {
        if (!dragging.current || !startRef.current) return;
        e.preventDefault(); // evita scroll mientras arrastra
        const t = e.touches[0];
        const dx = t.clientX - startRef.current.tx;
        const dy = t.clientY - startRef.current.ty;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasDragged.current = true;
        const newX = Math.max(0, Math.min(window.innerWidth - 50, startRef.current.bx + dx));
        const newY = Math.max(0, Math.min(window.innerHeight - 50, startRef.current.by + dy));
        setPos({ x: newX, y: newY });
    };

    const onTouchEnd = () => {
        dragging.current = false;
        localStorage.setItem('back_btn_pos', JSON.stringify(pos));
    };

    const handleClick = () => {
        if (!hasDragged.current) navigate(-1);
    };

    return (
        <button
            onClick={handleClick}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            title="Volver"
            style={{
                position: 'fixed',
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: '45px',
                height: '45px',
                borderRadius: '12px',
                background: 'rgba(30, 41, 59, 0.4)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9000,
                cursor: 'grab',
                boxShadow: '0 4px 15px rgba(0,0,0,0.35)',
                opacity: 0.75,
                touchAction: 'none',
                userSelect: 'none',
                transition: 'opacity 0.2s'
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = '1')}
            onMouseOut={e => (e.currentTarget.style.opacity = '0.75')}
        >
            <ArrowLeft size={22} />
        </button>
    );
};
