import {
    collection,
    addDoc,
    updateDoc,
    doc,
    getDocs,
    query,
    where,
    runTransaction
} from 'firebase/firestore';
import { db } from './firebase';
import type { Cliente, Franquicia, Sucursal, Equipo, WorkOrder, User } from '../types';

export interface BitacoraEntry {
    id?: string;
    otId: string;
    otNumero: number;
    fecha: string;
    usuarioId: string;
    usuarioNombre: string;
    accion: string;
    campo: string;
    valorAnterior: any;
    valorNuevo: any;
}

export interface PreventivoPlanEntry {
    id: string;
    mes: number;
    fechas: string;
    sucursalId: string;
    txtPDF: string;
}

export interface BitacoraPreventivo {
    id?: string;
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

export const saveCliente = async (cliente: Omit<Cliente, 'id'>, id?: string) => {
    if (id) {
        await updateDoc(doc(db, 'clientes', id), cliente);
        return id;
    } else {
        const docRef = await addDoc(collection(db, 'clientes'), cliente);
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
export const getNextOTNumber = async () => {
    return await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'config', 'counters');
        const counterDoc = await transaction.get(counterRef);

        let numero = 1000;
        if (!counterDoc.exists()) {
            transaction.set(counterRef, { otNumber: 1000 });
        } else {
            numero = (counterDoc.data()?.otNumber || 999) + 1;
            transaction.update(counterRef, { otNumber: numero });
        }
        return numero;
    });
};

// --- Servicios de Ordenes de Trabajo (OT) ---
export const createOT = async (ot: Omit<WorkOrder, 'id' | 'numero'>) => {
    const numero = await getNextOTNumber();
    const docRef = await addDoc(collection(db, 'ordenesTrabajo'), {
        ...ot,
        numero,
        fechas: {
            ...ot.fechas,
            solicitada: new Date().toISOString()
        }
    });
    return { id: docRef.id, numero };
};

export const updateOTStatus = async (otId: string, status: string, additionalData: any = {}) => {
    const updateData: any = { estatus: status };
    const timestampField = `fechas.${status.toLowerCase().replace(/ /g, '')}`;
    updateData[timestampField] = new Date().toISOString();

    await updateDoc(doc(db, 'ordenesTrabajo', otId), { ...updateData, ...additionalData });
};

// --- Bitácora de Auditoría ---
export const logBitacora = async (entry: Omit<BitacoraEntry, 'id'>) => {
    await addDoc(collection(db, 'bitacora'), entry);
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
    const fields = ['mes', 'fechas', 'sucursalId', 'txtPDF'];

    fields.forEach(f => {
        if (newData[f as keyof PreventivoPlanEntry] !== undefined && newData[f as keyof PreventivoPlanEntry] !== oldData[f as keyof PreventivoPlanEntry]) {
            changes.push({
                campo: f,
                anterior: oldData[f as keyof PreventivoPlanEntry],
                nuevo: newData[f as keyof PreventivoPlanEntry]
            });
        }
    });

    if (changes.length > 0) {
        await addDoc(collection(db, 'bitacoraPreventivos2026'), {
            planId,
            fecha: new Date().toISOString(),
            usuarioId: user.id,
            usuarioNombre: user.nombre,
            accion: 'Edición de Programación',
            detalles: changes
        });
        await updateDoc(doc(db, 'planPreventivo2026', planId), newData);
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
