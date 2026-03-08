import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Star, LayoutDashboard, Wrench } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export const RoleSelectionCorpoPage: React.FC = () => {
    const { loginAsRoleCorpo } = useAuth();
    const navigate = useNavigate();

    const roles = [
        {
            id: 'QA_Gerente',
            title: 'Gerente BP Altabrisa',
            client: 'Comercializadora (Firestore)',
            icon: Building2,
            color: 'var(--primary)',
            textColor: 'var(--primary-dark)',
            bgColor: 'var(--bg-glass)',
            emails: ['Ger.Altabrisa@BP.com'],
            description: 'Acceso corporativo real a Altabrisa.',
            isQA: true
        },
        {
            id: 'QA_Coordinador',
            title: 'Coordinador BPT Gral',
            client: 'Comercializadora (Firestore)',
            icon: LayoutDashboard,
            color: 'var(--secondary)',
            textColor: 'var(--secondary-dark)',
            bgColor: 'var(--bg-glass)',
            emails: ['coord.bpt@t-sigo.com'],
            description: 'Acceso a todas las sucursales del corporativo.',
            isQA: true
        },
        {
            id: 'QA_Tecnico',
            title: 'Técnico Altabrisa',
            client: 'Comercializadora (Firestore)',
            icon: Wrench,
            color: 'var(--status-media)',
            textColor: '#b45309',
            bgColor: 'var(--bg-glass)',
            emails: ['tecnico.altabrisa@hgestion.com'],
            description: 'Técnico interno corporativo para Altabrisa.',
            isQA: true
        },
        {
            id: 'QA_Especialista',
            title: 'Esp. Cocción',
            client: 'Comercializadora (Firestore)',
            icon: Star,
            color: 'var(--priority-alta)',
            textColor: '#b91c1c',
            bgColor: 'var(--bg-glass)',
            emails: ['esp.coccion@t-sigo.com'],
            description: 'Técnico externo especialista corporativo.',
            isQA: true
        }
    ];

    const handleSelect = (roleObj: any) => {
        loginAsRoleCorpo(roleObj.id);
        // Regla 113: delay + replace para sincronía atómica
        setTimeout(() => {
            navigate('/', { replace: true });
        }, 100);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-main)',
            padding: '2rem'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '1200px',
                background: 'var(--bg-card)',
                borderRadius: '24px',
                padding: '3rem',
                boxShadow: 'var(--shadow-lg)',
                border: '1px solid var(--glass-border)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
                        borderRadius: '16px',
                        margin: '0 auto 1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)'
                    }}>
                        <Building2 size={32} />
                    </div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--text-main)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                        Simulación: <span style={{ color: 'var(--primary)' }}>C. Nacional</span>
                    </h1>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>
                        Selecciona un rol QA para probar con datos reales de Comercializadora.
                    </p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.5rem'
                }}>
                    {roles.map((roleObj) => {
                        const Icon = roleObj.icon;
                        return (
                            <button
                                key={roleObj.id}
                                onClick={() => handleSelect(roleObj)}
                                style={{
                                    background: roleObj.bgColor,
                                    border: `2px solid ${roleObj.color}`,
                                    borderRadius: '16px',
                                    padding: '1.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    textAlign: 'left'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = `0 12px 24px -8px ${roleObj.color}`;
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={{
                                    position: 'absolute',
                                    top: '-20px',
                                    right: '-20px',
                                    width: '100px',
                                    height: '100px',
                                    background: roleObj.color,
                                    opacity: 0.1,
                                    borderRadius: '50%'
                                }} />

                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', marginBottom: '1rem' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        background: roleObj.color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        flexShrink: 0
                                    }}>
                                        <Icon size={24} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: roleObj.color, fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.05em', marginBottom: '2px', textTransform: 'uppercase' }}>
                                            {roleObj.client}
                                        </div>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: roleObj.textColor }}>
                                            {roleObj.title}
                                        </h3>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                    {roleObj.description}
                                </div>
                                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', width: '100%' }}>
                                    {roleObj.emails.map(email => (
                                        <div key={email} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                            {email}
                                        </div>
                                    ))}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
