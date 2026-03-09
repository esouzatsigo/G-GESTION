import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function checkFamilies() {
    const q = query(collection(db, 'equipos'), where('sucursalId', '==', 'BA'), where('clienteId', '==', '3de6K2GeasZhN2GIQWXw'));
    const snap = await getDocs(q);
    console.log(`Equipos en BA de TEST BPT: ${snap.size}`);

    const fams: Record<string, number> = {};
    snap.forEach(d => {
        const f = d.data().familia;
        fams[f] = (fams[f] || 0) + 1;
    });
    console.log('Por Familia:', JSON.stringify(fams, null, 2));
}

checkFamilies().catch(console.error);
