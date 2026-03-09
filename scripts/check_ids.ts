import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function checkIds() {
    console.log('--- Revisando Configuraciones de IDS ---');

    // 1. Sucursal BA
    const sucSnap = await getDoc(doc(db, 'sucursales', 'BA'));
    if (sucSnap.exists()) {
        console.log(`Sucursal BA (Altabrisa) -> ClienteId: ${sucSnap.data().clienteId}`);
    } else {
        console.log('Sucursal BA no encontrada.');
    }

    // 2. Primeros 5 equipos de BA
    const { query, where, limit } = await import('firebase/firestore');
    const eqQ = query(collection(db, 'equipos'), where('sucursalId', '==', 'BA'), limit(10));
    const eqSnap = await getDocs(eqQ);
    console.log(`Equipos en BA encontrados: ${eqSnap.size}`);
    eqSnap.forEach(d => {
        console.log(`Equipo: ${d.data().nombre} | ClienteId: ${d.data().clienteId}`);
    });
}

checkIds().catch(console.error);
