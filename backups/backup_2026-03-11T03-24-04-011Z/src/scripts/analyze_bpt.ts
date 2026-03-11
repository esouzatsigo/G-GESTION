import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection, query, where } from "firebase/firestore";

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

const BPT_ID = '3de6K2GeasZhN2GIQWXw';

async function analyzeBPT() {
    try {
        console.log("--- ANALIZANDO TEST BPT ---");

        const sucursales = await getDocs(query(collection(db, 'sucursales'), where('clienteId', '==', BPT_ID)));
        console.log(`\nSucursales BPT: ${sucursales.size}`);
        sucursales.forEach(s => console.log(`  - ${s.data().nombre} (${s.data().ciudad})`));

        const equipos = await getDocs(query(collection(db, 'equipos'), where('clienteId', '==', BPT_ID)));
        console.log(`\nEquipos BPT: ${equipos.size}`);
        equipos.forEach(e => console.log(`  - ${e.data().nombre} [Familia: ${e.data().familia}]`));

    } catch (error) {
        console.error("Error analizando datos:", error);
    }
}

analyzeBPT();
