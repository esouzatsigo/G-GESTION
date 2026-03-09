import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function findOrphans() {
    const targetClient = '3de6K2GeasZhN2GIQWXw';
    const q = query(collection(db, 'equipos'), where('clienteId', '==', targetClient));
    const snap = await getDocs(q);
    console.log(`Buscando equipos huérfanos para TEST BPT (Total: ${snap.size})`);

    const bySuc: Record<string, number> = {};
    snap.forEach(d => {
        const sId = d.data().sucursalId;
        bySuc[sId] = (bySuc[sId] || 0) + 1;
    });
    console.log('Distribución Actual (sucursalId):', JSON.stringify(bySuc, null, 2));
}
findOrphans().catch(console.error);
