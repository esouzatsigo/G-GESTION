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

async function validateStructure() {
    // Franquicias
    const fSnap = await getDocs(collection(db, 'franquicias'));
    const franchises = fSnap.docs.reduce((acc, d) => ({ ...acc, [d.id]: d.data().nombre }), {} as any);

    // Sucursales
    const sSnap = await getDocs(collection(db, 'sucursales'));
    console.log(`--- SUCURSALES (${sSnap.size}) ---`);
    sSnap.docs.forEach(d => {
        const data = d.data();
        console.log(`ID: ${d.id} | Name: ${data.nombre} | Fran: ${franchises[data.franquiciaId] || data.franquiciaId}`);
    });

    // Gerentes
    const uSnap = await getDocs(collection(db, 'usuarios'));
    const gerentes = uSnap.docs.filter(d => d.data().rol === 'ROL_GERENTE' || d.data().rol === 'Gerente');
    console.log(`\n--- GERENTES (${gerentes.length}) ---`);
    gerentes.forEach(g => {
        const d = g.data();
        console.log(`ID: ${g.id} | Name: ${d.nombre} | Sucs: ${d.sucursalesPermitidas}`);
    });

    // Equipos
    const eSnap = await getDocs(collection(db, 'equipos'));
    console.log(`\n--- EQUIPOS (${eSnap.size}) ---`);
    eSnap.docs.slice(0, 5).forEach(e => {
        const d = e.data();
        console.log(`ID: ${e.id} | Name: ${d.nombre} | Suc: ${d.sucursalId}`);
    });
}

validateStructure().then(() => process.exit(0)).catch(console.error);
