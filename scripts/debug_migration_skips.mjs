
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

async function debugSkips() {
    const clientId = 'kWRmv16DNfMUlSF1Yqiv';
    console.log(`--- Análisis de Skips para Cliente: ${clientId} ---`);

    const catsSnap = await getDocs(query(collection(db, 'catalogos'), where('clienteId', '==', clientId), where('categoria', '==', 'Familia')));
    const famsSnap = await getDocs(query(collection(db, 'familias'), where('clienteId', '==', clientId)));
    
    console.log("Catálogos de Familia encontrados:");
    catsSnap.forEach(d => console.log(` - ID: ${d.id} | Nomen: ${d.data().nomenclatura} | Nombre: ${d.data().nombre}`));
    
    console.log("\nFamilias encontradas:");
    famsSnap.forEach(d => console.log(` - ID: ${d.id} | Nomen: ${d.data().nomenclatura} | Nombre: ${d.data().nombre}`));

    const eqsSnap = await getDocs(query(collection(db, 'equipos'), where('clienteId', '==', clientId)));
    const uniqueFamiliesInEquipos = new Set();
    eqsSnap.forEach(d => uniqueFamiliesInEquipos.add(d.data().familia));

    console.log("\nFamilias de texto presentes en los EQUIPOS:");
    uniqueFamiliesInEquipos.forEach(f => console.log(` - "${f}"`));
}

debugSkips().catch(console.error);
