import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function checkCatalogs() {
    const client = '3de6K2GeasZhN2GIQWXw';
    const q = query(collection(db, 'catalogos'), where('clienteId', '==', client), where('categoria', '==', 'Familia'));
    const snap = await getDocs(q);
    console.log(`Catálogos de Familia para TEST BPT: ${snap.size}`);
    snap.forEach(d => {
        console.log(`Nombre: ${d.data().nombre} | Nomenclatura: ${d.data().nomenclatura}`);
    });
}

checkCatalogs().catch(console.error);
