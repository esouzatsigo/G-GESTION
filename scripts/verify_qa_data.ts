import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function checkQaEquipos() {
    const qaClient = 'kWRmv16DNfMUlSF1Yqiv';
    const q = query(collection(db, 'equipos'), where('clienteId', '==', qaClient));
    const snap = await getDocs(q);
    console.log(`--- Equipos de QA (Total: ${snap.size}) ---`);

    const bySuc: Record<string, number> = {};
    snap.forEach(d => {
        const data = d.data();
        bySuc[data.sucursalId] = (bySuc[data.sucursalId] || 0) + 1;
    });
    console.log('Distribución por sucursalId:', JSON.stringify(bySuc, null, 2));

    // Revisar sucursales de este cliente
    const q2 = query(collection(db, 'sucursales'), where('clienteId', '==', qaClient));
    const snap2 = await getDocs(q2);
    console.log('--- Sucursales de QA ---');
    snap2.forEach(d => {
        console.log(`ID: ${d.id} | Nombre: ${d.data().nombre}`);
    });
}
checkQaEquipos().catch(console.error);
