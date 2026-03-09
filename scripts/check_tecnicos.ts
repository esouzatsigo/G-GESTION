import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function checkTecnicos() {
    const client = '3de6K2GeasZhN2GIQWXw';
    const q = query(collection(db, 'usuarios'), where('clienteId', '==', client));
    const snap = await getDocs(q);
    console.log(`--- Usuarios de TEST BPT: ${snap.size} ---`);
    snap.forEach(d => {
        const data = d.data();
        console.log(`ID: ${d.id} | Nombre: ${data.nombre} | Rol: "${data.rol}" | Especialidad: "${data.especialidad || 'N/A'}"`);
    });
}
checkTecnicos().catch(console.error);
