import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';

async function main() {
    const qTestBpt = query(collection(db, 'catalogos'), where('clienteId', '==', 'HXIjyDoFvWl00Qs29QPw'));
    const snapTestBpt = await getDocs(qTestBpt);

    const catalogos = snapTestBpt.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log("Catálogos actuales en BPT GROUP:");
    console.dir(catalogos, { depth: null });
    process.exit(0);
}
main().catch(console.error);
