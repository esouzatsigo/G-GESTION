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

async function findCoordinadores() {
    console.log("=== BUSCANDO COORDINADORES ===");

    const uSnap = await getDocs(collection(db, 'usuarios'));
    const coords = uSnap.docs.filter(d => {
        const rol = d.data().rol;
        return rol === 'ROL_COORDINADOR_CN' || rol === 'Coordinador' || rol === 'Coordinador CN';
    });

    coords.forEach(c => {
        const d = c.data();
        console.log(`ID: ${c.id} | Name: ${d.nombre} | Rol: ${d.rol} | Cliente: ${d.clienteId}`);
    });
}

findCoordinadores().then(() => process.exit(0)).catch(console.error);
