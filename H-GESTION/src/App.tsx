import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { RoleSelectionPage } from './pages/RoleSelectionPage';
import { AuthProvider, useAuth } from './hooks/useAuth';
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
import { NotificationProvider } from './context/NotificationContext';

import {
  ClipboardList,
  AlertCircle,
  History,
  Users,
  Database,
  Calendar
} from 'lucide-react';

const PanelOperativo = () => {
  const { user, isAdmin, isCoordinador, isGerente, isGerenteBA, isTecnico, isSupervisor } = useAuth();
  const navigate = useNavigate();

  const ActionButton = ({ icon: Icon, label, color, onClick, description }: any) => (
    <button
      onClick={onClick}
      className="glass-card flex-col items-center justify-center p-8 transition-all hover:scale-105 active:scale-95"
      style={{
        display: 'flex',
        gap: '1rem',
        minHeight: '200px',
        border: '1px solid var(--glass-border)',
        cursor: 'pointer',
        textAlign: 'center',
        flex: '1 1 300px'
      }}
    >
      <div style={{
        padding: '1rem',
        borderRadius: '20px',
        background: `rgba(${color}, 0.1)`,
        color: `rgb(${color})`
      }}>
        <Icon size={48} />
      </div>
      <div>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.5rem' }}>{label}</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{description}</p>
      </div>
    </button>
  );

  return (
    <div className="animate-fade">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '-0.02em' }}>
          ¡Buen día, <span style={{ color: 'var(--primary)' }}>{user?.nombre}</span>!
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>¿Qué deseas gestionar hoy en H-GESTION?</p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
        {/* Coordinador / Admin */}
        {(isAdmin || isCoordinador) && (
          <ActionButton
            icon={ClipboardList} label="GESTIÓN DE OTs" color="37, 99, 235"
            onClick={() => navigate('/ots')}
            description="Administrar, asignar y dar seguimiento a las órdenes de trabajo."
          />
        )}

        {/* Supervisor / Admin */}
        {(isSupervisor || isAdmin) && (
          <ActionButton
            icon={ClipboardList} label="SUPERVISAR OTs" color="37, 99, 235"
            onClick={() => navigate('/supervisar')}
            description="Autorización y cierre definitivo de OTs concluidas por el técnico."
          />
        )}

        {(isAdmin || isCoordinador || isSupervisor || isGerenteBA) && (
          <ActionButton
            icon={Database} label="KARDEX (CONSULTA)" color="139, 92, 246"
            onClick={() => navigate('/kardex')}
            description="Historial detallado y filtros avanzados de todas las órdenes."
          />
        )}

        {/* Gerente / Admin / Coordinador */}
        {(isGerente || isCoordinador || isAdmin) && (
          <ActionButton
            icon={AlertCircle} label="SOLICITAR OT" color="239, 68, 68"
            onClick={() => navigate('/solicitar-ot')}
            description="Crear una nueva solicitud de mantenimiento correctivo."
          />
        )}

        {/* Técnico */}
        {isTecnico && (
          <>
            <ActionButton
              icon={Calendar} label="MIS SERVICIOS" color="16, 185, 129"
              onClick={() => navigate('/mis-servicios')}
              description="Ver y ejecutar los servicios programados."
            />
          </>
        )}

        {/* Preventivos - Admin / Coordinador */}
        {(isAdmin || isCoordinador) && (
          <ActionButton
            icon={Calendar} label="MANTENIMIENTOS PREVENTIVOS" color="37, 99, 235"
            onClick={() => navigate('/preventivos')}
            description="Proyección a 90 días y generación de órdenes de trabajo preventivas."
          />
        )}

        {/* Bitácora - Solo Admin/Coordinador */}
        {(isAdmin || isCoordinador) && (
          <ActionButton
            icon={History} label="BITÁCORA DE EVENTOS" color="245, 158, 11"
            onClick={() => navigate('/bitacora')}
            description="Auditoría de cambios y registro de interacciones del sistema."
          />
        )}

        {/* Catálogos - Solo Admin */}
        {isAdmin && (
          <ActionButton
            icon={Users} label="USUARIOS Y TECNICOS" color="236, 72, 153"
            onClick={() => navigate('/usuarios')}
            description="Administrar el personal, supervisores y coordinadores."
          />
        )}
      </div>
    </div>
  );
};

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-main)' }}>
      <div style={{ color: 'var(--primary)', fontWeight: '600' }}>Cargando H-GESTION...</div>
    </div>
  );

  if (!user) return <Navigate to="/seleccion-rol" />;

  return <MainLayout>{children}</MainLayout>;
};

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <Routes>
            <Route path="/seleccion-rol" element={<RoleSelectionPage />} />
            <Route path="/login" element={<LoginPage />} />
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
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </AuthGuard>
              }
            />
          </Routes>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
// Vite reload trigger
