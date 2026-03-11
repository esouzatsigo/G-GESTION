import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';

async function verifyHijack() {
    console.log("--- AUDITORÍA DE SECUESTRO DE SUCURSAL (BA) ---");

    // 1. Obtener la sucursal BA
    const sucRef = doc(db, 'sucursales', 'BA');
    const sucSnap = await getDoc(sucRef);

    if (sucSnap.exists()) {
        const data = sucSnap.data();
        console.log(`Sucursal ID: BA`);
        console.log(`Nombre: ${data.nombre}`);
        console.log(`ClienteID Actual: ${data.clienteId}`);

        // 2. Buscar el cliente dueño de ese ID
        const clientSnap = await getDoc(doc(db, 'clientes', data.clienteId));
        if (clientSnap.exists()) {
            console.log(`Dueño Actual: ${clientSnap.data().nombre} (${clientSnap.data().razonSocial})`);
            console.log(`Fecha de Creación (aprox): ${clientSnap.id.startsWith('DEBUG') ? 'DEBUG' : 'Autogenerado'}`);
        } else {
            console.log(`❌ ERROR: El ClienteID ${data.clienteId} NO EXISTE en la colección de clientes.`);
        }
    } else {
        console.log("❌ ERROR: La sucursal 'BA' no existe con ese ID.");
    }

    console.log("\n--- FIN ---");
    process.exit(0);
}

verifyHijack().catch(console.error);
