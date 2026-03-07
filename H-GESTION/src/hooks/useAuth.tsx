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
    isGerenteBA: boolean;
    isGerenteSucursal: boolean;
    isSupervisor: boolean;
    isTecnico: boolean;
    loginAsRole: (role: string) => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    error: null,
    isAdmin: false,
    isCoordinador: false,
    isGerente: false,
    isGerenteBA: false,
    isGerenteSucursal: false,
    isSupervisor: false,
    isTecnico: false,
    loginAsRole: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                            clientId: 'ADMIN',
                            nombre: 'HCelis',
                            email: firebaseUser.email,
                            rol: 'Admin',
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
                clientId: 'BPT',
                sucursalesPermitidas: ['BA'],
            },
            Coordinador: {
                id: 'Coord.IvanGo',
                nombre: 'Coordinador BPT',
                email: 'ivango@bpt.com',
                rol: 'Coordinador',
                clientId: 'BPT',
                sucursalesPermitidas: ['TODAS'],
            },
            Tecnico: {
                id: 'Tecnico.BA',
                nombre: 'TECNICO BA',
                email: 'tecnico.ba@bpt.com',
                rol: 'Tecnico',
                clientId: 'BPT',
                sucursalesPermitidas: ['BA'],
                coordinadorId: 'Coord.IvanGo',
                supervisorId: 'Supervisor.BA',
            },
            Admin: {
                id: 'hcelis',
                nombre: 'HCelis',
                email: 'hhcelis@hgestion.com',
                rol: 'Admin',
                clientId: 'BPT',
                sucursalesPermitidas: ['TODAS'],
            },
            TecnicoSitio1: {
                id: 'tec.sitio.1',
                nombre: 'Tecnico de Sitio 1',
                email: 'tec@BA.com',
                rol: 'Tecnico',
                clientId: 'BPT',
                sucursalesPermitidas: ['BA'],
                coordinadorId: 'Coord.IvanGo',
                supervisorId: 'Supervisor.BA',
            },
            Supervisor: {
                id: 'Supervisor.BA',
                nombre: 'SUPERVISOR BA',
                email: 'supervisor.ba@bpt.com',
                rol: 'Supervisor',
                clientId: 'BPT',
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

    const value = {
        user,
        loading,
        error,
        isAdmin: user?.rol === 'Admin',
        isCoordinador: user?.rol === 'Coordinador',
        isGerente: user?.rol === 'Gerente',
        isGerenteBA: user?.rol === 'Gerente' && (user?.nombre.toUpperCase().includes('BA') || user?.sucursalesPermitidas.includes('TODAS') || user?.sucursalesPermitidas.length > 1),
        isGerenteSucursal: user?.rol === 'Gerente' && !(user?.nombre.toUpperCase().includes('BA') || user?.sucursalesPermitidas.includes('TODAS') || user?.sucursalesPermitidas.length > 1),
        isSupervisor: user?.rol === 'Supervisor',
        isTecnico: user?.rol === 'Tecnico' || user?.rol === 'TecnicoExterno',
        loginAsRole: setMockUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
