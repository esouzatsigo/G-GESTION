const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
    authDomain: "h-gestion-testbpt.firebaseapp.com",
    projectId: "h-gestion-testbpt",
    storageBucket: "h-gestion-testbpt.firebasestorage.app",
    messagingSenderId: "385439061540",
    appId: "1:385439061540:web:95c1461abd46400724eab1",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkEquipmentFamilies() {
    const CLIENTE_ID = '3de6K2GeasZhN2GIQWXw';
    const SUCURSAL_ID = 'HuwoZsAHef5kCZwCFirU'; // Altabrisa TEST BPT
    
    // Traer todos los equipos de altabrisa
    const qEq = query(collection(db, 'equipos'), where('sucursalId', '==', SUCURSAL_ID));
    const snapEq = await getDocs(qEq);
    
    console.log(`Equipos en Altabrisa TEST BPT: ${snapEq.size}`);
    
    const countByFamily = {};
    snapEq.forEach(d => {
        const eq = d.data();
        const fId = eq.familiaId || 'SIN_FAMILIA';
        countByFamily[fId] = (countByFamily[fId] || 0) + 1;
    });
    
    console.log("Distribución de familiaId en los equipos:");
    console.log(countByFamily);

    // Traer familias y catalogos
    const qFam = query(collection(db, 'familias'));
    const snapFam = await getDocs(qFam);
    console.log("\nFamilias Standard:");
    snapFam.forEach(d => {
        if (countByFamily[d.id]) {
           console.log(`- ${d.id} : ${d.data().nombre} (COINCIDE!)`);
        } else {
           // console.log(`- ${d.id} : ${d.data().nombre}`);
        }
    });

    const qCat = query(collection(db, 'catalogos'), where('clienteId', '==', CLIENTE_ID), where('categoria', '==', 'Familia'));
    const snapCat = await getDocs(qCat);
    console.log("\nCatálogos Legacy:");
    snapCat.forEach(d => {
        if (countByFamily[d.id]) {
           console.log(`- ${d.id} : ${d.data().nombre} (COINCIDE!)`);
        }
    });

    process.exit(0);
}

checkEquipmentFamilies().catch(console.error);
