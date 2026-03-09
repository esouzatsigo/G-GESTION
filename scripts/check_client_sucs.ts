import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function checkSucsForClient() {
    const client = '3de6K2GeasZhN2GIQWXw';
    const q = query(collection(db, 'sucursales'), where('clienteId', '==', client));
    const snap = await getDocs(q);
    console.log(`Sucursales para TEST BPT: ${snap.size}`);
    snap.forEach(d => {
        console.log(`ID: ${d.id} | Nombre: ${d.data().nombre}`);
    });
}
checkSucsForClient().catch(console.error);
