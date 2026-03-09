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

async function findTechnicalUsers() {
    console.log("=== BUSCANDO TÉCNICOS ESPECIALISTAS ===");
    const snap = await getDocs(collection(db, 'usuarios'));
    const specialists = [];

    snap.forEach(doc => {
        const u = doc.data();
        if (u.rol === 'ROL_TECNICO_EXTERNO' || u.rol === 'TecnicoExterno' || (u.especialidad && u.especialidad.includes('COCINA')) || (u.especialidad && u.especialidad.includes('COCCION'))) {
            specialists.push({ id: doc.id, nombre: u.nombre, email: u.email, rol: u.rol, especialidad: u.especialidad });
        }
    });

    console.log(JSON.stringify(specialists, null, 2));
    process.exit(0);
}

findTechnicalUsers().catch(console.error);
