
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

const CLIENTE_ID = '3de6K2GeasZhN2GIQWXw';

async function auditTestBPTEquipments() {
    const q = query(collection(db, 'equipos'), where('clienteId', '==', CLIENTE_ID));
    const snap = await getDocs(q);
    
    console.log(`TEST BPT has ${snap.size} total equipments.`);
    
    const branchCounts = {};
    for (const d of snap.docs) {
        const sid = d.data().sucursalId;
        branchCounts[sid] = (branchCounts[sid] || 0) + 1;
    }

    console.log("Distribution by sucursalId:");
    for (const [sid, count] of Object.entries(branchCounts)) {
        const sDoc = await getDocs(query(collection(db, 'sucursales'), where('__name__', '==', sid)));
        const sName = sDoc.empty ? `UNKNOWN [${sid}]` : sDoc.docs[0].data().nombre;
        console.log(`- ${sid} (${sName}): ${count} equipments`);
    }

    process.exit(0);
}

auditTestBPTEquipments().catch(console.error);
