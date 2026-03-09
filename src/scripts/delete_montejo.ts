import { initializeApp } from "firebase/app";
import { getFirestore, deleteDoc, doc } from "firebase/firestore";

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

async function run() {
    console.log("Eliminando equipo 3 (Refrigerador de Masas 1 - BM)...");
    await deleteDoc(doc(db, 'equipos', '3'));
    console.log("Eliminando equipo 4 (Refrigerador de Postres 1 - BM)...");
    await deleteDoc(doc(db, 'equipos', '4'));
    console.log("Eliminando sucursal BM (Montejo)...");
    await deleteDoc(doc(db, 'sucursales', 'BM'));
    console.log("HECHO. Montejo y sus 2 equipos eliminados.");
    process.exit(0);
}
run();
