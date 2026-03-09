import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function checkSpaces() {
    const q = query(collection(db, 'equipos'), where('sucursalId', '==', 'BA'), where('clienteId', '==', '3de6K2GeasZhN2GIQWXw'));
    const snap = await getDocs(q);
    console.log(`Equipos en BA: ${snap.size}`);

    snap.forEach(d => {
        const data = d.data();
        console.log(`|${data.sucursalId}| |${data.familia}| |${data.nombre}|`);
    });
}
checkSpaces().catch(console.error);
