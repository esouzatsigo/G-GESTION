
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

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

async function checkEq() {
    const id = "CfFtu4PSR2MNCGPqD7LN";
    const d = await getDoc(doc(db, 'equipos', id));
    console.log(`Equipo ${id}:`, JSON.stringify(d.data(), null, 2));
}

checkEq().catch(console.error);
