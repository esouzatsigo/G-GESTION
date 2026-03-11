import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';

async function diagEquipos() {
    const clienteId = "3de6K2GeasZhN2GIQWXw"; // TEST BPT
    const sucursalId = "HocVkOhJBlw3JAulA0Gb"; // Altabrisa (Fixed ID)

    console.log(`🔍 Buscando equipos para Cliente: ${clienteId} y Sucursal: ${sucursalId}`);

    const q = query(collection(db, 'equipos'), where('clienteId', '==', clienteId));
    const snap = await getDocs(q);

    console.log(`📊 Total equipos encontrados para el cliente: ${snap.docs.length}`);

    snap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`- [${doc.id}] Nombre: ${data.nombre}, SucursalId: ${data.sucursalId}, Familia: ${data.familia}`);
    });

    const filtered = snap.docs.filter(d => d.data().sucursalId === sucursalId);
    console.log(`🎯 Equipos vinculados específicamente a la sucursal seleccionada: ${filtered.length}`);
}

diagEquipos().catch(console.error);
