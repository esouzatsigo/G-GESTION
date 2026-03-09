import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function unifySucursales() {
    const oldSucId = 'HocVkOhJBlw3JAulA0Gb';
    const newSucId = 'BA';
    const targetClient = '3de6K2GeasZhN2GIQWXw';

    console.log(`--- Iniciando Unificación de Sucursales (${oldSucId} -> ${newSucId}) ---`);

    const q = query(collection(db, 'equipos'), where('sucursalId', '==', oldSucId));
    const snap = await getDocs(q);
    console.log(`Encontrados ${snap.size} equipos.`);

    let count = 0;
    for (const d of snap.docs) {
        const data = d.data();
        // Solo cambiar si el cliente coincide (para no romper QA)
        if (data.clienteId === targetClient) {
            await updateDoc(doc(db, 'equipos', d.id), {
                sucursalId: newSucId
            });
            count++;
        }
    }

    console.log(`Actualizados ${count} equipos a sucursal ${newSucId}.`);
}

unifySucursales().catch(console.error);
