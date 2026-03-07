import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { Settings, Hash, AlertCircle, ShieldCheck } from 'lucide-react';

const ConfigPage: React.FC = () => {
    const { isAdminCliente, isSuperAdmin } = useAuth();

    return (
        <div className="animate-fade">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Configuración del Sistema</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Administra los parámetros globales de tu instancia.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>

                {/* Perfil del Cliente */}
                <div className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px' }}>
                            <Settings size={20} color="#3b82f6" />
                        </div>
                        <h3 style={{ fontWeight: '600' }}>General</h3>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Configuración básica de la interfaz y comportamiento general de la plataforma.
                    </p>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: '600' }}>Próximamente:</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Módulo de logos personalizados y colores de marca.</p>
                    </div>
                </div>

                {/* Sección de Seguridad */}
                <div className="glass-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px' }}>
                            <ShieldCheck size={20} color="#10b981" />
                        </div>
                        <h3 style={{ fontWeight: '600' }}>Seguridad</h3>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        Políticas de acceso y auditoría para tu organización.
                    </p>
                    <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: '600' }}>Estado:</p>
                        <p style={{ fontSize: '0.7rem', color: '#10b981' }}>✔️ Aislamiento Multi-Tenant Activo</p>
                        <p style={{ fontSize: '0.7rem', color: '#10b981' }}>✔️ Auditoría de Eventos Activa</p>
                    </div>
                </div>

                {/* Sección de Folios - EXCLUSIVA SUPER ADMIN */}
                {isSuperAdmin && (
                    <div className="glass-card" style={{ border: '1px solid var(--primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{ padding: '0.5rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px' }}>
                                <Hash size={20} color="var(--primary)" />
                            </div>
                            <h3 style={{ fontWeight: '600' }}>Numeración de Folios</h3>
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                            Control maestro de los folios consecutivos para OTs Correctivas y Preventivas.
                        </p>
                        <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <AlertCircle size={16} color="#f59e0b" />
                                <p style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: '600' }}>Solo HCelis puede ver esta sección.</p>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Para ajustar los folios, ve al módulo de **Mantenimientos Preventivos** y usa el ícono de engrane superior.
                        </p>
                    </div>
                )}

                {/* Placeholder para Admin Cliente si es Admin. Cliente */}
                {isAdminCliente && (
                    <div className="glass-card" style={{ opacity: 0.6, border: '1px dashed var(--glass-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{ padding: '0.5rem', background: 'rgba(100, 116, 139, 0.1)', borderRadius: '10px' }}>
                                <Hash size={20} color="var(--text-muted)" />
                            </div>
                            <h3 style={{ fontWeight: '600', color: 'var(--text-muted)' }}>Administración de Folios</h3>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Esta sección está restringida para tu perfil de Administrador de Cliente. Contacta a soporte de H-GESTION si requieres ajustar un folio.
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
};

export default ConfigPage;
