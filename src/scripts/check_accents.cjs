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

async function checkAccents() {
    const qFam = query(collection(db, 'familias'));
    const snapFam = await getDocs(qFam);
    console.log("=== FAMILIAS STANDARD ===");
    snapFam.forEach(d => console.log(`[${d.id}] ${d.data().nombre || d.data().nomenclatura}`));

    const qCat = query(collection(db, 'catalogos'), where('categoria', '==', 'Familia'), where('clienteId', '==', '3de6K2GeasZhN2GIQWXw'));
    const snapCat = await getDocs(qCat);
    console.log("\n=== CATALOGOS LEGACY ===");
    snapCat.forEach(d => console.log(`[${d.id}] ${d.data().nombre || d.data().nomenclatura}`));

    process.exit(0);
}
checkAccents().catch(console.error);
