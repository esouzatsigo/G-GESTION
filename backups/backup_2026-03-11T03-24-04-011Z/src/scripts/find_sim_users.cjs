const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

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

async function findUsers() {
    console.log("=== BUSCANDO USUARIOS PARA SIMULACIÓN ===");
    const snap = await getDocs(collection(db, 'usuarios'));
    const matches = [];

    snap.forEach(doc => {
        const u = doc.data();
        // Buscamos usuarios relacionados con BPT o Corporativo
        if (u.clienteId === 'BPT' || (u.nombre && u.nombre.includes('Boston')) || (u.nombre && u.nombre.includes('Altabrisa')) || u.email.includes('bpt')) {
            matches.push({ id: doc.id, nombre: u.nombre, email: u.email, rol: u.rol, clienteId: u.clienteId });
        }
    });

    console.log(JSON.stringify(matches, null, 2));
    process.exit(0);
}

findUsers().catch(console.error);
