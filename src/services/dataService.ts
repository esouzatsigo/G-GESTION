import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    runTransaction
} from 'firebase/firestore';
import { db } from './firebase';
import type { Cliente, Franquicia, Sucursal, Equipo, WorkOrder, User } from '../types';

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
export const getClientes = async () => {
    const snapshot = await getDocs(collection(db, 'clientes'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cliente));
};

export const saveCliente = async (cliente: Omit<Cliente, 'id'>, user: User, id?: string) => {
    if (id) {
        const docRef = doc(db, 'clientes', id);
        const oldSnap = await getDoc(docRef);
        const oldData = oldSnap.data() as Cliente;

        await updateDoc(docRef, cliente);

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
        const docRef = await addDoc(collection(db, 'clientes'), cliente);
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
        return docRef.id;
    }
};

// --- Servicios de Franquicias ---
export const getFranquicias = async (clienteId?: string) => {
    let q = collection(db, 'franquicias');
    const constraints = [];
    if (clienteId) constraints.push(where('clienteId', '==', clienteId));
    const snapshot = await getDocs(query(q, ...constraints));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Franquicia));
};

// --- Servicios de Sucursales ---
export const getSucursales = async (clienteId?: string, franquiciaId?: string) => {
    let q = collection(db, 'sucursales');
    const constraints = [];
    if (clienteId) constraints.push(where('clienteId', '==', clienteId));
    if (franquiciaId) constraints.push(where('franquiciaId', '==', franquiciaId));
    const snapshot = await getDocs(query(q, ...constraints));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sucursal));
};

// --- Servicios de Equipos ---
export const getEquipos = async (sucursalId: string, familia?: string) => {
    let q = query(collection(db, 'equipos'), where('sucursalId', '==', sucursalId));
    if (familia) q = query(q, where('familia', '==', familia));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Equipo));
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
    const docRef = await addDoc(collection(db, 'ordenesTrabajo'), {
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

        const docRef = await addDoc(collection(db, 'ordenesTrabajo'), newOT);
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

    const batchRef = await addDoc(collection(db, 'massiveBatchRecords'), batchRecord);

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
export const getExistingOTsForEvent = async (eventId: string) => {
    const q = query(collection(db, 'ordenesTrabajo'), where('preventivoPlanId', '==', eventId));
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
            if (targetTec?.rol === 'TecnicoExterno') {
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
            await updateDoc(otRef, updateData);
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

    const batchRef = await addDoc(collection(db, 'massiveBatchRecords'), batchRecord);

    // 4. Registrar cambios granulares con referencia al batch
    for (const change of batchChanges) {
        change.batchRecordId = batchRef.id;
        await addDoc(collection(db, 'massiveBatchChanges'), change);
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

    await updateDoc(counterRef, { otNumber, preventiveOtNumber });

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

    await updateDoc(otRef, { ...updateData, ...additionalData });

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
    await addDoc(collection(db, 'bitacora'), entry);
};

export const addBitacoraEntry = async (entry: any) => {
    await addDoc(collection(db, 'bitacora'), entry);
};

export const getWorkOrders = async () => {
    const snapshot = await getDocs(collection(db, 'ordenesTrabajo'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WorkOrder));
};

export const updateWorkOrder = async (id: string, data: Partial<WorkOrder>) => {
    await updateDoc(doc(db, 'ordenesTrabajo', id), { ...data, updatedAt: new Date().toISOString() });
};

export const getUsuarios = async () => {
    const snapshot = await getDocs(collection(db, 'usuarios'));
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
        await updateDoc(doc(db, 'ordenesTrabajo', otId), newData);
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

    if (!oldData) {
        // Es creación
        const isSuperAdminAction = user.rol === 'Admin' && user.clienteId === 'ADMIN';
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
            isSuperAdminAction
        });
        return;
    }

    // Es edición
    const isSuperAdminAction = user.rol === 'Admin' && user.clienteId === 'ADMIN';

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
                isSuperAdminAction
            });
        }
    }
};

// --- Servicios de Plan Preventivo 2026 ---
export const getPlanPreventivo = async () => {
    const snapshot = await getDocs(collection(db, 'planPreventivo2026'));
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
        await addDoc(collection(db, 'bitacoraPreventivos2026'), {
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
        await updateDoc(doc(db, 'planPreventivo2026', planId), dataToUpdate);
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
    await updateDoc(doc(db, 'planPreventivo2026', auditEntry.planId), reverseData);
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
        const snapshot = await getDocs(collection(db, 'planPreventivo2026'));
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
