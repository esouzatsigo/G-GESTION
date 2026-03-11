
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc, collection, getDocs } = require('firebase/firestore');

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

async function findGhostBranches() {
    console.log("=== BUSCANDO SUCURSALES FANTASMA (ID 'BA' o 'Azbef...') ===");
    
    const idLegacy1 = 'BA';
    const idLegacy2 = 'Azbef4Og1nABbWAQdQvJ';

    const doc1 = await getDoc(doc(db, 'sucursales', idLegacy1));
    const doc2 = await getDoc(doc(db, 'sucursales', idLegacy2));

    if (doc1.exists()) console.log(`✅ ENCONTRADA: ${idLegacy1} - Cliente: ${doc1.data().clienteId}`);
    else console.log(`❌ No existe sucursal con ID: ${idLegacy1}`);

    if (doc2.exists()) console.log(`✅ ENCONTRADA: ${idLegacy2} - Cliente: ${doc2.data().clienteId}`);
    else console.log(`❌ No existe sucursal con ID: ${idLegacy2}`);

    // También buscar en la colección completa por si la nomenclatura es el problema
    const all = await getDocs(collection(db, 'sucursales'));
    const matches = all.docs.filter(d => (d.data().nomenclatura === 'BA' || d.data().nombre.includes('Altabrisa')) && d.id !== 'HocVkOhJBlw3JAulA0Gb');
    
    if (matches.length > 0) {
        console.log("\n⚠️ DUPLICADOS OCULTOS POR NOMBRE/NOMENCLATURA:");
        matches.forEach(m => console.log(`- ID: ${m.id} | Nombre: ${m.data().nombre} | Cliente: ${m.data().clienteId}`));
    } else {
        console.log("\n✨ No se encontraron duplicados ocultos por nombre/nomenclatura.");
    }

    process.exit(0);
}

findGhostBranches().catch(console.error);
