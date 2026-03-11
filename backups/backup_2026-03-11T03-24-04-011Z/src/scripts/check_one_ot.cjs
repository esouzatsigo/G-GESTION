
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

async function checkOT() {
    const id = "ASiF6oDdH3XJ80Gy5EhK"; // OT 1025
    const d = await getDoc(doc(db, 'ordenesTrabajo', id));
    console.log(`OT ${id}:`, JSON.stringify(d.data(), null, 2));
}

checkOT().catch(console.error);
