
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

const CLIENTE_ID = '3de6K2GeasZhN2GIQWXw';

async function auditAltabrisaDuplicates() {
    console.log("=== BUSCANDO DUPLICADOS DE ALTABRISA EN TEST BPT ===");
    const q = query(collection(db, 'sucursales'), where('clienteId', '==', CLIENTE_ID));
    const snap = await getDocs(q);
    
    const altabrisas = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.nombre.toLowerCase().includes('altabrisa') || (s.nomenclatura && s.nomenclatura.includes('BA')));

    console.log(`Encontradas ${altabrisas.length} posibles coincidencias:`);
    altabrisas.forEach(s => {
        console.log(`- ID: ${s.id} | Nombre: ${s.nombre} | Nomenclatura: ${s.nomenclatura || 'N/A'}`);
    });

    process.exit(0);
}

auditAltabrisaDuplicates().catch(console.error);
