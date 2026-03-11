import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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

async function findEquiposCorp() {
    const q = query(collection(db, 'equipos'), where('clienteId', '==', 'kWRmv16DNfMUlSF1Yqiv'));
    const snap = await getDocs(q);

    console.log(`Equipos en Corporativo Nacional: ${snap.size}`);
    snap.docs.forEach(d => {
        const data = d.data();
        console.log(`ID: ${d.id} | Name: ${data.nombre} | Suc: ${data.sucursalId} | Fam: ${data.familia}`);
    });
}

findEquiposCorp().then(() => process.exit(0)).catch(console.error);
