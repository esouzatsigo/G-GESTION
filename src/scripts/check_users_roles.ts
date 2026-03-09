import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";

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

async function checkUsers() {
    const snap = await getDocs(query(collection(db, 'usuarios'), limit(5)));
    console.log("=== USUARIOS SAMPLE ===");
    snap.docs.forEach(d => {
        const data = d.data();
        console.log(`Nombre: ${data.nombre} | Rol: ${data.rol}`);
    });
}

checkUsers().then(() => process.exit(0)).catch(console.error);
