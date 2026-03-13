import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Key, Mail } from 'lucide-react';
import { auth, db } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { resolveProjectForEmail } from '../services/projectRouter';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState(''); // Nombre para registro
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { loginLight, user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // Auto-navegación si ya estamos logueados (para corregir el bug de login triple/doble post-reload)
    React.useEffect(() => {
        if (user && !authLoading) {
            navigate('/', { replace: true });
        }
    }, [user, authLoading, navigate]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        
        try {
            const safeEmail = email.trim().toLowerCase();
            
            // 1. ROUTING UNIVERSAL: Verificar si el usuario pertenece a este proyecto físico
            const targetProject = resolveProjectForEmail(safeEmail);
            const { getActiveProjectKey, switchFirebaseProject } = await import('../services/firebase');
            const currentProject = getActiveProjectKey();

            if (targetProject !== currentProject) {
                setError('Cambiando de entorno...');
                // Guardar credenciales temporalmente para auto-login tras el swap
                if (!isRegistering) {
                    localStorage.setItem('hgestion_pending_email', safeEmail);
                    if (password === '12345678') {
                        localStorage.setItem('hgestion_pending_login', safeEmail);
                    }
                }
                switchFirebaseProject(targetProject);
                return; // El reload detendrá la ejecución
            }

            if (isRegistering) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, 'usuarios', userCredential.user.uid), {
                    nombre: nombre || 'Usuario Nuevo',
                    email,
                    rol: 'Admin General',
                    clienteId: 'ADMIN',
                    sucursalesPermitidas: ['TODAS'],
                    activo: true,
                });
            } else {
                // LOGIN LIGHT (BYPASS)
                if (password === '12345678') {
                    const status = await loginLight(email);
                    if (status === 'success') {
                        navigate('/');
                        return;
                    } else if (status === 'swapping') {
                        setError('Redireccionando...');
                        return;
                    } else {
                        setError('Usuario no encontrado en modo rápido.');
                        return;
                    }
                }
                
                // LOGIN ESTÁNDAR (REAL)
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err: any) {
            console.error('Auth Error:', err);
            // ... (manejo de errores de firebase igual al original)
            if (err?.code) {
                switch (err.code) {
                    case 'auth/email-already-in-use': setError('El correo ya está registrado.'); break;
                    case 'auth/invalid-email': setError('Correo no válido.'); break;
                    case 'auth/invalid-credential': setError('Credenciales inválidas.'); break;
                    case 'auth/user-not-found': setError('Usuario no existe en este entorno.'); break;
                    default: setError('Error de conexión o datos incorrectos.');
                }
            } else {
                setError('Error inesperado.');
            }
        } finally {
            setLoading(false);
        }
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
            <div className="glass-card animate-fade" style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        display: 'inline-flex',
                        padding: '1.5rem',
                        borderRadius: '24px',
                        background: 'rgba(59, 130, 246, 0.05)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        marginBottom: '1.5rem'
                    }}>
                        <svg viewBox="0 0 100 100" style={{ width: '64px', height: '64px' }}>
                            <path 
                                d="M50 5 L93 36 L76 88 L24 88 L7 36 Z" 
                                fill="none" 
                                stroke="rgba(255,255,255,0.2)" 
                                strokeWidth="3"
                            />
                            <path 
                                d="M50 85C50 85 30 70 30 50C30 35 40 25 45 20C45 20 40 35 40 45C40 55 50 65 50 65C50 65 60 55 60 45C60 35 55 20 55 20C55 20 70 35 70 50C70 70 50 85 50 85Z" 
                                fill="var(--primary)" 
                            />
                        </svg>
                    </div>
                    <h1 style={{ fontSize: '2.2rem', fontWeight: '900', letterSpacing: '-0.05em', color: '#ffffff' }}>T-GESTION</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: '600' }}>TRABAJO EFICIENTE</p>
                </div>
                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {isRegistering && (
                        <div className="input-group">
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Nombre Completo</label>
                            <input
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                placeholder="Tu nombre"
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '12px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-main)',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    )}
                    <div className="input-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Email</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="usuario@hgestion.com"
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.85rem 1rem 0.85rem 3.2rem',
                                    borderRadius: '12px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-main)',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                    </div>
                    <div className="input-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <Key size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.85rem 1rem 0.85rem 3.2rem',
                                    borderRadius: '12px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-main)',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                    </div>
                    {error && <p style={{ color: 'var(--priority-alta)', fontSize: '0.75rem', textAlign: 'center' }}>{error}</p>}
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                        style={{ marginTop: '1rem', width: '100%', padding: '1rem' }}
                    >
                        {loading ? 'Procesando...' : (isRegistering ? 'Crear Cuenta Administradora' : 'Entrar al Sistema')}
                        {!loading && <LogIn size={20} />}
                    </button>
                </form>
                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.875rem' }}
                    >
                        {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí'}
                    </button>
                </div>
                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Acceso Autorizado para Personal de Sucursal y Técnicos.
                    </p>
                </div>
                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: '800' }}>
                        H-GESTIÓN v1.52 • {localStorage.getItem('hgestion_project_key')?.replace('_', ' ') || 'LOBBY'}
                    </p>
                </div>
            </div>
        </div>
    );
};
