import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    runTransaction,
    deleteDoc
} from 'firebase/firestore';
import { trackedAddDoc, trackedUpdateDoc } from './firestoreHelpers';
import { db } from './firebase';
import type { Cliente, Franquicia, Sucursal, Equipo, WorkOrder, User } from '../types';
import { notificarNuevaOT, notificarTecnicoAsignacion, notificarAsignacionOT, notificarCambioOT } from './notificationService';

export interface BitacoraEntry {
    id?: string;
    clienteId: string;
    otId: string;
    otNumero: number;
    fecha: string;
    usuarioId: string;
    usuarioNombre: string;
    accion: string;
    campo: string;
    valorAnterior: any;
    valorNuevo: any;
    isSuperAdminAction?: boolean;
    collectionName?: string;
}

export interface PreventivoPlanEntry {
    id: string;
    clienteId: string;
    mes: number;
    fechas: string;
    sucursalId: string;
    franquiciaId: string;
    txtPDF: string;
}

export interface BitacoraPreventivo {
    id?: string;
    clienteId: string;
    planId: string;
    fecha: string;
    usuarioId: string;
    usuarioNombre: string;
    accion: string;
    detalles: {
        campo: string;
        anterior: any;
        nuevo: any;
    }[];
}

// --- Servicios de Clientes ---
export const getClientes = async (clienteId?: string) => {
    if (clienteId && clienteId !== 'ADMIN') {
        const docSnap = await getDoc(doc(db, 'clientes', clienteId));
        return docSnap.exists() ? [{ id: docSnap.id, ...docSnap.data() } as Cliente] : [];
    }
    const snapshot = await getDocs(collection(db, 'clientes'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cliente));
};

export const saveCliente = async (cliente: Omit<Cliente, 'id'>, user: User, id?: string) => {
    if (id) {
        const docRef = doc(db, 'clientes', id);
        const oldSnap = await getDoc(docRef);
        const oldData = oldSnap.data() as Cliente;

        await trackedUpdateDoc(docRef, cliente);

        // Auditar cambios de campos relevantes
        const fields = ['nombre', 'razonSocial'] as (keyof Cliente)[];
        for (const field of fields) {
            if (cliente[field as keyof Omit<Cliente, 'id'>] !== oldData[field]) {
                await logBitacora({
                    clienteId: 'ADMIN',
                    otId: 'CATALOG_CLIENTE',
                    otNumero: 0,
                    fecha: new Date().toISOString(),
                    usuarioId: user.id,
                    usuarioNombre: user.nombre,
                    accion: `Edición de Cliente: ${cliente.nombre}`,
                    campo: field,
                    valorAnterior: oldData[field] || 'Vacio',
                    valorNuevo: cliente[field as keyof Omit<Cliente, 'id'>]
                });
            }
        }
        return id;
    } else {
        const docRef = await trackedAddDoc(collection(db, 'clientes'), cliente);
        await logBitacora({
            clienteId: 'ADMIN',
            otId: 'CATALOG_CLIENTE',
            otNumero: 0,
            fecha: new Date().toISOString(),
            usuarioId: user.id,
            usuarioNombre: user.nombre,
            accion: `Creación de Cliente`,
            campo: 'General',
            valorAnterior: 'N/A',
            valorNuevo: `Cliente: ${cliente.nombre} / ${cliente.razonSocial}`
        });

        // REGLA DE NEGOCIO: Sembrar Catálogos Base (Globales) al nuevo cliente.
        try {
            const qGlobal = query(collection(db, 'catalogos'), where('clienteId', '==', 'ADMIN'));
            const globalSnap = await getDocs(qGlobal);
            const globalCatalogs = globalSnap.docs.map(doc => doc.data());

            const promises = globalCatalogs.map(cat => {
                const newCat = { ...cat, clienteId: docRef.id };
                return trackedAddDoc(collection(db, 'catalogos'), newCat);
            });
            await Promise.all(promises);
            console.log(`Sembrados ${globalCatalogs.length} catálogos base para el nuevo cliente ${cliente.nombre}.`);
        } catch (error) {
            console.error("Error al sembrar catálogos base para el cliente nuevo:", error);
        }

        return docRef.id;
    }
};

// --- Servicios de Franquicias ---
export const getFranquicias = async (targetClienteId?: string | null) => {
    let q = query(collection(db, 'franquicias'));
    if (targetClienteId && targetClienteId !== 'ADMIN') {
        q = query(q, where('clienteId', '==', targetClienteId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Franquicia));
};

// --- Servicios de Sucursales ---
export const getSucursales = async (targetClienteId?: string | null, franquiciaId?: string | null) => {
    let q = query(collection(db, 'sucursales'));
    if (targetClienteId && targetClienteId !== 'ADMIN') {
        q = query(q, where('clienteId', '==', targetClienteId));
    }
    if (franquiciaId) {
        q = query(q, where('franquiciaId', '==', franquiciaId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sucursal));
};

// --- Servicios de Equipos ---
// FIX: Query con máximo 2 filtros Firestore (sucursalId + clienteId) para evitar
// dependencia de índice compuesto de 3 campos. Familia se filtra client-side.
export const getEquipos = async (sucursalId: string, familia?: string, targetClienteId?: string | null) => {
    let q = query(collection(db, 'equipos'), where('sucursalId', '==', sucursalId));
    if (targetClienteId && targetClienteId !== 'ADMIN') {
        q = query(q, where('clienteId', '==', targetClienteId));
    }
    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipo));
    if (familia) {
        results = results.filter(e => e.familia === familia);
    }
    return results;
};

// --- Servicios de Catálogos ---
export const getCatalogos = async (targetClienteId?: string | null) => {
    let q = query(collection(db, 'catalogos'));
    if (targetClienteId) {
        q = query(q, where('clienteId', '==', targetClienteId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
};

export const getFamilias = async (targetClienteId?: string | null) => {
    let q = query(collection(db, 'familias'));
    if (targetClienteId) {
        q = query(q, where('clienteId', '==', targetClienteId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
};

export const saveCatalogo = async (catalogo: any, user: any, id?: string) => {
    if (id) {
        const docRef = doc(db, 'catalogos', id);
        const oldSnap = await getDoc(docRef);
        const oldData = oldSnap.data() as any;

        await trackedUpdateDoc(docRef, catalogo);

        const fields = ['nombre', 'categoria', 'nomenclatura', 'descripcion', 'colorFondo'];
        for (const field of fields) {
            if (catalogo[field] !== oldData[field]) {
                await logBitacora({
                    clienteId: catalogo.clienteId,
                    otId: id,
                    otNumero: 0,
                    fecha: new Date().toISOString(),
                    usuarioId: user.id,
                    usuarioNombre: user.nombre,
                    accion: `Edición de Catálogo: ${catalogo.nombre}`,
                    campo: field,
                    valorAnterior: oldData[field] || 'Vacio',
                    valorNuevo: catalogo[field],
                    collectionName: 'catalogos'
                });
            }
        }
        return id;
    } else {
        const docRef = await trackedAddDoc(collection(db, 'catalogos'), catalogo);
        await logBitacora({
            clienteId: catalogo.clienteId,
            otId: docRef.id,
            otNumero: 0,
            fecha: new Date().toISOString(),
            usuarioId: user.id,
            usuarioNombre: user.nombre,
            accion: `Creación de Registro de Catálogo`,
            campo: 'General',
            valorAnterior: 'N/A',
            valorNuevo: `Registro: ${catalogo.nombre} / ${catalogo.categoria}`,
            collectionName: 'catalogos'
        });
        return docRef.id;
    }
};

export const getBitacoraCatalogos = async () => {
    const q = query(collection(db, 'bitacora'));
    const snapshot = await getDocs(q);
    const allEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BitacoraEntry));
    const recent = allEntries.filter(e => e.accion.includes('Edición de Catálogo'));
    recent.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return recent.slice(0, 50);
};


/**
 * MOTOR DE REVERSIÓN UNIVERSAL — ANÁLISIS DE IMPACTO (Hardcodeado)
 * Evalúa el riesgo de revertir un campo en una colección antes de ejecutar el cambio.
 *
 * Niveles de impacto:
 *  - 'safe'    → Se permite sin restricción.
 *  - 'warning' → Se permite, pero se advierte al usuario.
 *  - 'blocked' → Se NIEGA la operación y se informa el motivo.
 */
export interface UndoImpactResult {
    level: 'safe' | 'warning' | 'blocked';
    message: string;
}

export const checkUndoImpact = (collectionName: string, campo: string): UndoImpactResult => {

    // ── REGLA 1: clienteId es SIEMPRE bloqueado en CUALQUIER colección ──
    if (campo === 'clienteId') {
        return {
            level: 'blocked',
            message: `❌ BLOQUEADO: Revertir el campo "clienteId" en "${collectionName}" violaría el aislamiento de datos entre empresas (Multi-Tenant). Esta operación está permanentemente bloqueada por seguridad.`
        };
    }

    // ── REGLA 2: email de usuario — afecta la autenticación directamente ──
    if (collectionName === 'usuarios' && campo === 'email') {
        return {
            level: 'blocked',
            message: `❌ BLOQUEADO: Revertir el correo electrónico de un usuario puede impedir su acceso al sistema. Corrija el email directamente desde el módulo de Usuarios.`
        };
    }

    // ── REGLA 3: rol de usuario — acceso y flujo de OTs ──
    if (collectionName === 'usuarios' && campo === 'rol') {
        return {
            level: 'blocked',
            message: `❌ BLOQUEADO: Revertir el Rol de un usuario activo puede cambiar sus permisos de acceso, romper el flujo de Órdenes de Trabajo asignadas y afectar la visibilidad de módulos. Cambie el rol directamente desde el módulo de Usuarios para asegurarse de que las asignaciones activas sean revisadas.`
        };
    }

    // ── REGLA 4: nomenclatura de catálogo — EL VÍNCULO DE HIERRO ──
    if (collectionName === 'catalogos' && campo === 'nomenclatura') {
        return {
            level: 'blocked',
            message: `❌ BLOQUEADO: El campo "nomenclatura" es el Identificador Único (Vínculo de Hierro) que conecta este catálogo con Usuarios y Equipos. Revertirlo rompería todas las relaciones activas del sistema.`
        };
    }

    // ── REGLA 5: sucursalId de equipo — OTs abiertas del equipo en sucursal incorrecta ──
    if (collectionName === 'equipos' && campo === 'sucursalId') {
        return {
            level: 'blocked',
            message: `❌ BLOQUEADO: Revertir la Sucursal de un equipo puede dejar Órdenes de Trabajo abiertas vinculadas a una ubicación incorrecta. Reasigne la sucursal directamente desde el módulo de Equipos, revisando primero las OTs activas del equipo.`
        };
    }

    // ── REGLA 6: franquiciaId de sucursal — rompe jerarquía Org → Franquicia → Sucursal ──
    if (collectionName === 'sucursales' && campo === 'franquiciaId') {
        return {
            level: 'blocked',
            message: `❌ BLOQUEADO: Cambiar la Franquicia a la que pertenece una Sucursal afecta la estructura organizacional completa y puede romper los permisos de usuarios vinculados a esa franquicia. Realice este cambio desde el módulo de Sucursales.`
        };
    }

    // ── REGLA 7: advertencias — impacto medio ──
    const warningCases: Record<string, Record<string, string>> = {
        'usuarios': {
            'nombre': '⚠️ ADVERTENCIA: El nombre del usuario puede aparecer desnormalizado en Órdenes de Trabajo históricas. Este cambio no actualizará los reportes anteriores.',
            'rol': '⚠️ ADVERTENCIA: Revertir el ROL puede afectar los permisos de acceso. Al usar el "Vínculo de Hierro", el cambio es estético pero funcional.',
            'especialidad': '⚠️ ADVERTENCIA: Revertir la especialidad del usuario puede afectar los filtros de asignación de OTs futuras.',
        },
        'equipos': {
            'nombre': '⚠️ ADVERTENCIA: El nombre del equipo puede estar desnormalizado en Órdenes de Trabajo históricas. Este cambio no actualizará los reportes anteriores.',
            'familia': '⚠️ ADVERTENCIA: Revertir la familia del equipo puede afectar los filtros de consulta y asignación de OTs futuras.',
        },
        'sucursales': {
            'nombre': '⚠️ ADVERTENCIA: El nombre de la sucursal puede estar referenciado en Órdenes de Trabajo históricas. Este cambio no actualizará los reportes anteriores.',
        },
        'franquicias': {
            'nombre': '⚠️ ADVERTENCIA: El nombre de la franquicia aparece en reportes y pantallas de selección. Este cambio es visual y no afecta datos operativos.',
        },
        'clientes': {
            'nombre': '⚠️ ADVERTENCIA: El nombre del cliente aparece en reportes y encabezados. Este cambio es visual y no afecta datos operativos.',
            'razonSocial': '⚠️ ADVERTENCIA: La razón social aparece en reportes PDF. Este cambio es visual y no afecta datos operativos.',
        },
        'catalogos': {
            'nombre': '⚠️ ADVERTENCIA: El nombre es puramente estético gracias al "Vínculo de Hierro", pero puede confundir a los usuarios si se revierte a un nombre obsoleto.',
            'categoria': '⚠️ ADVERTENCIA: Cambiar la categoría del registro puede afectar su visibilidad en los filtros del módulo de Catálogos.',
        }
    };

    const warningMsg = warningCases[collectionName]?.[campo];
    if (warningMsg) {
        return { level: 'warning', message: warningMsg };
    }

    // ── DEFAULT: Seguro ──
    return {
        level: 'safe',
        message: 'El cambio puede revertirse de forma segura. Este campo no tiene dependencias críticas.'
    };
};

export const undoUniversalChange = async (entry: BitacoraEntry): Promise<UndoImpactResult> => {
    if (!entry.id || !entry.otId || !entry.collectionName) {
        throw new Error("Entrada inválida o sin colección definida.");
    }

    // --- ANÁLISIS DE IMPACTO ---
    const impact = checkUndoImpact(entry.collectionName, entry.campo);

    if (impact.level === 'blocked') {
        // Devolvemos el resultado para que la UI lo maneje y muestre el mensaje al usuario.
        // NO ejecutamos el cambio.
        return impact;
    }

    // Si es 'warning' o 'safe', procedemos con la reversión.
    const docRef = doc(db, entry.collectionName, entry.otId);
    const updateData: any = {};
    updateData[entry.campo] = entry.valorAnterior;
    await trackedUpdateDoc(docRef, updateData);

    // Eliminar la entrada de la bitácora para mantener la línea temporal limpia.
    await deleteDoc(doc(db, 'bitacora', entry.id));

    return impact; // Devolvemos 'safe' o 'warning' para que la UI decida si mostrar algo.
};


// --- Gestión de Números de OT (Consecutivo Único Atómico) ---
export const getNextOTNumber = async (clienteId: string, tipo: 'Correctivo' | 'Preventivo' = 'Correctivo') => {
    return await runTransaction(db, async (transaction) => {
        const docId = (!clienteId || clienteId === 'ADMIN') ? 'counters' : `counters_${clienteId}`;
        const counterRef = doc(db, 'config', docId);
        const counterDoc = await transaction.get(counterRef);
        const field = tipo === 'Correctivo' ? 'otNumber' : 'preventiveOtNumber';
        const defaultValue = tipo === 'Correctivo' ? 1000 : 1;

        let numero = defaultValue;
        if (!counterDoc.exists()) {
            transaction.set(counterRef, { [field]: defaultValue });
        } else {
            numero = (counterDoc.data()?.[field] || (defaultValue - 1)) + 1;
            transaction.update(counterRef, { [field]: numero });
        }
        return numero;
    });
};

export const getCounterConfig = async (clienteId: string) => {
    const docId = (!clienteId || clienteId === 'ADMIN') ? 'counters' : `counters_${clienteId}`;
    const docRef = doc(db, 'config', docId);
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : { otNumber: 1000, preventiveOtNumber: 1 };
};

// --- Servicios de Ordenes de Trabajo (OT) ---
export const createOT = async (ot: Omit<WorkOrder, 'id' | 'numero'>, user: User) => {
    const numero = await getNextOTNumber(ot.clienteId, ot.tipo);
    const docRef = await trackedAddDoc(collection(db, 'ordenesTrabajo'), {
        ...ot,
        numero,
        fechas: {
            ...ot.fechas,
            solicitada: new Date().toISOString()
        }
    });

    // Auditoría de Creación de OT
    await logBitacora({
        clienteId: ot.clienteId,
        otId: docRef.id,
        otNumero: numero,
        fecha: new Date().toISOString(),
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        accion: `Nueva OT ${ot.tipo}`,
        campo: 'General',
        valorAnterior: 'N/A',
        valorNuevo: `OT Solicitada: ${ot.descripcionFalla.substring(0, 50)}...`
    });

    // *** NOTIFICACIÓN: Avisar a los Coordinadores del cliente ***
    try {
        const coordQuery = query(
            collection(db, 'usuarios'),
            where('clienteId', '==', ot.clienteId),
            where('rol', '==', 'ROL_COORD')
        );
        const coordSnap = await getDocs(coordQuery);
        let sucDisplay = ot.sucursalId || 'Sin sucursal';
        try {
            const sucDoc = await getDoc(doc(db, 'sucursales', ot.sucursalId));
            if (sucDoc.exists()) sucDisplay = sucDoc.data().nombre || sucDisplay;
        } catch (_) { /* silenciar */ }
        // Resolver nombre de equipo
        let eqNombre = '';
        let eqFamilia = '';
        try {
            if (ot.equipoId) {
                const eqDoc = await getDoc(doc(db, 'equipos', ot.equipoId));
                if (eqDoc.exists()) { eqNombre = eqDoc.data().nombre || ''; eqFamilia = eqDoc.data().familia || ''; }
            }
        } catch (_) { /* silenciar */ }
        coordSnap.forEach(coordDoc => {
            notificarNuevaOT(
                coordDoc.id, ot.clienteId, numero, docRef.id,
                sucDisplay, user.nombre, ot.descripcionFalla || 'Sin descripción',
                (ot as any).justificacion || '',
                (ot as any).fotosGerente || [],
                eqNombre,
                eqFamilia
            ).catch(e => console.error('Notif error:', e));
        });
    } catch (e) {
        console.error('Error enviando notificaciones de Nueva OT:', e);
    }

    return { id: docRef.id, numero };
};

// --- GENERACIÓN MASIVA v2.0: Sistema Quirúrgico de OTs Preventivas ---

import type { MassiveAssignment, MassiveBatchRecord, MassiveBatchChange } from '../types';

/**
 * GENERACIÓN MASIVA v2.0
 * Crea OTs individuales para cada equipo con su propio técnico y fecha.
 * Registra un MassiveBatchRecord como "snapshot" para reversibilidad total.
 */
export const createMassivePreventiveOTsV2 = async (
    event: any,
    assignments: MassiveAssignment[],
    sucursal: Sucursal,
    user: User
): Promise<{ otIds: string[]; batchRecordId: string }> => {
    const otIds: string[] = [];

    // 1. Crear cada OT con su asignación individual
    for (const assignment of assignments) {
        const numero = await getNextOTNumber(sucursal.clienteId, 'Preventivo');

        const newOT: Omit<WorkOrder, 'id'> = {
            numero,
            tipo: 'Preventivo',
            preventivoPlanId: event.id,
            estatus: 'Asignada',
            prioridad: 'BAJA',
            fechas: {
                solicitada: new Date().toISOString(),
                programada: assignment.fechaProgramada,
            },
            tecnicoId: assignment.tecnicoId,
            clienteId: sucursal.clienteId,
            sucursalId: sucursal.id,
            equipoId: assignment.equipoId,
            descripcionFalla: `MANTENIMIENTO PREVENTIVO PROGRAMADO 2026 - REF: ${event.txtPDF}`,
            justificacion: '',
            fotosGerente: [],
            solicitanteId: 'SYSTEM_PLANNER'
        };

        const docRef = await trackedAddDoc(collection(db, 'ordenesTrabajo'), newOT);
        otIds.push(docRef.id);
    }

    // 2. Registrar el MassiveBatchRecord (snapshot para reversas)
    const batchRecord: Omit<MassiveBatchRecord, 'id'> = {
        preventivoPlanId: event.id,
        sucursalId: sucursal.id,
        fechaOperacion: new Date().toISOString(),
        tipoOperacion: 'GENERACION',
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        totalOTs: assignments.length,
        asignaciones: assignments,
        otIdsAfectados: otIds,
    };

    const batchRef = await trackedAddDoc(collection(db, 'massiveBatchRecords'), batchRecord);

    await logBitacora({
        clienteId: sucursal.clienteId,
        otId: 'BATCH_GENERATION',
        otNumero: 0,
        fecha: new Date().toISOString(),
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        accion: `Generación Masiva de OTs (${assignments.length} unidades)`,
        campo: 'batch_generation',
        valorAnterior: '',
        valorNuevo: `Sucursal: ${sucursal.nombre}`
    });

    return { otIds, batchRecordId: batchRef.id };
};

/**
 * Obtiene las OTs existentes de un evento, con detección de cambios individuales.
 * Compara el estado actual de cada OT contra el último batch para detectar
 * si alguien la modificó fuera del panel masivo.
 */
export const getFullMassiveOTsForEvent = async (eventId: string) => {
    // 1. Obtener todas las OTs del evento
    const otQuery = query(collection(db, 'ordenesTrabajo'), where('preventivoPlanId', '==', eventId));
    const otSnap = await getDocs(otQuery);
    const ots = otSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkOrder));

    // 2. Obtener el último batch record para este evento
    const { orderBy, limit } = await import('firebase/firestore');
    const batchQuery = query(
        collection(db, 'massiveBatchRecords'),
        where('preventivoPlanId', '==', eventId),
        orderBy('fechaOperacion', 'desc'),
        limit(1)
    );
    const batchSnap = await getDocs(batchQuery);
    const lastBatch = batchSnap.docs.length > 0
        ? { id: batchSnap.docs[0].id, ...batchSnap.docs[0].data() } as MassiveBatchRecord
        : null;

    // 3. Detectar modificaciones individuales (OTs tocadas fuera del panel)
    const otsWithFlags = ots.map(ot => {
        let fueModificadaIndividualmente = false;
        let campoModificado = '';

        if (lastBatch) {
            const originalAssignment = lastBatch.asignaciones.find(a => a.equipoId === ot.equipoId);
            if (originalAssignment) {
                // Comparar técnico actual vs el del batch
                if (ot.tecnicoId && ot.tecnicoId !== originalAssignment.tecnicoId) {
                    fueModificadaIndividualmente = true;
                    campoModificado = 'tecnicoId';
                }
                // Comparar fecha programada actual vs la del batch
                if (ot.fechas?.programada && ot.fechas.programada !== originalAssignment.fechaProgramada) {
                    fueModificadaIndividualmente = true;
                    campoModificado += (campoModificado ? ', ' : '') + 'fechaProgramada';
                }
            }
        }

        return {
            ...ot,
            fueModificadaIndividualmente,
            campoModificado,
            esEditable: ot.estatus === 'Asignada', // Solo editables si no han iniciado
        };
    });

    return {
        ots: otsWithFlags,
        lastBatch,
        equipoIdsConOT: ots.map(o => o.equipoId),
    };
};

/** Mantener compatibilidad con el código existente */
export const getExistingOTsForEvent = async (eventId: string, user?: User) => {
    let q = query(collection(db, 'ordenesTrabajo'), where('preventivoPlanId', '==', eventId));
    if (user && user.rol !== 'ROL_ADMIN' && user.clienteId !== 'ADMIN') {
        q = query(q, where('clienteId', '==', user.clienteId));
    }
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data().equipoId as string);
};

/**
 * MODIFICACIÓN MASIVA: Actualiza técnico y/o fecha de múltiples OTs
 * con bitácora granular y detección de conflictos individuales.
 * 
 * @returns Reporte de la operación con conflictos detectados
 */
export const updateMassiveBatchOTs = async (
    eventId: string,
    changes: {
        otId: string; otNumero: number; equipoId: string; equipoNombre: string;
        newTecnicoId?: string; newFechaProgramada?: string;
    }[],
    user: User,
    allTecnicos: User[]
): Promise<{
    totalModificadas: number;
    conflictos: { otId: string; otNumero: number; equipoNombre: string; detalle: string }[];
    batchRecordId: string;
}> => {
    const conflictos: { otId: string; otNumero: number; equipoNombre: string; detalle: string }[] = [];
    const batchChanges: Omit<MassiveBatchChange, 'id'>[] = [];
    const newAssignments: MassiveAssignment[] = [];
    const otIdsAfectados: string[] = [];
    let totalModificadas = 0;

    // 1. Obtener el último batch para comparar estado original
    const { orderBy, limit: fbLimit } = await import('firebase/firestore');
    const batchQuery = query(
        collection(db, 'massiveBatchRecords'),
        where('preventivoPlanId', '==', eventId),
        orderBy('fechaOperacion', 'desc'),
        fbLimit(1)
    );
    const batchSnap = await getDocs(batchQuery);
    const lastBatch = batchSnap.docs.length > 0
        ? { id: batchSnap.docs[0].id, ...batchSnap.docs[0].data() } as MassiveBatchRecord
        : null;

    // 2. Procesar cada cambio
    for (const change of changes) {
        const otRef = doc(db, 'ordenesTrabajo', change.otId);
        const otSnap = await getDoc(otRef);
        if (!otSnap.exists()) continue;

        const currentOT = { id: otSnap.id, ...otSnap.data() } as WorkOrder;

        // REGLA DE NEGOCIO: Especialidad de Técnico Externo
        if (change.newTecnicoId) {
            const targetTec = allTecnicos.find(t => t.id === change.newTecnicoId);
            if (targetTec?.rol === 'ROL_TECNICO_EXTERNO' || targetTec?.rol === 'TecnicoExterno') {
                // Necesitamos saber la familia del equipo
                const eqSnap = await getDoc(doc(db, 'equipos', currentOT.equipoId));
                const eqData = eqSnap.data() as Equipo;

                if (eqData && targetTec.especialidad !== eqData.familia) {
                    conflictos.push({
                        otId: change.otId,
                        otNumero: change.otNumero,
                        equipoNombre: change.equipoNombre,
                        detalle: `Regla de Negocio: ${targetTec.nombre} es EXTERNO especialista en ${targetTec.especialidad || 'desconocido'}. NO puede atender equipo de familia ${eqData.familia}.`
                    });
                    continue;
                }
            }
        }

        // REGLA: Solo modificable si estatus es "Asignada"
        if (currentOT.estatus !== 'Asignada') {
            conflictos.push({
                otId: change.otId,
                otNumero: change.otNumero,
                equipoNombre: change.equipoNombre,
                detalle: `No editable: estatus actual es "${currentOT.estatus}"`
            });
            continue;
        }

        // Detectar si fue modificada individualmente (fuera del panel)
        let fueModificadaIndividualmente = false;
        if (lastBatch) {
            const originalAssignment = lastBatch.asignaciones.find(a => a.equipoId === change.equipoId);
            if (originalAssignment) {
                if (currentOT.tecnicoId !== originalAssignment.tecnicoId ||
                    currentOT.fechas?.programada !== originalAssignment.fechaProgramada) {
                    fueModificadaIndividualmente = true;
                    conflictos.push({
                        otId: change.otId,
                        otNumero: change.otNumero,
                        equipoNombre: change.equipoNombre,
                        detalle: `⚠️ Esta OT fue modificada individualmente después del último despacho masivo. Técnico o fecha difieren del batch original.`
                    });
                }
            }
        }

        const updateData: any = { updatedAt: new Date().toISOString() };

        // Cambiar técnico
        if (change.newTecnicoId && change.newTecnicoId !== currentOT.tecnicoId) {
            const oldTecName = allTecnicos.find(t => t.id === currentOT.tecnicoId)?.nombre || 'N/A';
            const newTecName = allTecnicos.find(t => t.id === change.newTecnicoId)?.nombre || 'N/A';

            updateData.tecnicoId = change.newTecnicoId;

            batchChanges.push({
                batchRecordId: '', // Se llenará después
                otId: change.otId,
                otNumero: change.otNumero,
                equipoId: change.equipoId,
                equipoNombre: change.equipoNombre,
                campo: 'tecnicoId',
                valorAnterior: currentOT.tecnicoId || '',
                valorNuevo: change.newTecnicoId,
                tecnicoAnteriorNombre: oldTecName,
                tecnicoNuevoNombre: newTecName,
                fueModificadaIndividualmente,
            });

            // También registrar en bitácora estándar
            await logBitacora({
                clienteId: user.clienteId,
                otId: change.otId,
                otNumero: change.otNumero,
                fecha: new Date().toISOString(),
                usuarioId: user.id,
                usuarioNombre: user.nombre,
                accion: `Modificación Masiva: Reasignación de Técnico`,
                campo: 'tecnicoId',
                valorAnterior: oldTecName,
                valorNuevo: newTecName,
            });
        }

        // Cambiar fecha programada
        if (change.newFechaProgramada && change.newFechaProgramada !== currentOT.fechas?.programada) {
            updateData['fechas.programada'] = change.newFechaProgramada;

            batchChanges.push({
                batchRecordId: '',
                otId: change.otId,
                otNumero: change.otNumero,
                equipoId: change.equipoId,
                equipoNombre: change.equipoNombre,
                campo: 'fechas.programada',
                valorAnterior: currentOT.fechas?.programada || '',
                valorNuevo: change.newFechaProgramada,
                fueModificadaIndividualmente,
            });

            await logBitacora({
                clienteId: user.clienteId,
                otId: change.otId,
                otNumero: change.otNumero,
                fecha: new Date().toISOString(),
                usuarioId: user.id,
                usuarioNombre: user.nombre,
                accion: `Modificación Masiva: Cambio de Fecha Programada`,
                campo: 'fechas.programada',
                valorAnterior: currentOT.fechas?.programada || 'Sin fecha',
                valorNuevo: change.newFechaProgramada,
            });
        }

        // Ejecutar la actualización
        if (Object.keys(updateData).length > 1) { // > 1 porque updatedAt siempre está
            await trackedUpdateDoc(otRef, updateData);
            totalModificadas++;
            otIdsAfectados.push(change.otId);

            newAssignments.push({
                equipoId: change.equipoId,
                tecnicoId: change.newTecnicoId || currentOT.tecnicoId || '',
                fechaProgramada: change.newFechaProgramada || currentOT.fechas?.programada || '',
            });
        }
    }

    // 3. Registrar el MassiveBatchRecord de la modificación
    const batchRecord: Omit<MassiveBatchRecord, 'id'> = {
        preventivoPlanId: eventId,
        sucursalId: changes[0]?.otId ? '' : '', // Se llenará con la sucursal
        fechaOperacion: new Date().toISOString(),
        tipoOperacion: 'MODIFICACION_MASIVA',
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        totalOTs: totalModificadas,
        asignaciones: newAssignments,
        otIdsAfectados,
    };

    const batchRef = await trackedAddDoc(collection(db, 'massiveBatchRecords'), batchRecord);

    // 4. Registrar cambios granulares con referencia al batch
    for (const change of batchChanges) {
        change.batchRecordId = batchRef.id;
        await trackedAddDoc(collection(db, 'massiveBatchChanges'), change);
    }

    return { totalModificadas, conflictos, batchRecordId: batchRef.id };
};


/**
 * Obtiene el historial de operaciones masivas de un evento.
 */
export const getMassiveBatchHistory = async (eventId: string): Promise<MassiveBatchRecord[]> => {
    const { orderBy } = await import('firebase/firestore');
    const q = query(
        collection(db, 'massiveBatchRecords'),
        where('preventivoPlanId', '==', eventId),
        orderBy('fechaOperacion', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MassiveBatchRecord));
};

/**
 * Obtiene los cambios granulares de un batch específico.
 */
export const getMassiveBatchChanges = async (batchRecordId: string): Promise<MassiveBatchChange[]> => {
    const q = query(
        collection(db, 'massiveBatchChanges'),
        where('batchRecordId', '==', batchRecordId)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as MassiveBatchChange));
};


export const updateCounterConfig = async (clienteId: string, otNumber: number, preventiveOtNumber: number, user: User) => {
    const docId = (!clienteId || clienteId === 'ADMIN') ? 'counters' : `counters_${clienteId}`;
    const counterRef = doc(db, 'config', docId);

    const oldSnap = await getDoc(counterRef);
    const oldData = oldSnap.exists() ? oldSnap.data() : { otNumber: 0, preventiveOtNumber: 0 };

    await trackedUpdateDoc(counterRef, { otNumber, preventiveOtNumber });

    // Auditar cambio de folios
    if (oldData.otNumber !== otNumber) {
        await logBitacora({
            clienteId: clienteId || 'ADMIN',
            otId: 'CONFIG_FOLIOS',
            otNumero: 0,
            fecha: new Date().toISOString(),
            usuarioId: user.id,
            usuarioNombre: user.nombre,
            accion: 'Ajuste Manual de Folio (Correctivas)',
            campo: 'otNumber',
            valorAnterior: oldData.otNumber,
            valorNuevo: otNumber
        });
    }
    if (oldData.preventiveOtNumber !== preventiveOtNumber) {
        await logBitacora({
            clienteId: clienteId || 'ADMIN',
            otId: 'CONFIG_FOLIOS',
            otNumero: 0,
            fecha: new Date().toISOString(),
            usuarioId: user.id,
            usuarioNombre: user.nombre,
            accion: 'Ajuste Manual de Folio (Preventivas)',
            campo: 'preventiveOtNumber',
            valorAnterior: oldData.preventiveOtNumber,
            valorNuevo: preventiveOtNumber
        });
    }
};

export const updateOTStatus = async (otId: string, status: string, user: User, additionalData: any = {}) => {
    const otRef = doc(db, 'ordenesTrabajo', otId);
    const otSnap = await getDoc(otRef);
    const otData = otSnap.data() as WorkOrder;

    const updateData: any = { estatus: status };
    const timestampField = `fechas.${status.toLowerCase().replace(/ /g, '')}`;
    updateData[timestampField] = new Date().toISOString();

    await trackedUpdateDoc(otRef, { ...updateData, ...additionalData });

    // Auditoría de cambio de estado
    await logBitacora({
        clienteId: otData.clienteId,
        otId: otId,
        otNumero: otData.numero,
        fecha: new Date().toISOString(),
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        accion: `Cambio de Estado`,
        campo: 'estatus',
        valorAnterior: otData.estatus,
        valorNuevo: status
    });
};

// --- Bitácora de Auditoría ---
export const logBitacora = async (entry: Omit<BitacoraEntry, 'id'>) => {
    await trackedAddDoc(collection(db, 'bitacora'), entry);
};

export const addBitacoraEntry = async (entry: any) => {
    await trackedAddDoc(collection(db, 'bitacora'), entry);
};

export const getWorkOrders = async (user?: User) => {
    let q = query(collection(db, 'ordenesTrabajo'));
    if (user && user.rol !== 'Admin General' && user.clienteId !== 'ADMIN') {
        q = query(q, where('clienteId', '==', user.clienteId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkOrder));
};

export const updateWorkOrder = async (id: string, data: Partial<WorkOrder>) => {
    await trackedUpdateDoc(doc(db, 'ordenesTrabajo', id), { ...data });
};

export const getUsuarios = async (user?: User) => {
    let q = query(collection(db, 'usuarios'));
    if (user && user.rol !== 'Admin General' && user.clienteId !== 'ADMIN') {
        q = query(q, where('clienteId', '==', user.clienteId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

export const updateOTWithAudit = async (
    otId: string,
    oldData: WorkOrder,
    newData: Partial<WorkOrder>,
    user: User,
    accionNombre: string = "Modificación de Registro"
) => {
    const changes: any[] = [];
    const fieldsToTrack = [
        'descripcionFalla', 'justificacion', 'prioridad', 'tecnicoId',
        'descripcionServicio', 'repuestosUtilizados', 'fechas.programada'
    ];

    // Detectar cambios
    for (const field of fieldsToTrack) {
        const oldValue = field.includes('.') ? (oldData as any).fechas?.programada : (oldData as any)[field];
        const newValue = field.includes('.') ? (newData as any).fechas?.programada : (newData as any)[field];

        if (newValue !== undefined && newValue !== oldValue) {
            changes.push({
                field,
                old: oldValue || "Vacio",
                new: newValue
            });
        }
    }

    // Si hay cambios, registrar en bitácora y actualizar OT
    if (changes.length > 0) {
        for (const change of changes) {
            await logBitacora({
                clienteId: user.clienteId,
                otId,
                otNumero: oldData.numero,
                fecha: new Date().toISOString(),
                usuarioId: user.id,
                usuarioNombre: user.nombre,
                accion: accionNombre,
                campo: change.field,
                valorAnterior: change.old,
                valorNuevo: change.new
            });
        }
        await trackedUpdateDoc(doc(db, 'ordenesTrabajo', otId), newData);

        // *** NOTIFICACIONES según rol y tipo de cambio ***
        try {
            const clienteId = user.clienteId;
            // Gerente modifica OT Pendiente → notificar Coordinadores
            if (user.rol === 'Gerente' && oldData.estatus === 'Pendiente') {
                const coordQ = query(collection(db, 'usuarios'), where('clienteId', '==', clienteId), where('rol', '==', 'Coordinador'));
                const coordSnap = await getDocs(coordQ);
                let sucDisplay = oldData.sucursalId || '';
                try { const sd = await getDoc(doc(db, 'sucursales', oldData.sucursalId)); if (sd.exists()) sucDisplay = sd.data().nombre || sucDisplay; } catch (_) { }
                for (const c of changes) {
                    coordSnap.forEach(cd => {
                        notificarCambioOT(cd.id, clienteId, oldData.numero, otId, c.field, String(c.old), String(c.new), user.nombre, sucDisplay).catch(console.error);
                    });
                }
            }
            // Asignación de técnico → notificar Técnico y Gerente solicitante
            const tecnicoChange = changes.find(c => c.field === 'tecnicoId');
            if (tecnicoChange && tecnicoChange.new) {
                let sucDisplay = oldData.sucursalId || '';
                try { const sd = await getDoc(doc(db, 'sucursales', oldData.sucursalId)); if (sd.exists()) sucDisplay = sd.data().nombre || sucDisplay; } catch (_) { }
                const equipoNombre = (oldData as any).equipoNombre || 'Equipo';
                const familia = (oldData as any).familia || '';
                const prioridad = (newData as any).prioridad || (oldData as any).prioridad || 'Normal';
                const fechaProg = (newData as any).fechas?.programada || (oldData as any).fechas?.programada || 'Por confirmar';
                notificarTecnicoAsignacion(
                    tecnicoChange.new, clienteId, oldData.numero, otId,
                    sucDisplay, equipoNombre, familia,
                    oldData.descripcionFalla || '', fechaProg, prioridad, user.nombre
                ).catch(console.error);
                if ((oldData as any).solicitanteId) {
                    let tecNombre = 'Técnico';
                    try { const td = await getDoc(doc(db, 'usuarios', tecnicoChange.new)); if (td.exists()) tecNombre = td.data().nombre || 'Técnico'; } catch (_) { }
                    notificarAsignacionOT(
                        (oldData as any).solicitanteId, clienteId, oldData.numero, otId,
                        sucDisplay, tecNombre, fechaProg, user.nombre
                    ).catch(console.error);
                }
            }
        } catch (e) {
            console.error('Error enviando notificaciones:', e);
        }
    }
};
/**
 * Audita cambios en cualquier entidad (Catalogos o Procesos)
 * Detecta automáticamente qué campos cambiaron.
 */
export const logEntityChange = async (
    params: {
        clienteId: string;
        entityName: string;
        entityId: string;
        otNumero?: number;
        oldData: any;
        newData: any;
        user: User;
        fieldsToTrack: string[];
        customAction?: string;
    }
) => {
    const { clienteId, entityName, entityId, otNumero, oldData, newData, user, fieldsToTrack, customAction } = params;

    // Mapa para inferir la colección de Firestore basada en el nombre de la entidad UI
    const collectionMap: Record<string, string> = {
        'Usuario': 'usuarios',
        'Equipo': 'equipos',
        'Sucursal': 'sucursales',
        'Franquicia': 'franquicias',
        'Catálogo': 'catalogos',
        'Cliente': 'clientes'
    };
    const collectionName = collectionMap[entityName] || '';

    if (!oldData) {
        // Es creación
        const isSuperAdminAction = user.rol === 'Admin General' && user.clienteId === 'ADMIN';
        await logBitacora({
            clienteId,
            otId: entityId,
            otNumero: otNumero || 0,
            fecha: new Date().toISOString(),
            usuarioId: user.id,
            usuarioNombre: user.nombre,
            accion: customAction || `CREACIÓN DE ${entityName.toUpperCase()}`,
            campo: 'General',
            valorAnterior: 'N/A',
            valorNuevo: `Registro creado exitosamente.`,
            isSuperAdminAction,
            collectionName
        });
        return;
    }

    // Es edición
    const isSuperAdminAction = user.rol === 'Admin General' && user.clienteId === 'ADMIN';

    for (const field of fieldsToTrack) {
        if (newData[field] !== undefined && newData[field] !== oldData[field]) {
            await logBitacora({
                clienteId,
                otId: entityId,
                otNumero: otNumero || 0,
                fecha: new Date().toISOString(),
                usuarioId: user.id,
                usuarioNombre: user.nombre,
                accion: customAction || `EDICIÓN DE ${entityName.toUpperCase()}`,
                campo: field,
                valorAnterior: oldData[field] || 'Vacio',
                valorNuevo: newData[field],
                isSuperAdminAction,
                collectionName
            });
        }
    }
};

// --- Servicios de Plan Preventivo 2026 ---
export const getPlanPreventivo = async (user?: User) => {
    let q = query(collection(db, 'planPreventivo2026'));
    if (user && user.rol !== 'Admin General' && user.clienteId !== 'ADMIN') {
        q = query(q, where('clienteId', '==', user.clienteId));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PreventivoPlanEntry));
};

export const updatePreventivoPlan = async (
    planId: string,
    oldData: PreventivoPlanEntry,
    newData: Partial<PreventivoPlanEntry>,
    user: User
) => {
    const changes: any[] = [];
    const fields = ['mes', 'fechas', 'sucursalId', 'franquiciaId', 'txtPDF'];
    const dataToUpdate: any = {};

    fields.forEach(f => {
        const fieldName = f as keyof PreventivoPlanEntry;
        const newValue = newData[fieldName];

        if (newValue !== undefined) {
            dataToUpdate[fieldName] = newValue;
            if (newValue !== oldData[fieldName]) {
                changes.push({
                    campo: f,
                    anterior: oldData[fieldName] ?? 'N/A',
                    nuevo: newValue
                });
            }
        }
    });

    if (changes.length > 0) {
        // Guardar en Bitácora
        await trackedAddDoc(collection(db, 'bitacoraPreventivos2026'), {
            planId,
            fecha: new Date().toISOString(),
            usuarioId: user.id,
            usuarioNombre: user.nombre,
            accion: 'Edición de Programación',
            detalles: changes,
            // Evitar undefined en los metadatos
            sucursalId: oldData.sucursalId || '',
            franquiciaId: oldData.franquiciaId || '',
            txtPDF: oldData.txtPDF || ''
        });

        // Actualizar en Firestore (usando solo los campos limpios sin el 'id')
        await trackedUpdateDoc(doc(db, 'planPreventivo2026', planId), dataToUpdate);
    }
};

export const undoPreventivoChange = async (auditEntry: BitacoraPreventivo) => {
    const reverseData: any = {};
    auditEntry.detalles.forEach(d => {
        reverseData[d.campo] = d.anterior;
    });

    // Eliminamos el registro de la bitácora (o lo marcamos como deshecho)
    // Para simplificar según lo pedido "reversar en orden cronológico", 
    // en el componente buscaremos el último y llamaremos a esta función.
    await trackedUpdateDoc(doc(db, 'planPreventivo2026', auditEntry.planId), reverseData);
    if (auditEntry.id) {
        // En un escenario real borraríamos o marcaríamos, aquí eliminamos para que el "siguiente último" sea el anterior
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'bitacoraPreventivos2026', auditEntry.id));
    }
};

export const getBitacoraPreventivos = async () => {
    const { orderBy } = await import('firebase/firestore');
    const q = query(collection(db, 'bitacoraPreventivos2026'), orderBy('fecha', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BitacoraPreventivo));
};

export const importPreventivoPlan = async (newData: Omit<PreventivoPlanEntry, 'id'>[], user: User, clearExisting: boolean = true) => {
    const { writeBatch } = await import('firebase/firestore');
    const batch = writeBatch(db);

    if (clearExisting) {
        let q = query(collection(db, 'planPreventivo2026'));
        if (user && user.rol !== 'Admin General' && user.clienteId !== 'ADMIN') {
            q = query(q, where('clienteId', '==', user.clienteId));
        }
        const snapshot = await getDocs(q);
        snapshot.docs.forEach(d => batch.delete(d.ref));
    }

    newData.forEach(item => {
        const newRef = doc(collection(db, 'planPreventivo2026'));
        batch.set(newRef, item);
    });

    await batch.commit();

    await logBitacora({
        clienteId: user.clienteId,
        otId: 'IMPORT_PLAN',
        otNumero: 0,
        fecha: new Date().toISOString(),
        usuarioId: user.id,
        usuarioNombre: user.nombre,
        accion: 'Importación de Plan Preventivo 2026',
        campo: 'plan_preventivo',
        valorAnterior: clearExisting ? 'Plan Anterior (Borrado)' : 'Plan Existente',
        valorNuevo: `Importados ${newData.length} registros`
    });
};
