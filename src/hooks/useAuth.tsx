import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db, switchFirebaseProject, getActiveProjectKey } from '../services/firebase';
import { resolveProjectForEmail } from '../services/projectRouter';
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
    activeClienteNombre: string | null;
    setActiveClienteId: (id: string | null, name?: string | null) => void;
    loginLight: (email: string) => Promise<'success' | 'swapping' | 'not_found' | 'error'>;
    logout: () => void;
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
    activeClienteNombre: null,
    setActiveClienteId: () => { },
    loginLight: async () => 'error',
    logout: () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error] = useState<string | null>(null);
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
        
        // Destruir persistencia del Multi-proyecto y devolver el router interno al default
        localStorage.setItem('hgestion_project_key', 'BPT_GROUP');

        auth.signOut();
        setUser(null);
        setActiveClienteIdState(null);
        setActiveClienteNombreState(null);
        setLoading(false);
        
        // Forzar recarga fría para purgar Vite Cache y Firebase en el cierre de sesión si se cambió de DB
        window.location.replace('/T-GESTION-Lite/login');
    };

    useEffect(() => {
        const init = async () => {
            const savedLightUser = localStorage.getItem('hgestion_light_user');
            if (savedLightUser) {
                setUser(JSON.parse(savedLightUser));
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
                            setUser({ id: firebaseUser.uid, clienteId: 'ADMIN', nombre: 'HCelis', email: firebaseUser.email, rol: 'Admin General', sucursalesPermitidas: ['TODAS'], clienteNombre: 'H-GESTION GLOBAL' });
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

    const loginLight = async (email: string): Promise<'success' | 'swapping' | 'not_found' | 'error'> => {
        setLoading(true);
        try {
            const safeEmail = email.trim();
            // 1. LOBBY ROUTING (Encontrar proyecto físico destino)
            const targetProject = resolveProjectForEmail(safeEmail);
            const currentProject = getActiveProjectKey();

            // 2. HOT-SWAP (Cambiar proyecto y recargar si es diferente)
            if (targetProject !== currentProject) {
                console.log(`[LOBBY] Enrutando usuario a proyecto físico: ${targetProject}...`);
                // Guarda temporalmente el email para auto-login post-reload
                localStorage.setItem('hgestion_pending_login', safeEmail);
                switchFirebaseProject(targetProject);
                return 'swapping'; // La recarga física ocurrirá en 300ms, bloquear UI.
            }

            // 3. AUTH NORMAL (Ya estamos en el proyecto correcto)
            const usersRef = collection(db, 'usuarios');
            const q = query(usersRef, where('email', '==', safeEmail));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                const userData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as User;
                setUser(userData);
                localStorage.setItem('hgestion_light_user', JSON.stringify(userData));

                if (userData.clienteId && userData.clienteId !== 'ADMIN') {
                    setActiveClienteId(userData.clienteId, userData.clienteNombre);
                }
                return 'success';
            }
            return 'not_found';
        } catch (err) {
            console.error('Error Login Light:', err);
            return 'error';
        } finally {
            setLoading(false);
        }
    };

    // Auto-Login Post-Reload
    useEffect(() => {
        const pendingEmail = localStorage.getItem('hgestion_pending_login');
        if (pendingEmail) {
            localStorage.removeItem('hgestion_pending_login');
            // Dar tiempo extra para que Firebase / React terminen su mount inicial sin cache sucia
            setTimeout(() => {
                loginLight(pendingEmail);
            }, 500);
        }
    }, []);

    const isSuperAdminUser = ((user?.rol === 'Admin General' || user?.rol === 'Admin' || user?.rol === 'ROL_ADMIN_GENERAL' || user?.rol === 'ROL_ADMIN') && user?.clienteId === 'ADMIN') || user?.email === 'hhcelis@hgestion.com' || user?.email === 'hcelis@tsigoglobal.com.mx';

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
        // INTERNAL ID IS LAW: Checking for both legacy and nomenclature patterns
        isAdmin: !!(user?.rol === 'Admin General' || user?.rol === 'Admin' || user?.rol?.startsWith('ROL_ADMIN')),
        isCoordinador: !!(user?.rol === 'Coordinador' || user?.rol === 'Coordinador CN' || user?.rol?.startsWith('ROL_COORD')),
        isGerente: !!(user?.rol === 'Gerente' || user?.rol?.startsWith('ROL_GERENTE')),
        isMultiBranchGerente: !!((user?.rol === 'Gerente' || user?.rol?.startsWith('ROL_GERENTE')) && (user?.sucursalesPermitidas?.includes('TODAS') || (user?.sucursalesPermitidas?.length || 0) > 1)),
        isSingleBranchGerente: !!((user?.rol === 'Gerente' || user?.rol?.startsWith('ROL_GERENTE')) && !(user?.sucursalesPermitidas?.includes('TODAS') || (user?.sucursalesPermitidas?.length || 0) > 1)),
        isSupervisor: !!(user?.rol === 'Supervisor' || user?.rol?.startsWith('ROL_SUPERVISOR')),
        isTecnico: !!(user?.rol === 'Tecnico' || user?.rol === 'TecnicoExterno' || user?.rol?.startsWith('ROL_TECNICO')),
        isAdminCliente: !!((user?.rol === 'Admin General' || user?.rol === 'Admin' || user?.rol?.startsWith('ROL_ADMIN')) && user?.clienteId !== 'ADMIN'),
        isSuperAdmin: isSuperAdminUser,
        activeClienteId: isSuperAdminUser ? (activeClienteId || 'ADMIN') : activeClienteId,
        activeClienteNombre,
        setActiveClienteId,
        loginLight,
        logout
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
