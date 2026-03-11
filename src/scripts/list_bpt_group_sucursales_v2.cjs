
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

const CLIENTE_ID = 'HXIjyDoFvWl00Qs29QPw';

async function listAllBPTGroupSucursales() {
    const q = query(collection(db, 'sucursales'), where('clienteId', '==', CLIENTE_ID));
    const snap = await getDocs(q);
    
    const results = snap.docs.map(d => {
        const data = d.data();
        return {
            id: d.id,
            nombre: data.nombre,
            nomenclatura: data.nomenclatura
        };
    });

    console.log(JSON.stringify(results, null, 2));

    process.exit(0);
}

listAllBPTGroupSucursales().catch(console.error);
