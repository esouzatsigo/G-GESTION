import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';

async function main() {
    const qTestBpt = query(collection(db, 'catalogos'), where('clienteId', '==', 'HXIjyDoFvWl00Qs29QPw'), where('categoria', '==', 'Familia'));
    const snapTestBpt = await getDocs(qTestBpt);

    // Nomenclaturas manuales o generadas a partir del nombre en MAYÚSCULAS sin espacios
    const familias = snapTestBpt.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log("Familias actuales en BPT GROUP:");
    console.dir(familias, { depth: null });

    let fixed = 0;
    for (const f of familias) {
        if (!f.nomenclatura) {
            // Generalmente, nomenclatura es el nombre en MAYUSCULAS o similar
            const nomenclature = f.nombre.toUpperCase().replace(/\s+/g, '_');
            console.log(`Fijando nomenclatura para ${f.nombre} -> ${nomenclature}`);
            await updateDoc(doc(db, 'catalogos', f.id as string), { nomenclatura: nomenclature });
            fixed++;
        }
    }
    console.log(`Reparadas: ${fixed}`);
    process.exit(0);
}
main().catch(console.error);
