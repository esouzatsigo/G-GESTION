import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
    authDomain: "h-gestion-testbpt.firebaseapp.com",
    projectId: "h-gestion-testbpt",
    storageBucket: "h-gestion-testbpt.firebasestorage.app",
    messagingSenderId: "385439061540",
    appId: "1:385439061540:web:95c1461abd46400724eab1",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function audit() {
    console.log("=== AUDITORÍA DE SUCURSALES (PROYECTO: TEST BPT) ===");
    const targetClienteId = "3de6K2GeasZhN2GIQWXw"; // TEST BPT

    // 1. Checar específicamente ID 'BA'
    const baDoc = await getDoc(doc(db, 'sucursales', 'BA'));
    if (baDoc.exists()) {
        console.log("⚠️  ¡LA SUCURSAL 'BA' EXISTE!");
        console.log("Data:", JSON.stringify(baDoc.data(), null, 2));
    } else {
        console.log("✅ La sucursal 'BA' NO existe como documento físico.");
    }

    // 2. Listar todas las sucursales del cliente TEST BPT
    console.log("\n--- Listado de Sucursales en TEST BPT ---");
    const qS = query(collection(db, 'sucursales'), where('clienteId', '==', targetClienteId));
    const snapS = await getDocs(qS);
    
    snapS.forEach(d => {
        const data = d.data();
        console.log(`[${d.id}] ${data.nombre} | Nomenclatura: ${data.nomenclatura || 'N/A'}`);
    });

    // 3. Buscar Equipos con sucursalId 'BA'
    console.log("\n--- Equipos con sucursalId 'BA' ---");
    const eqQ = query(collection(db, 'equipos'), where('sucursalId', '==', 'BA'));
    const eqSnap = await getDocs(eqQ);
    console.log(`Total encontrados: ${eqSnap.size}`);
    eqSnap.forEach(d => {
        const data = d.data();
        console.log(`- ${d.id}: ${data.nombre} (Cliente: ${data.clienteId})`);
    });

    process.exit(0);
}

audit().catch(console.error);
