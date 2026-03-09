import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function findAltabrisa() {
    const snap = await getDocs(collection(db, 'sucursales'));
    console.log('--- Sucursales ---');
    snap.forEach(d => {
        console.log(`ID: ${d.id} | Nombre: ${d.data().nombre} | ClienteId: ${d.data().clienteId}`);
    });
}

findAltabrisa().catch(console.error);
