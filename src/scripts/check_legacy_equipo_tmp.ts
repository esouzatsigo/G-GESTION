import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../services/firebase';

async function main() {
    // TEST BPT = 3de6K2GeasZhN2GIQWXw
    const q = query(collection(db, 'equipos'), where('clienteId', '==', '3de6K2GeasZhN2GIQWXw'), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
        console.log("Equipo de TEST BPT:");
        console.log(JSON.stringify(snap.docs[0].data(), null, 2));
    } else {
        console.log("No se encontraron equipos para TEST BPT");
    }
    process.exit(0);
}
main();
