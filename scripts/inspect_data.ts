import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function inspectData() {
    const sucs = ['HocVkOhJBlw3JAulA0Gb', 'Azbef4Og1nABbWAQdQvJ', 'BA'];

    for (const sId of sucs) {
        const q = query(collection(db, 'equipos'), where('sucursalId', '==', sId), limit(5));
        const snap = await getDocs(q);
        console.log(`--- Sucursal ${sId} (Limit 5) ---`);
        snap.forEach(d => {
            console.log(`ID: ${d.id} | Nombre: ${d.data().nombre} | Cliente: ${d.data().clienteId}`);
        });
    }
}

inspectData().catch(console.error);
