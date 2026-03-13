import React, { useEffect, useState } from 'react';

export const SplashScreen: React.FC = () => {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    if (!visible) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: '#0a0a0c', // Obsidian dark
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            overflow: 'hidden'
        }}>
            {/* SVG Definitions for Gradients and Reflections */}
            <svg width="0" height="0" style={{ position: 'absolute' }}>
                <defs>
                    <linearGradient id="fireSplash" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ff4d4d" />
                        <stop offset="70%" stopColor="#ff944d" />
                        <stop offset="100%" stopColor="#ffd24d" />
                    </linearGradient>
                    <linearGradient id="iceSplash" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#e0f2fe" />
                        <stop offset="100%" stopColor="#0ea5e9" />
                    </linearGradient>
                    <linearGradient id="boltSplash" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#fbbf24" />
                        <stop offset="60%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#f43f5e" />
                    </linearGradient>
                    <linearGradient id="waterSplash" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#7dd3fc" />
                        <stop offset="100%" stopColor="#0369a1" />
                    </linearGradient>
                    <linearGradient id="gearSplash" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f8fafc" />
                        <stop offset="100%" stopColor="#475569" />
                    </linearGradient>
                    <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
                        <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                </defs>
            </svg>

            {/* Contenedor del Logo Pentagonal Gigante */}
            <div style={{ position: 'relative', width: '280px', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                
                {/* Pentágono Maestro Trazado */}
                <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', position: 'absolute' }}>
                    <path 
                        d="M50 5 L95 38 L78 92 L22 92 L5 38 Z" 
                        fill="rgba(59, 130, 246, 0.05)" 
                        stroke="rgba(59, 130, 246, 0.6)" 
                        strokeWidth="1.5"
                        className="vibrate-line"
                    />
                    {/* Brillo en los vértices */}
                    {[ [50,5], [95,38], [78,92], [22,92], [5,38] ].map((pt, i) => (
                        <circle key={i} cx={pt[0]} cy={pt[1]} r="1.5" fill="#3b82f6" />
                    ))}
                </svg>

                {/* ICONOS INTERNOS DEL PENTÁGONO (Alineados a los vértices pero hacia adentro) */}
                
                {/* 1. COCCIÓN (Flama) - Superior */}
                <div style={{ position: 'absolute', top: '18%', left: '50%', transform: 'translate(-50%, -50%)', width: '90px', height: '90px' }}>
                    <svg viewBox="0 0 100 100">
                        <path d="M50 5C50 5 85 30 85 55C85 75 70 95 50 95C30 95 15 75 15 55C15 30 50 5 50 5Z" fill="url(#fireSplash)"/>
                        <path d="M50 20C50 20 65 35 65 55C65 65 58 80 50 80C42 80 35 65 35 55C35 35 50 20 50 20Z" fill="white" opacity="0.15"/>
                    </svg>
                </div>

                {/* 2. REFRIGERACIÓN (Hielo) - Derecha */}
                <div style={{ position: 'absolute', top: '42%', left: '82%', transform: 'translate(-50%, -50%)', width: '70px', height: '70px' }}>
                    <svg viewBox="0 0 100 100">
                        <g stroke="url(#iceSplash)" strokeWidth="10" strokeLinecap="round">
                            <path d="M50 5 L50 95 M10 50 L90 50 M22 22 L78 78 M78 22 L22 78"/>
                        </g>
                        <circle cx="50" cy="50" r="15" fill="url(#iceSplash)" />
                    </svg>
                </div>

                {/* 3. LAVADO (Gota) - Abajo Derecha */}
                <div style={{ position: 'absolute', top: '78%', left: '70%', transform: 'translate(-50%, -50%)', width: '70px', height: '70px' }}>
                    <svg viewBox="0 0 100 100">
                        <path d="M50 5C50 5 85 40 85 65C85 85 70 95 50 95C30 95 15 85 15 65C15 40 50 5 50 5Z" fill="url(#waterSplash)"/>
                    </svg>
                </div>

                {/* 4. MECÁNICO (Engrane) - Abajo Izquierda */}
                <div style={{ position: 'absolute', top: '78%', left: '30%', transform: 'translate(-50%, -50%)', width: '70px', height: '70px' }}>
                    <svg viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="28" fill="none" stroke="url(#gearSplash)" strokeWidth="14"/>
                        <path d="M50 5 L50 20 M50 80 L50 95 M5 50 L20 50 M80 50 L95 50 M18 18 L30 30 M70 70 L82 82 M82 18 L70 30 M30 70 L18 82" stroke="url(#gearSplash)" strokeWidth="12" strokeLinecap="round"/>
                    </svg>
                </div>

                {/* 5. ELÉCTRICO (Rayo) - Izquierda */}
                <div style={{ position: 'absolute', top: '42%', left: '18%', transform: 'translate(-50%, -50%)', width: '70px', height: '70px' }}>
                    <svg viewBox="0 0 100 100">
                        <path d="M65 5 L20 60 L45 60 L35 95 L80 40 L55 40 Z" fill="url(#boltSplash)"/>
                    </svg>
                </div>

                {/* Núcleo Energético */}
                <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)',
                    animation: 'pulseGlow 2s infinite cubic-bezier(0.4, 0, 0.2, 1)'
                }} />
            </div>

            {/* Identidad de Marca Unificada */}
            <div style={{ marginTop: '4rem', textAlign: 'center' }}>
                <h1 style={{ 
                    fontSize: '3.2rem', 
                    fontWeight: '950', 
                    letterSpacing: '20px', 
                    color: '#ffffff',
                    textShadow: '0 0 30px rgba(59,130,246,0.5)',
                    margin: 0,
                    fontFamily: "'Outfit', sans-serif"
                }}>
                    T-GESTION
                </h1>
                <p style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: '800', 
                    letterSpacing: '8px', 
                    color: '#3b82f6',
                    marginTop: '1.2rem',
                    textTransform: 'uppercase',
                    opacity: 0.8
                }}>
                    TRABAJO EFICIENTE
                </p>
            </div>
            <style>{`
                @keyframes pulseGlow {
                    0%, 100% { transform: scale(1); opacity: 0.4; }
                    50% { transform: scale(1.6); opacity: 0.8; }
                }
                .vibrate-line {
                    animation: vibrate 0.5s linear infinite;
                }
                @keyframes vibrate {
                    0% { transform: translate(0,0); }
                    25% { transform: translate(1px, -1px); }
                    50% { transform: translate(-1px, 1px); }
                    75% { transform: translate(1px, 1px); }
                    100% { transform: translate(0,0); }
                }
            `}</style>
        </div>
    );
};
