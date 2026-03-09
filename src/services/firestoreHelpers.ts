/**
 * FIRESTORE HELPERS — Wrappers con Timestamps Universales
 * 
 * Toda operación de escritura en Firestore DEBE pasar por estos helpers
 * para garantizar que cada registro tenga:
 *   - createdAt: ISO timestamp de creación (solo en addDoc)
 *   - updatedAt: ISO timestamp de última modificación (en updateDoc)
 * 
 * USO:
 *   import { trackedAddDoc, trackedUpdateDoc } from '../services/firestoreHelpers';
 *   await trackedAddDoc(collection(db, 'equipos'), data);
 *   await trackedUpdateDoc(doc(db, 'equipos', id), data);
 */
import {
    addDoc,
    updateDoc,
} from 'firebase/firestore';
import type {
    DocumentReference,
    CollectionReference,
    DocumentData,
    WithFieldValue,
    UpdateData
} from 'firebase/firestore';

/**
 * Wrapper de addDoc que inyecta `createdAt` automáticamente.
 * @returns DocumentReference del documento creado
 */
export const trackedAddDoc = <T extends DocumentData>(
    reference: CollectionReference<T>,
    data: WithFieldValue<T>
) => {
    const enrichedData = {
        ...data,
        createdAt: new Date().toISOString()
    } as WithFieldValue<T>;
    return addDoc(reference, enrichedData);
};

/**
 * Wrapper de updateDoc que inyecta `updatedAt` automáticamente.
 */
export const trackedUpdateDoc = <T extends DocumentData>(
    reference: DocumentReference<T>,
    data: UpdateData<T>
) => {
    const enrichedData = {
        ...data,
        updatedAt: new Date().toISOString()
    } as UpdateData<T>;
    return updateDoc(reference, enrichedData);
};
