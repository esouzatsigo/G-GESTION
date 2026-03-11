
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

async function listAllBPTGroupSucursales() {
    console.log("=== SUCURSALES EN BPT GROUP (DEV) ===");
    const q = query(collection(db, 'sucursales'), where('clienteId', '==', CLIENTE_ID));
    const snap = await getDocs(q);
    
    snap.forEach(d => {
        console.log(`- ID: ${d.id} | Nombre: ${d.data().nombre} | Nomenclatura: ${d.data().nomenclatura}`);
    });

    process.exit(0);
}

listAllBPTGroupSucursales().catch(console.error);
