
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where, doc, getDoc } = require('firebase/firestore');

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

async function auditBPTGroup() {
    console.log("=== BUSCANDO DUPLICADOS EN BPT GROUP (PROYECTO DEV) ===");
    
    // 1. Obtener el cliente BPT GROUP
    const qCliente = query(collection(db, 'clientes'), where('nombre', '==', 'BPT GROUP'));
    const cSnap = await getDocs(qCliente);
    
    if (cSnap.empty) {
        console.error("❌ No se encontró el cliente BPT GROUP");
        process.exit(1);
    }
    const clienteId = cSnap.docs[0].id;
    console.log(`✅ Cliente BPT GROUP ID: ${clienteId}`);

    // 2. Buscar sucursales Altabrisa o con ID legacy
    const qSuc = query(collection(db, 'sucursales'), where('clienteId', '==', clienteId));
    const sSnap = await getDocs(qSuc);
    
    console.log("\nSucurles encontradas para BPT GROUP:");
    const altabrisas = [];
    sSnap.forEach(d => {
        const data = d.data();
        if (d.id === 'BA' || data.nombre.toLowerCase().includes('altabrisa') || (data.nomenclatura && data.nomenclatura.includes('BA'))) {
            altabrisas.push({ id: d.id, ...data });
            console.log(`[!] POSIBLE CONTAMINADA: ID: ${d.id} | Nombre: ${data.nombre} | Nomenclatura: ${data.nomenclatura || 'N/A'}`);
        } else {
            // console.log(`- ID: ${d.id} | Nombre: ${data.nombre}`);
        }
    });

    // 3. Verificar si existe el ID legacy 'BA' explícitamente
    const baDoc = await getDoc(doc(db, 'sucursales', 'BA'));
    if (baDoc.exists()) {
        console.log("\n⚠️ ALERTA: La sucursal con ID literal 'BA' EXISTE.");
    }

    process.exit(0);
}

auditBPTGroup().catch(console.error);
