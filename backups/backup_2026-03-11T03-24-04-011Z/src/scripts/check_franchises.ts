import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

async function check() {
    const fSnap = await getDocs(collection(db, 'franquicias'));
    console.log("=== FRANQUICIAS ===");
    fSnap.forEach(d => {
        const f = d.data();
        console.log(`ID: ${d.id} | Nombre: ${f.nombre} | Cliente: ${f.clienteId}`);
    });

    const sSnap = await getDocs(collection(db, 'sucursales'));
    console.log("=== SUCURSALES ===");
    sSnap.forEach(d => {
        const s = d.data();
        console.log(`ID: ${d.id} | Nombre: ${s.nombre} | FranquiciaId: ${s.franquiciaId}`);
    });
}
check().catch(console.error);
