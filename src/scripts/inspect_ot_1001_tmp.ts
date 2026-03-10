import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

async function main() {
    const q = query(collection(db, 'ordenesTrabajo'), where('numero', '==', 1001));
    const snap = await getDocs(q);

    if (snap.empty) {
        console.log("No se encontró la OT #1001");
    } else {
        const data = snap.docs[0].data();
        console.log("OT #1001 Data:");
        console.log(JSON.stringify(data, null, 2));
    }
    process.exit(0);
}
main();
