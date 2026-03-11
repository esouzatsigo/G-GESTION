
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function checkBitacoraOT() {
    const otNum = "1025";
    const snap = await getDocs(collection(db, 'bitacora'));
    const entries = snap.docs.filter(d => JSON.stringify(d.data()).includes(otNum));
    console.log(`Entradas encontradas para OT ${otNum}: ${entries.length}`);
    entries.forEach(e => console.log(JSON.stringify(e.data(), null, 2)));
}

checkBitacoraOT().catch(console.error);
