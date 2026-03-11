
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc } = require('firebase/firestore');

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

async function findGhost() {
    console.log("=== BUSCANDO EQUIPO CON ID '1' ===");
    const docRef = doc(db, 'equipos', '1');
    const snap = await getDoc(docRef);

    if (snap.exists()) {
        console.log("✅ EQUIPO ENCONTRADO:");
        console.log(JSON.stringify(snap.data(), null, 2));
    } else {
        console.log("❌ El equipo con ID '1' NO existe actualmente.");
    }

    process.exit(0);
}

findGhost().catch(console.error);
