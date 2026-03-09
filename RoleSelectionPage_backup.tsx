import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { User } from '../types';
import { ShieldCheck, UserCheck, Settings, Wrench, Star } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export const RoleSelectionPage: React.FC = () => {
    const navigate = useNavigate();
    const { loginAsRole, loginAsRoleCorpo } = useAuth();
    const { showNotification } = useNotification();

    const roles = [
        {
            id: 'Gerente',
            title: 'Gerente de Sucursal',
            icon: <UserCheck size={32} />,
            desc: 'Gestión de equipos y solicitudes de la sucursal.',
            color: '#3b82f6'
        },
        {
            id: 'Coordinador',
            title: 'Coordinador',
            icon: <Settings size={32} />,
            desc: 'Asignación y seguimiento de órdenes de trabajo.',
            color: '#10b981'
        },
        {
            id: 'Tecnico',
            title: 'Técnico',
            icon: <Wrench size={32} />,
            desc: 'Ejecución y reporte de servicios de mantenimiento.',
            color: '#F59E0B'
        },
        {
            id: 'Supervisor',
            title: 'Supervisor',
            icon: <ShieldCheck size={32} />,
            desc: 'Autorización y cierre definitivo de OTs concluidas.',
            color: '#8b5cf6'
        },
        {
            id: 'TecnicoSitio1',
            title: 'Tecnico de Sitio 1',
            icon: <Wrench size={32} />,
            desc: 'Acceso directo como Técnico de la sucursal Altabrisa.',
            color: '#06b6d4'
        },
        {
            id: 'Admin',
            title: 'Acceso Full (HCelis)',
            icon: <ShieldCheck size={32} />,
            desc: 'Acceso total a catálogos y configuración de sistema.',
            color: '#ef4444'
        },
        {
            id: 'TecExternoAires',
            title: 'Tec. Externo AIRES',
            icon: <Wrench size={32} />,
            desc: 'Técnico Externo especialista en Aires — TEST BPT.',
            color: '#0ea5e9'
        },
        // --- BOTONES EXCLUSIVOS DE SIMULACIÓN QA ---
        {
            id: 'QA_Gerente',
            title: 'Gerente Boston\'s',
            icon: <Star size={32} />,
            desc: 'Gerente.Altabrisa@BP.com',
            color: '#3b82f6',
            email: 'Ger.Altabrisa@BP.com',
            isQA: true
        },
        {
            id: 'QA_Coordinador',
            title: 'Coordinador BPT',
            icon: <Star size={32} />,
            desc: 'coord.bpt@t-sigo.com',
            color: '#10b981',
            email: 'coord.bpt@t-sigo.com',
            isQA: true
        },
        {
            id: 'QA_Tecnico',
            title: 'Tec. Interno BA',
            icon: <Star size={32} />,
            desc: 'tecnico.altabrisa@hgestion.com',
            color: '#F59E0B',
            email: 'tecnico.altabrisa@hgestion.com',
            isQA: true
        },
        {
            id: 'QA_Especialista',
            title: 'Esp. Cocción',
            icon: <Star size={32} />,
            desc: 'esp.coccion@t-sigo.com',
            color: '#ef4444',
            email: 'esp.coccion@t-sigo.com',
            isQA: true
        }
    ];

    const handlePopulate = async () => {
        try {
            const { saveCliente } = await import('../services/dataService');
            const { db } = await import('../services/firebase');
            const { doc, setDoc } = await import('firebase/firestore');
            const mockUser = { id: 'DEBUG_UI', nombre: 'Poblador Automático', rol: 'Admin General', clienteId: 'ADMIN' } as User;
            const cId = await saveCliente({ nombre: "BPT", razonSocial: "GRUPO BOSPATEX SAPI DE CV" }, mockUser);
            const sucs = [
                { id: "BA", franquiciaId: "mock-boston", nombre: "Altabrisa", direccion: "Av. 7 451, Fraccionamiento Altabrisa, 97130 Mérida, YUC", coordenadas: { lat: 21.018751250251654, lng: -89.58276096432154 }, clienteId: cId },
                { id: "BM", franquiciaId: "mock-boston", nombre: "Montejo", direccion: "Gran Plaza Montejo, Mérida", coordenadas: { lat: 21.028278889524636, lng: -89.62492593138924 }, clienteId: cId }
            ];
            for (const s of sucs) await setDoc(doc(db, 'sucursales', s.id), s);
            const eqs = [
                { id: "1", sucursalId: "BA", familia: "Refrigeracion", nombre: "Refrigerador de Masas 1", clienteId: cId },
                { id: "2", sucursalId: "BA", familia: "Refrigeracion", nombre: "Refrigerador de Postres 1", clienteId: cId },
                { id: "3", sucursalId: "BM", familia: "Refrigeracion", nombre: "Refrigerador de Masas 1", clienteId: cId },
                { id: "4", sucursalId: "BM", familia: "Refrigeracion", nombre: "Refrigerador de Postres 1", clienteId: cId }
            ];
            for (const e of eqs) await setDoc(doc(db, 'equipos', e.id), e);
            /* Creación de usuarios de prueba removida a petición del usuario
            const usrs = [
                { id: "Coord.IvanGo", nombre: "Coordinador BPT", rol: "Coordinador", clienteId: cId, sucursalesPermitidas: ["BA", "BM"] },
                { id: "Gerente.BA", nombre: "GERENTE BA", rol: "Gerente", clienteId: cId, sucursalesPermitidas: ["BA"] },
                { id: "Supervisor.BA", nombre: "SUPERVISOR BA", rol: "Supervisor", clienteId: cId, sucursalesPermitidas: ["BA"] },
                { id: "Tecnico.BA", nombre: "Tecnico BA", rol: "Tecnico", clienteId: cId, sucursalesPermitidas: ["BA"], especialidad: "Refrigeracion", supervisorId: "Supervisor.BA", coordinadorId: "Coord.IvanGo" }
            ];
            for (const u of usrs) await setDoc(doc(db, 'usuarios', u.id), u);
            */

            showNotification("Población rápida (Clientes, Sucursales, Equipos) exitosa.", "success");
        } catch (error: any) {
            showNotification("Error al poblar: " + error.message, "error");
        }
    };

    const handleSelect = async (roleObj: any) => {
        const role = roleObj.id;
        if (roleObj.isQA) {
            loginAsRoleCorpo(role);
        } else {
            loginAsRole(role);
        }

        // Regla 113: delay + replace para sincronía atómica
        setTimeout(() => {
            navigate('/', { replace: true });
        }, 100);
    };

    const handleReset = () => {
        localStorage.clear();
        window.location.reload();
    };

    return (
        <div className="login-container" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '1rem',
            background: 'var(--bg-main)'
        }}>
            <div className="animate-fade" style={{ width: '100%', maxWidth: '900px' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{
                        display: 'inline-flex',
                        padding: '1rem',
                        borderRadius: '20px',
                        background: 'rgba(37, 99, 235, 0.15)',
                        marginBottom: '1rem'
                    }}>
                        <ShieldCheck size={40} color="#3b82f6" />
                    </div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-0.025em', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                        H-GESTION
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                        Acceso Temporal: Seleccione un perfil para continuar
                    </p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.5rem'
                }}>
                    {roles.map((role) => (
                        <button
                            key={role.id}
                            onClick={() => handleSelect(role)}
                            className="glass-card"
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                padding: '2.5rem 2rem',
                                cursor: 'pointer',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                transition: 'all 0.3s ease',
                                background: 'var(--bg-input)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-5px)';
                                e.currentTarget.style.background = 'var(--bg-input)';
                                e.currentTarget.style.borderColor = role.color + '44';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            }}
                        >
                            <div style={{
                                padding: '1.25rem',
                                borderRadius: '16px',
                                background: `${role.color}15`,
                                color: role.color,
                                marginBottom: '1.5rem'
                            }}>
                                {role.icon}
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                                {role.title}
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                {role.desc}
                            </p>
                        </button>
                    ))}
                </div>

                <div style={{ marginTop: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <button
                        id="debug-populate-users"
                        onClick={handlePopulate}
                        style={{ opacity: 0.1, background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                    >
                        .
                    </button>
                    <button
                        onClick={handleReset}
                        style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                        Resetear Sesión Local (Si tienes problemas para entrar)
                    </button>
                </div>

                <p style={{
                    textAlign: 'center',
                    marginTop: '3rem',
                    color: 'rgba(255, 255, 255, 0.3)',
                    fontSize: '0.8rem'
                }}>
                    Modo de demostración activo. Los datos persistirán localmente durante esta sesión.
                </p>
            </div>
        </div>
    );
};
