import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';

async function main() {
    // BPT GROUP = HXIjyDoFvWl00Qs29QPw
    const q = query(collection(db, 'usuarios'), where('clienteId', '==', 'HXIjyDoFvWl00Qs29QPw'));
    const snap = await getDocs(q);

    console.log("Usuarios BPT GROUP:");
    snap.forEach(d => {
        const u = d.data();
        console.log(`- ${u.nombre}: ROL="${u.rol}"`);
    });

    const qCat = query(collection(db, 'catalogos'), where('clienteId', '==', 'HXIjyDoFvWl00Qs29QPw'), where('tipo', '==', 'roles'));
    const snapCat = await getDocs(qCat);
    console.log("\nCatálogos de Roles:");
    snapCat.forEach(d => {
        const c = d.data();
        console.log(`- ${c.nombre}: nomenclatura="${c.nomenclatura || 'N/A'}"`);
    });

    process.exit(0);
}
main();
