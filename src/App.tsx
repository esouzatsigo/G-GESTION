import React, { useState, useMemo, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { usePanelPrefs } from './hooks/usePanelPrefs';
import { MainLayout } from './components/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { ClientesPage } from './pages/ClientesPage';
import { SucursalesPage } from './pages/SucursalesPage';
import { EquiposPage } from './pages/EquiposPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { SolicitarOTPage } from './pages/SolicitarOTPage';
import { CoordinadorDashboard } from './pages/CoordinadorDashboard';
import { MisServiciosPage } from './pages/MisServiciosPage';
import { EjecucionServicioPage } from './pages/EjecucionServicioPage';
import { KardexPage } from './pages/KardexPage';
import { PreventivosPage } from './pages/PreventivosPage';
import { BitacoraPage } from './pages/BitacoraPage';
import { SupervisarPage } from './pages/SupervisarPage';
import { FranquiciasPage } from './pages/FranquiciasPage';
import { DashboardBIPage } from './pages/DashboardBIPage';
import ConfigPage from './pages/ConfigPage';
import { CatalogosGeneralesPage } from './pages/CatalogosGeneralesPage';
import { NotificationProvider } from './context/NotificationContext';
import { SplashScreen } from './components/SplashScreen';
import { useAndroidBackButton } from './hooks/useAndroidBackButton';
// Broadway
import {
  ClipboardList,
  AlertCircle,
  History,
  Users,
  Database,
  Calendar,
  TrendingUp,
  Store,
  HardDrive,
  Settings,
  Minus
} from 'lucide-react';

const PanelOperativo = () => {
  const { user, isTecnico, isAdmin, isCoordinador, isGerente, isSuperAdmin } = useAuth();
  const { hiddenIds, toggleVisibility } = usePanelPrefs(user?.id);
  const navigate = useNavigate();

  // Initialize or reconcile sort order
  const [buttonOrder, setButtonOrder] = useState<string[]>([]);

  const availableButtons = useMemo(() => {
    const buttons = [];

    if (isTecnico) {
      buttons.push({ id: 'MIS', icon: Calendar, label: "MIS SERVICIOS", color: "16, 185, 129", path: '/mis-servicios', desc: "Ver y ejecutar los servicios programados." });
      return buttons;
    }

    // === REGLA 114: MATRIZ RBAC UNIVERSAL ===

    // BI: Admin, Coordinador, SuperAdmin
    if (isAdmin || isCoordinador || isSuperAdmin) {
      buttons.push({ id: 'BI', icon: TrendingUp, label: "INTELIGENCIA DE NEGOCIO", color: "79, 70, 229", path: '/bi-dashboard', desc: "KPIs analíticos y gráficos dinámicos del desempeño global." });
    }

    // Gestión OTs: Admin, Coordinador, SuperAdmin
    if (isAdmin || isCoordinador || isSuperAdmin) {
      buttons.push({ id: 'OTS', icon: ClipboardList, label: "GESTIÓN DE OTs", color: "37, 99, 235", path: '/ots', desc: "Administrar, asignar y dar seguimiento a las órdenes de trabajo." });
    }

    // Supervisar: Admin, Coordinador, SuperAdmin
    if (isAdmin || isCoordinador || isSuperAdmin) {
      buttons.push({ id: 'SUPER', icon: ClipboardList, label: "SUPERVISAR OTs", color: "14, 165, 233", path: '/supervisar', desc: "Autorización y cierre definitivo de OTs concluidas por el técnico." });
    }

    // Kardex: Admin, Coordinador, Gerente, SuperAdmin
    if (isAdmin || isCoordinador || isGerente || isSuperAdmin) {
      buttons.push({ id: 'KARDEX', icon: Database, label: "KARDEX (CONSULTA)", color: "99, 102, 241", path: '/kardex', desc: "Historial detallado y filtros avanzados de todas las órdenes." });
    }

    // Solicitar OT: Admin, Coordinador, Gerente, SuperAdmin
    if (isAdmin || isCoordinador || isGerente || isSuperAdmin) {
      buttons.push({ id: 'SOLICITAR', icon: AlertCircle, label: "SOLICITAR OT", color: "220, 38, 38", path: '/solicitar-ot', desc: "Crear una nueva solicitud de mantenimiento correctivo." });
    }

    // Preventivos: Admin, Coordinador, SuperAdmin
    if (isAdmin || isCoordinador || isSuperAdmin) {
      buttons.push({ id: 'PREV', icon: Calendar, label: "MANTENIMIENTOS PREVENTIVOS", color: "37, 99, 235", path: '/preventivos', desc: "Proyección a 90 días y generación de órdenes de trabajo preventivas." });
    }

    // Bitácora: Admin, Coordinador, SuperAdmin
    if (isAdmin || isCoordinador || isSuperAdmin) {
      buttons.push({ id: 'BITACORA', icon: History, label: "BITÁCORA DE EVENTOS", color: "100, 116, 139", path: '/bitacora', desc: "Auditoría de cambios y registro de interacciones del sistema." });
    }

    // --- CATÁLOGOS ---
    // Usuarios: Admin, Coordinador, SuperAdmin
    if (isAdmin || isCoordinador || isSuperAdmin) {
      buttons.push({ id: 'USERS', icon: Users, label: "USUARIOS Y TECNICOS", color: "219, 39, 119", path: '/usuarios', desc: "Administrar el personal, supervisores y coordinadores." });
    }

    // Equipos: Admin, Coordinador, Gerente, SuperAdmin
    if (isAdmin || isCoordinador || isGerente || isSuperAdmin) {
      buttons.push({ id: 'EQUIPOS', icon: HardDrive, label: "EQUIPOS", color: "71, 85, 105", path: '/equipos', desc: "Inventario general de equipos y activos a mantener." });
    }

    // Sucursales, Clientes, Franquicias, Catalogos, Config: SOLO Admin / SuperAdmin
    if (isAdmin || isSuperAdmin) {
      buttons.push({ id: 'CATALOGOS_GRAL', icon: Database, label: "CATÁLOGOS DINÁMICOS", color: "234, 179, 8", path: '/catalogos', desc: "Administrador independiente de Roles y Especialidades." });
      buttons.push({ id: 'SUCURSALES', icon: Store, label: "SUCURSALES", color: "16, 185, 129", path: '/sucursales', desc: "Directorio de sucursales con validación y ubicación." });
      buttons.push({ id: 'CLIENTES', icon: Users, label: "CLIENTES", color: "147, 51, 234", path: '/clientes', desc: "Administración del catálogo de clientes corporativos." });
      buttons.push({ id: 'FRANQUICIAS', icon: Database, label: "FRANQUICIAS", color: "234, 88, 12", path: '/franquicias', desc: "Control y diseño de franquicias por cliente." });
      buttons.push({ id: 'CONFIG', icon: Settings, label: "CONFIGURACIÓN", color: "100, 116, 139", path: '/config', desc: "Configuraciones globales como numeración de folios." });
    }

    return buttons;
  }, [isTecnico, isAdmin, isCoordinador, isGerente, isSuperAdmin]);

  useEffect(() => {
    const savedOrder = localStorage.getItem(`hgestion_btn_order_${user?.id}`);
    if (savedOrder) {
      const parsed = JSON.parse(savedOrder);
      const currentIds = availableButtons.map(b => b.id);
      const validParsed = parsed.filter((id: string) => currentIds.includes(id));
      const missing = currentIds.filter(id => !validParsed.includes(id));
      setButtonOrder([...validParsed, ...missing]);
    } else {
      setButtonOrder(availableButtons.map(b => b.id));
    }
  }, [availableButtons, user?.id]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.currentTarget.classList.add('dragging-button');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId && draggedId !== targetId) {
      setButtonOrder(prev => {
        const newOrder = [...prev];
        const draggedIdx = newOrder.indexOf(draggedId);
        const targetIdx = newOrder.indexOf(targetId);

        newOrder.splice(draggedIdx, 1);
        newOrder.splice(targetIdx, 0, draggedId);

        localStorage.setItem(`hgestion_btn_order_${user?.id}`, JSON.stringify(newOrder));
        return newOrder;
      });
    }
    document.querySelectorAll('.dragging-button').forEach(el => el.classList.remove('dragging-button'));
  };

  const orderedButtons = buttonOrder
    .map(id => availableButtons.find(b => b.id === id))
    .filter(Boolean) as typeof availableButtons;

  const visibleButtons = isTecnico ? orderedButtons : orderedButtons.filter(btn => !hiddenIds.includes(btn.id));

  if (isTecnico) return <Navigate to="/mis-servicios" replace />;

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '-0.02em' }}>
          ¡Buen día, <span style={{ color: 'var(--primary)' }}>{user?.nombre}</span>!
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>¿Qué deseas gestionar hoy en T-GESTION? (Arrastra los botones para reordenarlos)</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
        {visibleButtons.map((btn) => {
          const Icon = btn.icon;
          return (
            <div
              key={btn.id}
              draggable
              onDragStart={(e) => handleDragStart(e, btn.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, btn.id)}
              onDragEnd={(e) => e.currentTarget.classList.remove('dragging-button')}
              style={{ flex: '1 1 300px', cursor: 'grab', position: 'relative' }}
            >
              {!isTecnico && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVisibility(btn.id);
                  }}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 10,
                    transition: 'all 0.2s'
                  }}
                  title="Ocultar del panel"
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                >
                  <Minus size={18} />
                </div>
              )}
              <button
                onClick={() => navigate(btn.path)}
                className="glass-card flex-col items-center justify-center p-8 transition-all hover:scale-105 active:scale-95"
                style={{
                  display: 'flex',
                  gap: '1rem',
                  minHeight: '200px',
                  border: '1px solid var(--glass-border)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  width: '100%',
                  height: '100%'
                }}
              >
                <div style={{
                  padding: '1rem',
                  borderRadius: '20px',
                  background: `rgba(${btn.color}, 0.1)`,
                  color: `rgb(${btn.color})`
                }}>
                  <Icon size={48} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem' }}>{btn.label}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{btn.desc}</p>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      <style>{`
        .dragging-button {
          opacity: 0.5;
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
};

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <SplashScreen />;

  if (!user) return <Navigate to="/login" replace />;

  return <MainLayout>{children}</MainLayout>;
};

// Componente interno que vive DENTRO del Router para poder usar hooks de navegación
const AppWithBackButton: React.FC = () => {
  useAndroidBackButton();
  return (
    <Routes>
      {/* Public/Selection Routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes */}
      <Route
        path="/*"
        element={
          <AuthGuard>
            <Routes>
              <Route path="/" element={<PanelOperativo />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/franquicias" element={<FranquiciasPage />} />
              <Route path="/sucursales" element={<SucursalesPage />} />
              <Route path="/equipos" element={<EquiposPage />} />
              <Route path="/usuarios" element={<UsuariosPage />} />
              <Route path="/solicitar-ot" element={<SolicitarOTPage />} />
              <Route path="/ots" element={<CoordinadorDashboard />} />
              <Route path="/supervisar" element={<SupervisarPage />} />
              <Route path="/mis-servicios" element={<MisServiciosPage />} />
              <Route path="/ejecutar-servicio/:id" element={<EjecucionServicioPage />} />
              <Route path="/kardex" element={<KardexPage />} />
              <Route path="/preventivos" element={<PreventivosPage />} />
              <Route path="/bitacora" element={<BitacoraPage />} />
              <Route path="/bi-dashboard" element={<DashboardBIPage />} />
              <Route path="/catalogos" element={<CatalogosGeneralesPage />} />
              <Route path="/config" element={<ConfigPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthGuard>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <AppWithBackButton />
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
// Vite reload trigger
