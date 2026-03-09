import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function findCongelador() {
    const q = query(collection(db, 'equipos'), where('nombre', '==', 'BA-Congelador de tarros vertical (1)'));
    const snap = await getDocs(q);
    console.log(`Encontrados: ${snap.size}`);
    snap.forEach(d => {
        console.log(`Familia: ${d.data().familia} | Cliente: ${d.data().clienteId} | Sucursal: ${d.data().sucursalId}`);
    });
}
findCongelador().catch(console.error);
