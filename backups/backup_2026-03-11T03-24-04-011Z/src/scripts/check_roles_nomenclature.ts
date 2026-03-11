import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function checkRoles() {
    const snap = await getDocs(collection(db, 'catalogos'));
    console.log("=== CATALOGO ROLES ===");
    snap.docs.filter(d => d.data().categoria === 'Rol').forEach(d => {
        const data = d.data();
        console.log(`Nomenclatura: ${data.nomenclatura} | Nombre: ${data.nombre}`);
    });
}

checkRoles().then(() => process.exit(0)).catch(console.error);
