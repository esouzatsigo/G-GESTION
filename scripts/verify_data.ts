import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function verifyFinal() {
    const client = '3de6K2GeasZhN2GIQWXw';
    const q = query(collection(db, 'equipos'), where('clienteId', '==', client));
    const snap = await getDocs(q);
    console.log(`--- Equipos de TEST BPT (Total: ${snap.size}) ---`);

    const bySuc: Record<string, number> = {};
    snap.forEach(d => {
        const data = d.data();
        bySuc[data.sucursalId] = (bySuc[data.sucursalId] || 0) + 1;
    });
    console.log('Distribución por sucursalId:', JSON.stringify(bySuc, null, 2));

    // Revisar sucursales de este cliente
    const q2 = query(collection(db, 'sucursales'), where('clienteId', '==', client));
    const snap2 = await getDocs(q2);
    console.log('--- Sucursales de TEST BPT ---');
    snap2.forEach(d => {
        console.log(`ID: ${d.id} | Nombre: ${d.data().nombre}`);
    });
}
verifyFinal().catch(console.error);
