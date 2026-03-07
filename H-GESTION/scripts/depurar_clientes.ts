import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import * as dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function depurarClientes() {
    console.log("Iniciando depuración de clientes...");

    const clientesSnap = await getDocs(collection(db, 'clientes'));
    const clientes = clientesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const bptClientes = clientes.filter((c: any) => c.nombre.includes('BPT'));

    if (bptClientes.length <= 1) {
        console.log("No se encontraron duplicados de BPT.");
        return;
    }

    console.log(`Encontrados ${bptClientes.length} clientes BPT:`, bptClientes.map((c: any) => c.id));

    // Seleccionamos el primero como principal (o el que tenga más sucursales, pero aquí vamos por el primero)
    const principal = bptClientes[0] as any;
    const duplicados = bptClientes.slice(1);

    const sucursalesSnap = await getDocs(collection(db, 'sucursales'));
    const sucursales = sucursalesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const batch = writeBatch(db);
    let count = 0;

    // Actualizar sucursales
    for (const sucursal of sucursales as any[]) {
        if (duplicados.some(d => d.id === sucursal.clienteId)) {
            console.log(`Actualizando sucursal ${sucursal.nombre} (${sucursal.id}) -> Cliente ${principal.id}`);
            batch.update(doc(db, 'sucursales', sucursal.id), { clienteId: principal.id });
            count++;
        }
    }

    // Eliminar duplicados
    for (const duplicado of duplicados as any[]) {
        console.log(`Eliminando cliente duplicado: ${duplicado.nombre} (${duplicado.id})`);
        batch.delete(doc(db, 'clientes', duplicado.id));
    }

    if (count > 0 || duplicados.length > 0) {
        await batch.commit();
        console.log("Depuración completada exitosamente.");
    } else {
        console.log("Nada que actualizar.");
    }
}

depurarClientes().catch(console.error);
