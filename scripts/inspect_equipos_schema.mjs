
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

async function inspectEquiposSchema() {
    console.log("--- INSPECCIÓN DE ESQUEMA DE EQUIPOS ---");
    
    const eqsSnap = await getDocs(query(collection(db, 'equipos'), limit(20)));
    const allKeys = new Set();
    
    eqsSnap.forEach(d => {
        Object.keys(d.data()).forEach(key => allKeys.add(key));
    });

    console.log("\nCampos detectados en la colección 'equipos':");
    allKeys.forEach(key => console.log(` - ${key}`));

    console.log("\nMuestra de datos (primeros 3 equipos):");
    eqsSnap.docs.slice(0, 3).forEach(d => {
        console.log(`\nID: ${d.id}`);
        console.log(JSON.stringify(d.data(), null, 2));
    });
}

inspectEquiposSchema().catch(console.error);
