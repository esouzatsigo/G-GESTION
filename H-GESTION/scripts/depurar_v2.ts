import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
    storageBucket: "h-gestion-dev.firebasestorage.app",
    messagingSenderId: "198928689880",
    appId: "1:198928689880:web:7f90dcd33e710fcc7505ad",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function depurar() {
    console.log("Iniciando depuración v2...");
    const snapClientes = await getDocs(collection(db, 'clientes'));
    const bptClientes = snapClientes.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.nombre && c.nombre.toUpperCase().includes('BPT'));

    if (bptClientes.length <= 1) {
        console.log("No hay duplicados de BPT detectados.");
        return;
    }

    console.log(`Detectados ${bptClientes.length} registros BPT.`);
    const principal = bptClientes[0];
    const duplicados = bptClientes.slice(1);

    const snapSucursales = await getDocs(collection(db, 'sucursales'));
    const batch = writeBatch(db);
    let upCount = 0;

    snapSucursales.docs.forEach(sDoc => {
        const sData = sDoc.data();
        if (duplicados.some(d => d.id === sData.clienteId)) {
            console.log(`Moviendo sucursal ${sData.nombre} al cliente ${principal.id}`);
            batch.update(doc(db, 'sucursales', sDoc.id), { clienteId: principal.id });
            upCount++;
        }
    });

    duplicados.forEach(d => {
        console.log(`Eliminando duplicado ${d.id} (${d.nombre})`);
        batch.delete(doc(db, 'clientes', d.id));
    });

    await batch.commit();
    console.log(`PROCESO COMPLETADO: ${upCount} sucursales reasignadas.`);
}

depurar().catch(console.error);
