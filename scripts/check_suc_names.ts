import { doc, getDoc } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function checkNames() {
    const ids = ['BA', 'HocVkOhJBlw3JAulA0Gb', 'Azbef4Og1nABbWAQdQvJ'];
    for (const id of ids) {
        const s = await getDoc(doc(db, 'sucursales', id));
        if (s.exists()) {
            console.log(`ID: ${id} | Nombre: ${s.data().nombre} | ClienteId: ${s.data().clienteId}`);
        } else {
            console.log(`ID: ${id} No encontrada.`);
        }
    }
}
checkNames().catch(console.error);
