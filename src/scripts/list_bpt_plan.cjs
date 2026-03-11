
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

async function listBPTPlan() {
    const q = query(collection(db, 'planPreventivo2026'), where('clienteId', '==', CLIENTE_ID));
    const snap = await getDocs(q);
    
    console.log(`Plan BPT GROUP has ${snap.size} entries:`);
    snap.forEach(d => {
        const data = d.data();
        console.log(`- ID: ${d.id} | SucursalID: ${data.sucursalId} | Label: ${data.txtPDF}`);
    });

    process.exit(0);
}

listBPTPlan().catch(console.error);
