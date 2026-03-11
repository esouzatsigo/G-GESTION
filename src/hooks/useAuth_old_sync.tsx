import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import type { User } from '../types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    isAdmin: boolean;
    isCoordinador: boolean;
    isGerente: boolean;
    isMultiBranchGerente: boolean;
    isSingleBranchGerente: boolean;
    isSupervisor: boolean;
    isTecnico: boolean;
    isAdminCliente: boolean;
    isSuperAdmin: boolean;
    activeClienteId: string | null;
    setActiveClienteId: (id: string | null) => void;
    loginAsRole: (role: string) => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    error: null,
    isAdmin: false,
    isCoordinador: false,
    isGerente: false,
    isMultiBranchGerente: false,
    isSingleBranchGerente: false,
    isSupervisor: false,
    isTecnico: false,
    isAdminCliente: false,
    isSuperAdmin: false,
    activeClienteId: null,
    setActiveClienteId: () => { },
    loginAsRole: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeClienteId, setActiveClienteIdState] = useState<string | null>(() => localStorage.getItem('hgestion_active_cliente'));

    const setActiveClienteId = (id: string | null) => {
        if (id) localStorage.setItem('hgestion_active_cliente', id);
        else localStorage.removeItem('hgestion_active_cliente');
        setActiveClienteIdState(id);
    };

    useEffect(() => {
        // If we have a stored mock role, use it
        const savedRole = localStorage.getItem('mockRole');
        if (savedRole) {
            setMockUser(savedRole);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userDoc = await getDoc(doc(db, 'usuarios', firebaseUser.uid));
                    if (userDoc.exists()) {
                        setUser({ id: firebaseUser.uid, ...userDoc.data() } as User);
                    } else if (firebaseUser.email === 'hhcelis@hgestion.com') {
                        setUser({
                            id: firebaseUser.uid,
                            clienteId: 'ADMIN',
                            nombre: 'HCelis',
                            email: firebaseUser.email,
                            rol: 'Admin General',
                            sucursalesPermitidas: ['TODAS'],
                        });
                    } else {
                        console.warn('Usuario autenticado sin perfil en Firestore:', firebaseUser.uid);
                        setUser(null);
                    }
                } catch (error: any) {
                    console.error('Error al obtener perfil de Firestore (¿Reglas de seguridad?):', error);
                    if (error?.code === 'unavailable') {
                        setError('Sin conexión a Internet. Se usará la caché offline.');
                    } else {
                        setError('Error al cargar el perfil del usuario.');
                    }
                    setUser(null);
                } finally {
                    setLoading(false);
                }
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const setMockUser = (role: string) => {
        const mockUsers: Record<string, User> = {
            Gerente: {
                id: 'Gerente.BA',
                nombre: 'GERENTE BA',
                email: 'gerente.ba@bpt.com',
                rol: 'Gerente',
                clienteId: 'BPT',
                sucursalesPermitidas: ['BA'],
            },
            Coordinador: {
                id: 'Coord.IvanGo',
                nombre: 'Coordinador BPT',
                email: 'ivango@bpt.com',
                rol: 'Coordinador',
                clienteId: 'BPT',
                sucursalesPermitidas: ['TODAS'],
            },
            Tecnico: {
                id: 'Tecnico.BA',
                nombre: 'TECNICO BA',
                email: 'tecnico.ba@bpt.com',
                rol: 'Tecnico',
                clienteId: 'BPT',
                sucursalesPermitidas: ['BA'],
                coordinadorId: 'Coord.IvanGo',
                supervisorId: 'Supervisor.BA',
            },
            Admin: {
                id: 'hcelis',
                nombre: 'HCelis',
                email: 'hhcelis@hgestion.com',
                rol: 'Admin General',
                clienteId: 'BPT',
                sucursalesPermitidas: ['TODAS'],
            },
            TecnicoSitio1: {
                id: 'tec.sitio.1',
                nombre: 'Tecnico de Sitio 1',
                email: 'tec@BA.com',
                rol: 'Tecnico',
                clienteId: 'BPT',
                sucursalesPermitidas: ['BA'],
                coordinadorId: 'Coord.IvanGo',
                supervisorId: 'Supervisor.BA',
            },
            Supervisor: {
                id: 'Supervisor.BA',
                nombre: 'SUPERVISOR BA',
                email: 'supervisor.ba@bpt.com',
                rol: 'Supervisor',
                clienteId: 'BPT',
                sucursalesPermitidas: ['BA'],
            }
        };

        const mockUser = mockUsers[role];
        if (mockUser) {
            setUser(mockUser);
            localStorage.setItem('mockRole', role);
            setLoading(false);
        }
    };

    const isSuperAdminUser = (user?.rol === 'Admin General' && user?.clienteId === 'ADMIN') || user?.email === 'hhcelis@hgestion.com';

    // Mask user object if impersonating
    const activeUser = React.useMemo(() => {
        if (!user) return null;
        if (isSuperAdminUser && activeClienteId && activeClienteId !== 'ADMIN') {
            return { ...user, clienteId: activeClienteId, isImpersonating: true };
        }
        return user;
    }, [user, activeClienteId, isSuperAdminUser]);

    const value = {
        user: activeUser,
        loading,
        error,
        isAdmin: user?.rol === 'Admin General',
        isCoordinador: user?.rol === 'Coordinador',
        isGerente: user?.rol === 'Gerente',
        isMultiBranchGerente: user?.rol === 'Gerente' && (user?.sucursalesPermitidas?.includes('TODAS') || (user?.sucursalesPermitidas?.length || 0) > 1),
        isSingleBranchGerente: user?.rol === 'Gerente' && !(user?.sucursalesPermitidas?.includes('TODAS') || (user?.sucursalesPermitidas?.length || 0) > 1),
        isSupervisor: user?.rol === 'Supervisor',
        isTecnico: user?.rol === 'Tecnico' || user?.rol === 'TecnicoExterno',
        isAdminCliente: user?.rol === 'Admin General' && user?.clienteId !== 'ADMIN',
        isSuperAdmin: isSuperAdminUser,
        activeClienteId: isSuperAdminUser ? (activeClienteId || 'ADMIN') : activeClienteId,
        setActiveClienteId,
        loginAsRole: setMockUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
