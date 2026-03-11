
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

async function checkGhostEquipments() {
    console.log("=== BUSCANDO EQUIPOS FANTASMA EN BPT GROUP (DEV) ===");
    
    // 1. Equipos con ID literal 'BA'
    const q1 = query(collection(db, 'equipos'), where('sucursalId', '==', 'BA'));
    const s1 = await getDocs(q1);
    console.log(`Equipos con sucursalId 'BA': ${s1.size}`);
    
    // 2. Equipos con la sucursal "vulnerable" fmIQBqzkElTEY6nnj0c0
    const q2 = query(collection(db, 'equipos'), where('sucursalId', '==', 'fmIQBqzkElTEY6nnj0c0'));
    const s2 = await getDocs(q2);
    console.log(`Equipos con sucursalId 'fmIQBqzkElTEY6nnj0c0' (Altabrisa): ${s2.size}`);

    process.exit(0);
}

checkGhostEquipments().catch(console.error);
