import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

// CONFIGURACIÓN EXPLÍCITA DE BPT GROUP (DEV)
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

async function audit() {
    console.log("=== AUDITORÍA DE SUCURSALES (PROYECTO: BPT GROUP / DEV) ===");
    
    // 1. Checar específicamente ID 'BA'
    const baDoc = await getDoc(doc(db, 'sucursales', 'BA'));
    if (baDoc.exists()) {
        console.log("⚠️  ¡LA SUCURSAL 'BA' EXISTE EN DEV!");
        console.log("Data:", JSON.stringify(baDoc.data(), null, 2));
    } else {
        console.log("✅ La sucursal 'BA' NO existe en DEV.");
    }

    // 2. Buscar Equipos con sucursalId 'BA' en DEV
    console.log("\n--- Equipos con sucursalId 'BA' en DEV ---");
    const eqQ = query(collection(db, 'equipos'), where('sucursalId', '==', 'BA'));
    const eqSnap = await getDocs(eqQ);
    console.log(`Total encontrados: ${eqSnap.size}`);

    process.exit(0);
}

audit().catch(console.error);
