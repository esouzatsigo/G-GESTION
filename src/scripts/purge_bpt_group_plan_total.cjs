
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where, deleteDoc, doc } = require('firebase/firestore');

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

const CLIENTE_ID = 'HXIjyDoFvWl00Qs29QPw'; // BPT GROUP

async function purgeBPTPlan() {
    console.log("🧨 INICIANDO PURGA DE PLAN PREVENTIVO BPT GROUP 🧨");
    const q = query(collection(db, 'planPreventivo2026'), where('clienteId', '==', CLIENTE_ID));
    const snap = await getDocs(q);
    
    console.log(`Borrando ${snap.size} entradas...`);
    
    for (const d of snap.docs) {
        await deleteDoc(doc(db, 'planPreventivo2026', d.id));
    }

    console.log("✅ PURGA COMPLETADA. El plan será regenerado por el Smart Mapper al entrar un usuario.");
    process.exit(0);
}

purgeBPTPlan().catch(console.error);
