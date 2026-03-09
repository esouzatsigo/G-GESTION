import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function checkEquipos() {
    console.log('--- Revisando Equipos de Altabrisa (BA) ---');
    const q = query(collection(db, 'equipos'), where('sucursalId', '==', 'BA'));
    const snapshot = await getDocs(q);

    console.log(`Total encontrados: ${snapshot.size}`);

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id} | Nombre: ${data.nombre} | ClienteId: ${data.clienteId} | Familia: ${data.familia}`);
    });
}

checkEquipos().catch(console.error);
