import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";

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

async function replicateGlobalCatalogsToClients() {
    console.log("Iniciando replicación de Catálogos Globales hacia todos los Clientes (Aislamiento Total)...");

    // 1. Fetch Global Catalogs (clienteId == 'ADMIN')
    const catalogosRef = collection(db, 'catalogos');
    const qGlobal = query(catalogosRef, where('clienteId', '==', 'ADMIN'));
    const globalSnap = await getDocs(qGlobal);
    const globalCatalogs = globalSnap.docs.map(doc => doc.data());

    console.log(`Encontrados ${globalCatalogs.length} catálogos globales.`);

    if (globalCatalogs.length === 0) {
        console.log("No hay catálogos globales. Saliendo.");
        return;
    }

    // 2. Fetch all Clientes
    const clientesRef = collection(db, 'clientes');
    const clientesSnap = await getDocs(clientesRef);
    const clientes = clientesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`Encontrados ${clientes.length} clientes reales.`);

    // 3. Replicate for Each Client
    for (const cliente of clientes) {
        console.log(`--------------------------------------------------`);
        console.log(`Procesando Cliente: ${cliente.nombre} (${cliente.id})`);

        for (const cat of globalCatalogs) {
            // Check if it already exists for this client
            const qCheck = query(
                catalogosRef,
                where('clienteId', '==', cliente.id),
                where('categoria', '==', cat.categoria),
                where('nombre', '==', cat.nombre)
            );
            const checkSnap = await getDocs(qCheck);

            if (checkSnap.empty) {
                // Duplicate it
                const newCat = { ...cat, clienteId: cliente.id };
                await addDoc(catalogosRef, newCat);
                console.log(`[+] Creado [${cat.categoria}]: ${cat.nombre}`);
            } else {
                console.log(`[-] Ya existe [${cat.categoria}]: ${cat.nombre}`);
            }
        }
    }

    console.log("¡Replicación exitosa completada para todos los clientes actuales!");
}

replicateGlobalCatalogsToClients().then(() => process.exit(0)).catch(e => {
    console.error("Error crítico:", e);
    process.exit(1);
});
