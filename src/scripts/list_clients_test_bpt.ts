import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function listClients() {
    const snap = await getDocs(collection(db, 'clientes'));
    console.log("=== LISTADO DE CLIENTES (PROYECTO: TEST BPT) ===");
    snap.forEach(d => {
        console.log(`[${d.id}] ${d.data().nombre}`);
    });
    process.exit(0);
}
listClients().catch(console.error);
