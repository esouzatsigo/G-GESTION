
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

const CLIENTE_ID = '3de6K2GeasZhN2GIQWXw'; // TEST BPT

async function checkTestBPTPlan() {
    const q = query(collection(db, 'planPreventivo2026'), where('clienteId', '==', CLIENTE_ID));
    const snap = await getDocs(q);
    
    console.log(`Checking Altabrisa entries in TEST BPT (Total plan entries: ${snap.size}):`);
    snap.forEach(d => {
        const data = d.data();
        if (data.txtPDF.toLowerCase().includes('altabrisa')) {
            console.log(`- Entry ID: ${d.id} | SucursalID: ${data.sucursalId} | Label: ${data.txtPDF}`);
        }
    });

    process.exit(0);
}

checkTestBPTPlan().catch(console.error);
