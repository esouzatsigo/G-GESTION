/**
 * TENANT CONTEXT — Servicio centralizado de aislamiento multi-tenant
 * 
 * Provee helpers para construir queries que SIEMPRE filtran por el
 * clienteId del usuario autenticado, evitando fugas de datos entre clientes.
 * 
 * USO:
 *   import { tenantQuery, isSuperAdmin } from '../services/tenantContext';
 *   const q = tenantQuery('ordenesTrabajo', user, orderBy('numero','asc'));
 *   const snap = await getDocs(q);
 */
import {
    collection,
    query,
    where,
    QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';
import type { User } from '../types';

/** Identificador especial de super-admin (H-GESTION operador global) */
const SUPER_ADMIN_CLIENT_ID = 'ADMIN';

/**
 * Determina si un usuario es super-admin (operador de H-GESTION que ve todo).
 */
export const isSuperAdmin = (user: User | null): boolean => {
    return user?.clienteId === SUPER_ADMIN_CLIENT_ID && user?.rol === 'Admin';
};

/**
 * Construye una Firestore Query con filtro obligatorio de tenant.
 * Si el usuario es super-admin, NO aplica filtro (ve todos los clientes).
 * 
 * @param collectionName - Nombre de la colección Firestore
 * @param user - Usuario autenticado actual
 * @param constraints - QueryConstraints adicionales (where, orderBy, limit, etc.)
 * @returns Query lista para ejecutar con getDocs()
 */
export const tenantQuery = (
    collectionName: string,
    user: User | null,
    ...constraints: QueryConstraint[]
) => {
    if (!user) {
        throw new Error('TENANT_CONTEXT: No hay usuario autenticado.');
    }

    const baseCollection = collection(db, collectionName);

    // Super-admin: si tiene un cliente activo seleccionado en localStorage, filtrar por él.
    // Si no, o si es 'ADMIN', mostrar todo (acceso global).
    if (isSuperAdmin(user)) {
        const activeId = typeof window !== 'undefined' ? localStorage.getItem('activeClienteId') : null;
        if (activeId && activeId !== 'ADMIN') {
            return query(baseCollection, where('clienteId', '==', activeId), ...constraints);
        }
        return query(baseCollection, ...constraints);
    }

    // Usuario normal: SIEMPRE filtrar por clienteId
    return query(
        baseCollection,
        where('clienteId', '==', user.clienteId),
        ...constraints
    );
};

/**
 * Construye una ruta de Storage con prefijo de tenant.
 * Ejemplo: tenantStoragePath(user, 'evidencia_gerente') → 'tenants/BPT/evidencia_gerente'
 */
export const tenantStoragePath = (user: User | null, subPath: string): string => {
    if (!user?.clienteId) {
        throw new Error('TENANT_CONTEXT: No se puede determinar el tenant para Storage.');
    }
    return `tenants/${user.clienteId}/${subPath}`;
};

/**
 * Retorna la referencia al documento de counters específico del tenant.
 * Ejemplo: tenantCounterDocPath(user) → 'config/counters_BPT'
 */
export const tenantCounterDocPath = (user: User | null): string => {
    if (!user?.clienteId) {
        throw new Error('TENANT_CONTEXT: No se puede determinar el tenant para counters.');
    }
    // Super-admin usa el counter del primer cliente o necesita selección
    if (isSuperAdmin(user)) {
        return 'config/counters'; // Fallback global para super-admin
    }
    return `config/counters_${user.clienteId}`;
};
