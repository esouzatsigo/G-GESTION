import React from 'react';
import {
    LayoutDashboard,
    ClipboardList,
    Settings,
    Users,
    LogOut,
    Menu,
    X,
    Bell,
    User as UserIcon,
    Store,
    HardDrive,
    AlertCircle,
    Database,
    History,
    Calendar,
    ArrowLeft,
    Sun,
    Moon,
    Plus,
    Minus
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { auth } from '../services/firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePanelPrefs } from '../hooks/usePanelPrefs';
import { AdminClientSelector } from './AdminClientSelector';

interface NavItemProps {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    onClick?: () => void;
    panelId?: string;
    isInPanel?: boolean;
    onTogglePanel?: (id: string) => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, active, onClick, panelId, isInPanel, onTogglePanel }) => (
    <button
        onClick={onClick}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.875rem 1rem',
            width: '100%',
            border: 'none',
            background: active ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
            color: active ? 'var(--accent)' : 'var(--text-muted)',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontWeight: active ? '600' : '400',
            textAlign: 'left',
            position: 'relative'
        }}
    >
        <Icon size={20} />
        <span style={{ flex: 1 }}>{label}</span>
        {panelId && onTogglePanel && (
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    onTogglePanel(panelId);
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: isInPanel ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    color: isInPanel ? '#ef4444' : '#10b981',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
                title={isInPanel ? "Quitar del Panel Operativo" : "Agregar al Panel Operativo"}
            >
                {isInPanel ? <Minus size={14} /> : <Plus size={14} />}
            </div>
        )}
    </button>
);

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isAdmin, isCoordinador, isGerente, isGerenteBA, isSupervisor, isTecnico } = useAuth();
    const { hiddenIds, toggleVisibility } = usePanelPrefs(user?.id);
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
        const saved = localStorage.getItem('theme');
        if (saved === 'light' || saved === 'dark') return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => auth.signOut();
    const isPathActive = (path: string) => location.pathname === path;

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const handleNavigation = (path: string) => {
        navigate(path);
        setIsSidebarOpen(false);
    };

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isSidebarOpen) {
                setIsSidebarOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSidebarOpen]);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
            {/* Sidebar - Desktop & Tablet */}
            <aside style={{
                width: '280px',
                borderRight: '1px solid var(--glass-border)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
                background: 'var(--bg-card)',
                backdropFilter: 'var(--glass-blur)',
                zIndex: 50,
                position: 'fixed',
                height: '100vh',
                left: isSidebarOpen ? '0' : '-280px',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }} className="sidebar-container">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.5rem' }}>
                    <div style={{ width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '8px' }}></div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>H-GESTION</h2>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, overflowY: 'auto' }}>
                    <NavItem icon={LayoutDashboard} label="Panel Operativo" active={isPathActive('/')} onClick={() => handleNavigation('/')} />

                    {(isAdmin || isCoordinador || isGerenteBA) && (
                        <NavItem
                            icon={ClipboardList} label="Ordenes de Trabajo" active={isPathActive('/ots')} onClick={() => handleNavigation('/ots')}
                            panelId="OTS" isInPanel={!hiddenIds.includes("OTS")} onTogglePanel={!isTecnico ? toggleVisibility : undefined}
                        />
                    )}
                    {(isSupervisor || isAdmin) && (
                        <NavItem
                            icon={ClipboardList} label="SUPERVISAR OTs CONCLUIDAS" active={isPathActive('/supervisar')} onClick={() => handleNavigation('/supervisar')}
                            panelId="SUPER" isInPanel={!hiddenIds.includes("SUPER")} onTogglePanel={!isTecnico ? toggleVisibility : undefined}
                        />
                    )}

                    {(isAdmin || isCoordinador || isGerenteBA || isSupervisor) && (
                        <NavItem
                            icon={Database} label="CONSULTA DE ORDENES" active={isPathActive('/kardex')} onClick={() => handleNavigation('/kardex')}
                            panelId="KARDEX" isInPanel={!hiddenIds.includes("KARDEX")} onTogglePanel={!isTecnico ? toggleVisibility : undefined}
                        />
                    )}

                    {(isAdmin || isCoordinador) && (
                        <NavItem
                            icon={Calendar} label="Mantenimientos Preventivos" active={isPathActive('/preventivos')} onClick={() => handleNavigation('/preventivos')}
                            panelId="PREV" isInPanel={!hiddenIds.includes("PREV")} onTogglePanel={!isTecnico ? toggleVisibility : undefined}
                        />
                    )}

                    {(isAdmin || isCoordinador) && (
                        <NavItem
                            icon={History} label="Bitácora de Auditoría" active={isPathActive('/bitacora')} onClick={() => handleNavigation('/bitacora')}
                            panelId="BITACORA" isInPanel={!hiddenIds.includes("BITACORA")} onTogglePanel={!isTecnico ? toggleVisibility : undefined}
                        />
                    )}

                    {(isGerente || isCoordinador || isAdmin) && (
                        <NavItem
                            icon={AlertCircle} label="Solicitar OT Correctiva" active={isPathActive('/solicitar-ot')} onClick={() => handleNavigation('/solicitar-ot')}
                            panelId="SOLICITAR" isInPanel={!hiddenIds.includes("SOLICITAR")} onTogglePanel={!isTecnico ? toggleVisibility : undefined}
                        />
                    )}

                    {isTecnico && (
                        <NavItem icon={ClipboardList} label="Mis Servicios" active={isPathActive('/mis-servicios')} onClick={() => handleNavigation('/mis-servicios')} />
                    )}

                    {isAdmin && (
                        <>
                            <div style={{ padding: '1rem 0.5rem 0.5rem', fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Catálogos</div>
                            <NavItem icon={Users} label="Clientes" active={isPathActive('/clientes')} onClick={() => handleNavigation('/clientes')} panelId="CLIENTES" isInPanel={!hiddenIds.includes("CLIENTES")} onTogglePanel={!isTecnico ? toggleVisibility : undefined} />
                            <NavItem icon={Database} label="Franquicias" active={isPathActive('/franquicias')} onClick={() => handleNavigation('/franquicias')} panelId="FRANQUICIAS" isInPanel={!hiddenIds.includes("FRANQUICIAS")} onTogglePanel={!isTecnico ? toggleVisibility : undefined} />
                            <NavItem icon={Store} label="Sucursales" active={isPathActive('/sucursales')} onClick={() => handleNavigation('/sucursales')} panelId="SUCURSALES" isInPanel={!hiddenIds.includes("SUCURSALES")} onTogglePanel={!isTecnico ? toggleVisibility : undefined} />
                            <NavItem icon={HardDrive} label="Equipos" active={isPathActive('/equipos')} onClick={() => handleNavigation('/equipos')} panelId="EQUIPOS" isInPanel={!hiddenIds.includes("EQUIPOS")} onTogglePanel={!isTecnico ? toggleVisibility : undefined} />
                            <NavItem icon={Users} label="Usuarios" active={isPathActive('/usuarios')} onClick={() => handleNavigation('/usuarios')} panelId="USERS" isInPanel={!hiddenIds.includes("USERS")} onTogglePanel={!isTecnico ? toggleVisibility : undefined} />
                        </>
                    )}

                    <div style={{ marginTop: 'auto' }}>
                        <NavItem icon={Settings} label="Configuración" active={isPathActive('/config')} onClick={() => handleNavigation('/config')} panelId="CONFIG" isInPanel={!hiddenIds.includes("CONFIG")} onTogglePanel={!isTecnico ? toggleVisibility : undefined} />
                    </div>
                </nav>

                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', padding: '0 0.5rem' }}>
                        <div style={{ width: '40px', height: '40px', background: 'var(--bg-glass)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <UserIcon size={20} />
                        </div>
                        <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: '600' }}>{user?.nombre}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user?.rol}</p>
                        </div>
                    </div>
                    <NavItem icon={LogOut} label="Cerrar Sesión" onClick={handleLogout} />
                </div>
            </aside>

            {/* Main Content Area */}
            <main style={{
                flex: 1,
                marginLeft: '0',
                padding: '1.5rem',
                minHeight: '100vh',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }} className="main-content">
                {/* Header - Mobile & Global Notifications */}
                <header style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '2rem',
                    background: 'var(--bg-card)',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '16px',
                    backdropFilter: 'var(--glass-blur)',
                    border: '1px solid var(--glass-border)',
                    position: 'sticky',
                    top: '0',
                    zIndex: 40
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>

                        {location.pathname !== '/' && (
                            <button
                                onClick={() => navigate(-1)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.4rem',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--glass-border)',
                                    color: 'var(--text-muted)',
                                    padding: '0.4rem 0.8rem',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            >
                                <ArrowLeft size={16} />
                                VOLVER
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '800', letterSpacing: '0.02em', color: 'var(--primary-light)' }}>
                            {user?.nombre?.toUpperCase()}
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            {user?.rol}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {user?.rol === 'Admin' && <AdminClientSelector />}
                        <button
                            onClick={toggleTheme}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
                        >
                            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>

                        <button style={{ position: 'relative', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <Bell size={20} />
                            <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', background: 'var(--priority-alta)', borderRadius: '50%' }}></div>
                        </button>
                    </div>
                </header>

                {/* Content Rendered Here */}
                {children}
            </main>

            {/* Mobile Backdrop */}
            {isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 45,
                        transition: 'opacity 0.3s'
                    }}
                />
            )}

            <style>{`
        @media (min-width: 1024px) {
          .sidebar-container { 
            left: ${isSidebarOpen ? '0' : '-280px'} !important;
          }
          .main-content { 
            margin-left: ${isSidebarOpen ? '280px' : '0'} !important;
          }
          header button:first-child { 
            display: block !important; 
          }
        }
      `}</style>
        </div>
    );
};
