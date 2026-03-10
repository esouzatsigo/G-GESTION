import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';

async function main() {
    const snap = await getDocs(collection(db, 'usuarios'));
    const legacy = snap.docs.filter(d => d.data().rol === 'Coordinador' || d.data().rol === 'Gerente');
    if (legacy.length > 0) {
        console.log(`Se encontraron ${legacy.length} usuarios con roles legacy:`);
        legacy.forEach(d => {
            const u = d.data();
            console.log(`- ${u.nombre} (Cliente: ${u.clienteId}): ROL="${u.rol}"`);
        });
    } else {
        console.log("No se encontraron más usuarios con roles legacy (Coordinador/Gerente).");
    }
    process.exit(0);
}
main();
