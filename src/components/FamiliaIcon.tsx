import React from 'react';

interface FamiliaIconProps {
    familia: string;
    size?: number;
    color?: string;
}

export const FamiliaIcon: React.FC<FamiliaIconProps> = ({ familia, size = 24, color = 'currentColor' }) => {
    const fam = familia.toUpperCase();

    // Reutilizar definiciones de degradados para consistencia
    const Definitions = () => (
        <defs>
            <linearGradient id="fireGradFinal" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ff4d4d" />
                <stop offset="70%" stopColor="#ff944d" />
                <stop offset="100%" stopColor="#ffd24d" />
            </linearGradient>
            <linearGradient id="iceGradFinal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e0f2fe" />
                <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
            <linearGradient id="boltGradFinal" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="60%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
            <linearGradient id="waterGradFinal" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7dd3fc" />
                <stop offset="100%" stopColor="#0369a1" />
            </linearGradient>
            <linearGradient id="gearGradFinal" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor="#475569" />
            </linearGradient>
        </defs>
    );

    // 1. COCCIÓN / HORNOS - Flama Realista (3 colores + Brillo)
    if (fam.includes('COCCION') || fam.includes('HORNOS') || fam.includes('ESTUFA')) {
        return (
            <svg viewBox="0 0 100 100" width={size} height={size}>
                <Definitions />
                <path d="M50 5C50 5 85 30 85 55C85 75 70 95 50 95C30 95 15 75 15 55C15 30 50 5 50 5Z" fill="url(#fireGradFinal)"/>
                <path d="M50 15C50 15 70 35 70 55C70 65 60 85 50 85C40 85 30 65 30 55C30 35 50 15 50 15Z" fill="white" opacity="0.15"/>
                <circle cx="50" cy="80" r="10" fill="white" opacity="0.2"/>
            </svg>
        );
    }

    // 2. REFRIGERACIÓN - Cristal Técnico Reflejado
    if (fam.includes('REFRIGERACION') || fam.includes('FRIO') || fam.includes('HIE')) {
        return (
            <svg viewBox="0 0 100 100" width={size} height={size}>
                <Definitions />
                <g stroke="url(#iceGradFinal)" strokeWidth="8" strokeLinecap="round">
                    <path d="M50 5 L50 95 M10 50 L90 50 M22 22 L78 78 M78 22 L22 78"/>
                </g>
                <circle cx="50" cy="50" r="12" fill="url(#iceGradFinal)" />
                <path d="M42 42 Q45 40 48 42" stroke="white" strokeWidth="3" fill="none" opacity="0.6"/>
            </svg>
        );
    }

    // 3. LAVADO / HIDRÁULICO - Gota con Reflejo Curvo
    if (fam.includes('LAVADO') || fam.includes('AGUA') || fam.includes('HIDR')) {
        return (
            <svg viewBox="0 0 100 100" width={size} height={size}>
                <Definitions />
                <path d="M50 5C50 5 85 40 85 65C85 85 70 95 50 95C30 95 15 85 15 65C15 40 50 5 50 5Z" fill="url(#waterGradFinal)"/>
                <path d="M35 55 Q35 40 50 25" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.3"/>
            </svg>
        );
    }

    // 4. ELÉCTRICO / CONTROL - Rayo Energía Gradiente
    if (fam.includes('ELECTRICO') || fam.includes('LUM') || fam.includes('CONT')) {
        return (
            <svg viewBox="0 0 100 100" width={size} height={size}>
                <Definitions />
                <path d="M65 5 L20 60 L45 60 L35 95 L80 40 L55 40 Z" fill="url(#boltGradFinal)"/>
                <path d="M65 5 L50 45 L80 40 Z" fill="white" opacity="0.3"/>
            </svg>
        );
    }

    // 5. MECÁNICO / MOTORES - Engrane Metálico 3D
    if (fam.includes('MECANICO') || fam.includes('MOTOR') || fam.includes('EXTRAC')) {
        return (
            <svg viewBox="0 0 100 100" width={size} height={size}>
                <Definitions />
                <circle cx="50" cy="50" r="28" fill="none" stroke="url(#gearGradFinal)" strokeWidth="14"/>
                <path d="M50 5 L50 20 M50 80 L50 95 M5 50 L20 50 M80 50 L95 50 M18 18 L30 30 M70 70 L82 82 M82 18 L70 30 M30 70 L18 82" stroke="url(#gearGradFinal)" strokeWidth="12" strokeLinecap="round"/>
                <path d="M38 38 Q42 35 45 38" stroke="white" strokeWidth="4" fill="none" opacity="0.5"/>
            </svg>
        );
    }

    // Default: Tuerca H-GESTION
    return (
        <svg viewBox="0 0 100 100" width={size} height={size}>
            <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" fill="none" stroke={color} strokeWidth="6" opacity="0.3"/>
            <circle cx="50" cy="50" r="15" fill={color}/>
        </svg>
    );
};
