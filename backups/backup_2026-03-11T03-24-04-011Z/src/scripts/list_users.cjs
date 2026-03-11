
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

async function listUsers() {
    const snap = await getDocs(collection(db, 'usuarios'));
    snap.docs.forEach(d => {
        const u = d.data();
        console.log(`ID: ${d.id} | Nombre: ${u.nombre} | Rol: ${u.rol}`);
    });
}
listUsers().catch(console.error);
