import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';

async function checkLiveOTs() {
    const clienteId = "3de6K2GeasZhN2GIQWXw"; // TEST BPT
    console.log(`🔍 Buscando OTs en vivo para Cliente: ${clienteId}`);

    const q = query(collection(db, 'ordenesTrabajo'), where('clienteId', '==', clienteId));
    const snap = await getDocs(q);

    console.log(`📊 Total OTs encontradas para TEST BPT: ${snap.docs.length}`);

    snap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`- [OT ${data.numero}] ID: ${doc.id}, sucursalId: ${data.sucursalId}, equipoId: ${data.equipoId}`);
    });
}

checkLiveOTs().catch(console.error);
