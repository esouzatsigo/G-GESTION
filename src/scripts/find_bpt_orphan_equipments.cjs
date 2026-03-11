
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

async function findOrphanEquipments() {
    const q = query(collection(db, 'equipos'), where('clienteId', '==', CLIENTE_ID));
    const snap = await getDocs(q);
    
    console.log(`BPT GROUP has ${snap.size} total equipments.`);
    
    const branchCounts = {};
    snap.forEach(d => {
        const sid = d.data().sucursalId;
        branchCounts[sid] = (branchCounts[sid] || 0) + 1;
    });

    console.log("Distribution by sucursalId:");
    for (const [sid, count] of Object.entries(branchCounts)) {
        const sDoc = await getDocs(query(collection(db, 'sucursales'), where('__name__', '==', sid)));
        const sName = sDoc.empty ? "UNKNOWN/DELETED" : sDoc.docs[0].data().nombre;
        console.log(`- ${sid} (${sName}): ${count} equipments`);
    }

    process.exit(0);
}

findOrphanEquipments().catch(console.error);
