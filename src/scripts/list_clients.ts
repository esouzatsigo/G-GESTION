import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

async function listClients() {
    const snap = await getDocs(collection(db, 'clientes'));
    console.log("=== LISTADO DE CLIENTES ===");
    snap.forEach(d => {
        console.log(`[${d.id}] ${d.data().nombre}`);
    });
    process.exit(0);
}
listClients().catch(console.error);
