
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
    authDomain: "h-gestion-testbpt.firebaseapp.com", // Keeping same connection as it manages both? No, let me verify BPT GROUP's project.
    projectId: "h-gestion-testbpt",
    storageBucket: "h-gestion-testbpt.firebasestorage.app",
    messagingSenderId: "385439061540",
    appId: "1:385439061540:web:95c1461abd46400724eab1",
};

// Wait, the user said BPT GROUP. I need to be sure if BPT GROUP is in the same Firebase project or a different one.
// Usually BPT GROUP is the source for TEST BPT.
// Let's list all clients first to be 100% sure of the ID and environment.

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function auditClients() {
    console.log("=== LISTANDO CLIENTES EN h-gestion-testbpt ===");
    const snap = await getDocs(collection(db, 'clientes'));
    snap.forEach(d => {
        console.log(`- ID: ${d.id} | Nombre: ${d.data().nombre}`);
    });

    console.log("\n=== BUSCANDO ALTABRISA EN BPT GROUP ===");
    // ID detectado previamente para BPT GROUP en scripts de siembra: HXIjyDoFvWl00Qs29QPw
    const BPT_GROUP_ID = 'HXIjyDoFvWl00Qs29QPw'; 
    const q = query(collection(db, 'sucursales'), where('clienteId', '==', BPT_GROUP_ID));
    const sSnap = await getDocs(q);
    
    sSnap.forEach(d => {
        if (d.data().nombre.toLowerCase().includes('altabrisa') || d.id === 'BA') {
            console.log(`[!] ENCONTRADA: ID: ${d.id} | Nombre: ${d.data().nombre} | Nomenclatura: ${d.data().nomenclatura}`);
        }
    });

    process.exit(0);
}

auditClients().catch(console.error);
