
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

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

async function diagnose() {
    console.log("--- Diagnóstico Específico: Sucursal de Equipo ---");

    // 1. Encontrar el equipo
    const eSnap = await getDocs(collection(db, 'equipos'));
    const targetEquipo = eSnap.docs.find(d => d.get('nombre').includes("BA-Freidora (2)"));

    if (!targetEquipo) {
        console.log("No se encontró el equipo 'BA-Freidora (2)'");
        return;
    }

    const eqData = targetEquipo.data();
    console.log(`EQUIPO: ID=${targetEquipo.id}, Nombre=${eqData.nombre}, sucursalId=${eqData.sucursalId}, clienteId=${eqData.clienteId}, franquiciaId=${eqData.franquiciaId}`);

    // 2. Encontrar el cliente
    const cDoc = await getDoc(doc(db, 'clientes', eqData.clienteId));
    if (cDoc.exists()) {
        console.log(`CLIENTE (by ID): ID=${cDoc.id}, Nombre=${cDoc.get('nombre')}`);
    } else {
        console.log(`CLIENTE (by ID): NO EXISTE para ID=${eqData.clienteId}`);
        // Buscar por nombre
        const cSnap = await getDocs(collection(db, 'clientes'));
        const cByName = cSnap.docs.find(d => d.get('nombre') === eqData.clienteId);
        if (cByName) console.log(`CLIENTE (by Name Match): ID=${cByName.id}, Nombre=${cByName.get('nombre')}`);
    }

    // 3. Encontrar la franquicia
    const fDoc = await getDoc(doc(db, 'franquicias', eqData.franquiciaId));
    if (fDoc.exists()) {
        console.log(`FRANQUICIA (by ID): ID=${fDoc.id}, Nombre=${fDoc.get('nombre')}`);
    } else {
        console.log(`FRANQUICIA (by ID): NO EXISTE para ID=${eqData.franquiciaId}`);
    }

    // 4. Encontrar la sucursal
    const sDoc = await getDoc(doc(db, 'sucursales', eqData.sucursalId));
    if (sDoc.exists()) {
        const sData = sDoc.data();
        console.log(`SUCURSAL (by ID): ID=${sDoc.id}, Nombre=${sData.nombre}, clienteId=${sData.clienteId}, franquiciaId=${sData.franquiciaId}`);
    } else {
        console.log(`SUCURSAL (by ID): NO EXISTE para ID=${eqData.sucursalId}`);
    }

    // 5. Listar todas las sucursales para ver qué IDs tienen
    const sSnap = await getDocs(collection(db, 'sucursales'));
    console.log("\nTODAS LAS SUCURSALES (Resumen):");
    sSnap.forEach(d => {
        console.log(` - ID=${d.id} | Nombre=${d.get('nombre')} | CLI=${d.get('clienteId')} | FRA=${d.get('franquiciaId')}`);
    });
}

diagnose().catch(console.error);
