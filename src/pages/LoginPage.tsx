import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Key, Mail, ShieldCheck } from 'lucide-react';
import { auth, db } from '../services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

export const LoginPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState(''); // Nombre para registro
    const [isRegistering, setIsRegistering] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { loginLight } = useAuth();
    const navigate = useNavigate();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isRegistering) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, 'usuarios', userCredential.user.uid), {
                    nombre: nombre || 'Usuario Nuevo',
                    email,
                    rol: 'Admin',
                    clienteId: 'ADMIN',
                    sucursalesPermitidas: ['TODAS'],
                    activo: true,
                });
            } else {
                // BYPASS "LIGHT"
                if (password === '12345678') {
                    const success = await loginLight(email);
                    if (success) {
                        navigate('/');
                        return; // Exito
                    } else {
                        setError('El usuario no existe en la base de datos para acceso rápido.');
                        return;
                    }
                }
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err: any) {
            if (err?.code) {
                switch (err.code) {
                    case 'auth/email-already-in-use':
                        setError('El correo ya está registrado. Intenta iniciar sesión.');
                        break;
                    case 'auth/invalid-email':
                        setError('El correo ingresado no es válido.');
                        break;
                    case 'auth/invalid-credential':
                        setError('Credenciales inválidas. Verifica tu email y contraseña.');
                        break;
                    case 'auth/weak-password':
                        setError('La contraseña es demasiado débil. Usa al menos 6 caracteres.');
                        break;
                    case 'auth/wrong-password':
                        setError('Contraseña incorrecta.');
                        break;
                    case 'auth/user-not-found':
                        setError('No existe una cuenta con ese correo.');
                        break;
                    default:
                        setError(isRegistering ? 'Error al crear cuenta.' : 'Credenciales incorrectas o error de conexión.');
                }
            } else {
                setError(isRegistering ? 'Error al crear cuenta.' : 'Credenciales incorrectas o error de conexión.');
            }
            console.error(err);
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
                        padding: '1rem',
                        borderRadius: '20px',
                        background: 'rgba(37, 99, 235, 0.15)',
                        marginBottom: '1rem'
                    }}>
                        <ShieldCheck size={40} color="var(--primary)" />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '700', letterSpacing: '-0.025em' }}>H-GESTION</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sistema de Mantenimiento Boston's &amp; Co.</p>
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
                                    outline: 'none'
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
                                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                                    borderRadius: '12px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-main)',
                                    outline: 'none'
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
                                    padding: '0.75rem 1rem 0.75rem 2.5rem',
                                    borderRadius: '12px',
                                    border: '1px solid var(--glass-border)',
                                    background: 'var(--bg-input)',
                                    color: 'var(--text-main)',
                                    outline: 'none'
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
            </div>
        </div>
    );
};
