import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../services/firebase';

async function main() {
    // BPT GROUP = HXIjyDoFvWl00Qs29QPw
    const q = query(collection(db, 'equipos'), where('clienteId', '==', 'HXIjyDoFvWl00Qs29QPw'), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
        console.log("Equipo de BPT GROUP:");
        console.log(JSON.stringify(snap.docs[0].data(), null, 2));
    } else {
        console.log("No se encontraron equipos para BPT GROUP");
    }
    process.exit(0);
}
main();
