const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where } = require("firebase/firestore");

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

async function validateBranchLocation() {
    console.log("📍 VALIDANDO COORDENADAS SUCURSAL 📍");
    const sucSnap = await getDocs(query(collection(db, 'sucursales'), where('nombre', '==', "Boston's Altabrisa")));
    if (sucSnap.empty) {
        console.log("❌ Sucursal no encontrada.");
    } else {
        const d = sucSnap.docs[0].data();
        console.log(`Sucursal: ${d.nombre}`);
        console.log(`Ubicación: ${JSON.stringify(d.ubicacion)}`);
        console.log(`Dirección: ${d.direccion}`);
    }
    process.exit(0);
}

validateBranchLocation().catch(console.error);
