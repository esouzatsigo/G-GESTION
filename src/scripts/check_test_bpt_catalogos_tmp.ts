import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';

async function main() {
    const qTestBpt = query(collection(db, 'catalogos'), where('clienteId', '==', '3de6K2GeasZhN2GIQWXw'), where('categoria', '==', 'Familia'));
    const snapTestBpt = await getDocs(qTestBpt);

    const catalogos = snapTestBpt.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log("Catálogos 'Familia' en TEST BPT:");
    console.dir(catalogos, { depth: null });
    process.exit(0);
}
main().catch(console.error);
