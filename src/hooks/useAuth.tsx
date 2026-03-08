import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
    isAdminCliente: boolean;
    isSuperAdmin: boolean;
    activeClienteId: string | null;
    activeClienteNombre: string | null;
    setActiveClienteId: (id: string | null, name?: string | null) => void;
    loginAsRole: (role: string) => void;
    loginAsRoleCorpo: (role: string) => void;
    loginLight: (email: string) => Promise<boolean>;
    logout: () => void;
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
    isAdminCliente: false,
    isSuperAdmin: false,
    activeClienteId: null,
    activeClienteNombre: null,
    setActiveClienteId: () => { },
    loginAsRole: () => { },
    loginAsRoleCorpo: () => { },
    loginLight: async () => false,
    logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeClienteId, setActiveClienteIdState] = useState<string | null>(() => localStorage.getItem('hgestion_active_cliente'));
    const [activeClienteNombre, setActiveClienteNombreState] = useState<string | null>(() => localStorage.getItem('hgestion_active_cliente_name'));

    const setActiveClienteId = (id: string | null, name?: string | null) => {
        if (id) {
            localStorage.setItem('hgestion_active_cliente', id);
            if (name) {
                localStorage.setItem('hgestion_active_cliente_name', name);
                setActiveClienteNombreState(name);
            }
        } else {
            localStorage.removeItem('hgestion_active_cliente');
            localStorage.removeItem('hgestion_active_cliente_name');
            setActiveClienteNombreState(null);
        }
        setActiveClienteIdState(id);
    };

    const logout = () => {
        localStorage.removeItem('mockRole');
        localStorage.removeItem('hgestion_light_user');
        localStorage.removeItem('hgestion_active_cliente');
        localStorage.removeItem('hgestion_active_cliente_name');
        auth.signOut();
        setUser(null);
        setLoading(false);
    };

    useEffect(() => {
        const init = async () => {
            const savedLightUser = localStorage.getItem('hgestion_light_user');
            if (savedLightUser) {
                setUser(JSON.parse(savedLightUser));
                setLoading(false);
                return;
            }

            const savedRole = localStorage.getItem('mockRole');
            if (savedRole) {
                // ... (existing mock logic)
                const allMockUsers: Record<string, User> = {
                    Gerente: { id: 'Gerente.BA', nombre: 'GERENTE BA', email: 'gerente.ba@bpt.com', rol: 'Gerente', clienteId: '3de6K2GeasZhN2GIQWXw', clienteNombre: 'TEST BPT', sucursalesPermitidas: ['BA'] },
                    Coordinador: { id: 'Coord.IvanGo', nombre: 'Coordinador BPT', email: 'ivango@bpt.com', rol: 'Coordinador', clienteId: '3de6K2GeasZhN2GIQWXw', clienteNombre: 'TEST BPT', sucursalesPermitidas: ['TODAS'] },
                    Tecnico: { id: 'Tecnico.BA', nombre: 'TECNICO BA', email: 'tecnico.ba@bpt.com', rol: 'Tecnico', clienteId: '3de6K2GeasZhN2GIQWXw', clienteNombre: 'TEST BPT', sucursalesPermitidas: ['BA'], coordinadorId: 'Coord.IvanGo', supervisorId: 'Supervisor.BA' },
                    Admin: { id: 'hcelis', nombre: 'HCelis', email: 'hhcelis@hgestion.com', rol: 'Admin', clienteId: 'ADMIN', clienteNombre: 'H-GESTION GLOBAL', sucursalesPermitidas: ['TODAS'] },
                    Supervisor: { id: 'Supervisor.BA', nombre: 'SUPERVISOR BA', email: 'supervisor.ba@bpt.com', rol: 'Supervisor', clienteId: '3de6K2GeasZhN2GIQWXw', clienteNombre: 'TEST BPT', sucursalesPermitidas: ['BA'] },
                    QA_Gerente: { id: 'empiiN18VlLXZlXq45i4', nombre: 'Gerente BP Altabrisa', email: 'Ger.Altabrisa@BP.com', rol: 'Gerente', clienteId: 'kWRmv16DNfMUlSF1Yqiv', clienteNombre: 'COMERCIALIZADORA NACIONAL', sucursalesPermitidas: ['Azbef4Og1nABbWAQdQvJ'] },
                    QA_Coordinador: { id: 'iYQnJvdhChK1TLCbPoCD', nombre: 'Coordinador Gral', email: 'coord.bpt@t-sigo.com', rol: 'Coordinador', clienteId: 'kWRmv16DNfMUlSF1Yqiv', clienteNombre: 'COMERCIALIZADORA NACIONAL', sucursalesPermitidas: ['TODAS'] },
                    QA_Tecnico: { id: 'dz2sNRXMNHyQ4dYSUt4S', nombre: 'Tecnico Altabrisa', email: 'tecnico.altabrisa@hgestion.com', rol: 'Tecnico', clienteId: 'kWRmv16DNfMUlSF1Yqiv', clienteNombre: 'COMERCIALIZADORA NACIONAL', sucursalesPermitidas: ['Azbef4Og1nABbWAQdQvJ'], coordinadorId: 'iYQnJvdhChK1TLCbPoCD' },
                    QA_Especialista: { id: 'fpgjGMjstt5W13HGHvGG', nombre: 'Especialista Coccion', email: 'esp.coccion@t-sigo.com', rol: 'TecnicoExterno', clienteId: 'kWRmv16DNfMUlSF1Yqiv', clienteNombre: 'COMERCIALIZADORA NACIONAL', sucursalesPermitidas: ['TODAS'], especialidad: 'Coccion', coordinadorId: 'iYQnJvdhChK1TLCbPoCD' }
                };

                const userFound = allMockUsers[savedRole];
                if (userFound) {
                    setUser(userFound);
                } else {
                    localStorage.removeItem('mockRole');
                }
                setLoading(false);
                return;
            }

            const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                if (firebaseUser) {
                    try {
                        const userDoc = await getDoc(doc(db, 'usuarios', firebaseUser.uid));
                        if (userDoc.exists()) {
                            setUser({ id: firebaseUser.uid, ...userDoc.data() } as User);
                        } else if (firebaseUser.email === 'hhcelis@hgestion.com') {
                            setUser({ id: firebaseUser.uid, clienteId: 'ADMIN', nombre: 'HCelis', email: firebaseUser.email, rol: 'Admin', sucursalesPermitidas: ['TODAS'], clienteNombre: 'H-GESTION GLOBAL' });
                        }
                    } catch (error) {
                        console.error('Error Auth Boot:', error);
                    }
                } else {
                    setUser(null);
                }
                setLoading(false);
            });

            return () => unsubscribe();
        };
        init();
    }, []);

    const setMockUser = (role: string) => {
        setLoading(true);
        const standardUsers: Record<string, User> = {
            Gerente: { id: 'Gerente.BA', nombre: 'GERENTE BA', email: 'gerente.ba@bpt.com', rol: 'Gerente', clienteId: '3de6K2GeasZhN2GIQWXw', clienteNombre: 'TEST BPT', sucursalesPermitidas: ['BA'] },
            Coordinador: { id: 'Coord.IvanGo', nombre: 'Coordinador BPT', email: 'ivango@bpt.com', rol: 'Coordinador', clienteId: '3de6K2GeasZhN2GIQWXw', clienteNombre: 'TEST BPT', sucursalesPermitidas: ['TODAS'] },
            Tecnico: { id: 'Tecnico.BA', nombre: 'TECNICO BA', email: 'tecnico.ba@bpt.com', rol: 'Tecnico', clienteId: '3de6K2GeasZhN2GIQWXw', clienteNombre: 'TEST BPT', sucursalesPermitidas: ['BA'], coordinadorId: 'Coord.IvanGo', supervisorId: 'Supervisor.BA' },
            Admin: { id: 'hcelis', nombre: 'HCelis', email: 'hhcelis@hgestion.com', rol: 'Admin', clienteId: 'ADMIN', clienteNombre: 'H-GESTION GLOBAL', sucursalesPermitidas: ['TODAS'] },
            Supervisor: { id: 'Supervisor.BA', nombre: 'SUPERVISOR BA', email: 'supervisor.ba@bpt.com', rol: 'Supervisor', clienteId: '3de6K2GeasZhN2GIQWXw', clienteNombre: 'TEST BPT', sucursalesPermitidas: ['BA'] }
        };
        const m = standardUsers[role];
        if (m) {
            localStorage.setItem('mockRole', role);
            if (m.clienteId && m.clienteId !== 'ADMIN') {
                setActiveClienteId(m.clienteId, m.clienteNombre);
            } else {
                setActiveClienteId('ADMIN', 'H-GESTION GLOBAL');
            }
            setUser(m);
        }
        setLoading(false);
    };

    const setMockCorpoUser = (role: string) => {
        setLoading(true);
        const corpoUsers: Record<string, User> = {
            QA_Gerente: { id: 'empiiN18VlLXZlXq45i4', nombre: 'Gerente BP Altabrisa', email: 'Ger.Altabrisa@BP.com', rol: 'Gerente', clienteId: 'kWRmv16DNfMUlSF1Yqiv', clienteNombre: 'COMERCIALIZADORA NACIONAL', sucursalesPermitidas: ['Azbef4Og1nABbWAQdQvJ'] },
            QA_Coordinador: { id: 'iYQnJvdhChK1TLCbPoCD', nombre: 'Coordinador Gral', email: 'coord.bpt@t-sigo.com', rol: 'Coordinador', clienteId: 'kWRmv16DNfMUlSF1Yqiv', clienteNombre: 'COMERCIALIZADORA NACIONAL', sucursalesPermitidas: ['TODAS'] },
            QA_Tecnico: { id: 'dz2sNRXMNHyQ4dYSUt4S', nombre: 'Tecnico Altabrisa', email: 'tecnico.altabrisa@hgestion.com', rol: 'Tecnico', clienteId: 'kWRmv16DNfMUlSF1Yqiv', clienteNombre: 'COMERCIALIZADORA NACIONAL', sucursalesPermitidas: ['Azbef4Og1nABbWAQdQvJ'], coordinadorId: 'iYQnJvdhChK1TLCbPoCD' },
            QA_Especialista: { id: 'fpgjGMjstt5W13HGHvGG', nombre: 'Especialista Coccion', email: 'esp.coccion@t-sigo.com', rol: 'TecnicoExterno', clienteId: 'kWRmv16DNfMUlSF1Yqiv', clienteNombre: 'COMERCIALIZADORA NACIONAL', sucursalesPermitidas: ['TODAS'], especialidad: 'Coccion', coordinadorId: 'iYQnJvdhChK1TLCbPoCD' }
        };
        const m = corpoUsers[role];
        if (m) {
            localStorage.setItem('mockRole', role);
            if (m.clienteId) {
                setActiveClienteId(m.clienteId, m.clienteNombre);
            }
            setUser(m);
        }
        setLoading(false);
    };

    const loginLight = async (email: string) => {
        setLoading(true);
        try {
            const usersRef = collection(db, 'usuarios');
            const q = query(usersRef, where('email', '==', email.trim()));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const userData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
                setUser(userData);
                localStorage.setItem('hgestion_light_user', JSON.stringify(userData));

                if (userData.clienteId && userData.clienteId !== 'ADMIN') {
                    setActiveClienteId(userData.clienteId, userData.clienteNombre);
                }
                return true;
            }
            return false;
        } catch (err) {
            console.error('Error Login Light:', err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const isSuperAdminUser = (user?.rol === 'Admin' && user?.clienteId === 'ADMIN') || user?.email === 'hhcelis@hgestion.com';

    const activeUser = React.useMemo(() => {
        if (!user) return null;
        if (isSuperAdminUser && activeClienteId && activeClienteId !== 'ADMIN') {
            return {
                ...user,
                clienteId: activeClienteId,
                clienteNombre: activeClienteNombre || user.clienteNombre,
                isImpersonating: true
            } as User;
        }
        return user;
    }, [user, activeClienteId, activeClienteNombre, isSuperAdminUser]);

    const value = {
        user: activeUser,
        loading,
        error,
        isAdmin: user?.rol === 'Admin',
        isCoordinador: user?.rol === 'Coordinador',
        isGerente: user?.rol === 'Gerente',
        isGerenteBA: user?.rol === 'Gerente' && (user?.nombre?.toUpperCase().includes('BA') || user?.sucursalesPermitidas?.includes('TODAS') || (user?.sucursalesPermitidas?.length || 0) > 1),
        isGerenteSucursal: user?.rol === 'Gerente' && !(user?.nombre?.toUpperCase().includes('BA') || user?.sucursalesPermitidas?.includes('TODAS') || (user?.sucursalesPermitidas?.length || 0) > 1),
        isSupervisor: user?.rol === 'Supervisor',
        isTecnico: user?.rol === 'Tecnico' || user?.rol === 'TecnicoExterno',
        isAdminCliente: user?.rol === 'Admin' && user?.clienteId !== 'ADMIN',
        isSuperAdmin: isSuperAdminUser,
        activeClienteId: isSuperAdminUser ? (activeClienteId || 'ADMIN') : activeClienteId,
        activeClienteNombre,
        setActiveClienteId,
        loginAsRole: setMockUser,
        loginAsRoleCorpo: setMockCorpoUser,
        loginLight,
        logout
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
