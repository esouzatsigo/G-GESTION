
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

const CLIENTE_ID = 'HXIjyDoFvWl00Qs29QPw';

async function auditBPTEquipments() {
    const sQuery = query(collection(db, 'sucursales'), where('clienteId', '==', CLIENTE_ID));
    const sSnap = await getDocs(sQuery);
    
    console.log("=== AUDITORIA DE EQUIPOS POR SUCURSAL (BPT GROUP) ===");
    for (const sDoc of sSnap.docs) {
        const s = sDoc.data();
        const eQuery = query(collection(db, 'equipos'), where('sucursalId', '==', sDoc.id));
        const eSnap = await getDocs(eQuery);
        console.log(`Sucursal: ${s.nombre} (ID: ${sDoc.id}) | Equipos: ${eSnap.size}`);
    }

    // Buscar equipos con sucursalId 'BA' o 'HocVk...' (IDs de TEST BPT que no deberían estar aquí)
    const ghostIds = ['BA', 'HocVkOhJBlw3JAulA0Gb', 'Azbef4Og1nABbWAQdQvJ', 'fmIQBqzkElTEY6nnj0c0'];
    for (const ghostId of ghostIds) {
        const geQuery = query(collection(db, 'equipos'), where('sucursalId', '==', ghostId));
        const geSnap = await getDocs(geQuery);
        if (geSnap.size > 0) {
            console.log(`⚠️ ALERTA: ${geSnap.size} equipos encontrados con ID fantasma: ${ghostId}`);
        }
    }

    process.exit(0);
}

auditBPTEquipments().catch(console.error);
