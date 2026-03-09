import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function fullScan() {
    const client = '3de6K2GeasZhN2GIQWXw';
    const q = query(collection(db, 'equipos'), where('clienteId', '==', client));
    const snap = await getDocs(q);
    console.log(`Reporte para ${client} (TEST BPT)`);

    const map: Record<string, string[]> = {};
    snap.forEach(d => {
        const sId = d.data().sucursalId;
        if (!map[sId]) map[sId] = [];
        map[sId].push(d.data().nombre);
    });

    for (const sId in map) {
        console.log(`Sucursal ID: ${sId} | Total: ${map[sId].length}`);
        console.log(`Ejemplos: ${map[sId].slice(0, 3).join(', ')}`);
    }
}
fullScan().catch(console.error);
