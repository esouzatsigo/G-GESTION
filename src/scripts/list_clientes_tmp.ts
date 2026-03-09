import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

async function main() {
    const snap = await getDocs(collection(db, 'clientes'));
    snap.docs.forEach(d => {
        console.log(`ID: ${d.id} | Nombre: ${d.data().nombre}`);
    });
    process.exit(0);
}
main();
