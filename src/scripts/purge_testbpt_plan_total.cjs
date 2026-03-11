
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where, deleteDoc, doc } = require('firebase/firestore');

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

async function purgeTestBptPlan() {
    console.log("=== REVISANDO PLAN PREVENTIVO TEST BPT ===");
    const q = query(collection(db, 'planPreventivo2026'), where('clienteId', '==', CLIENTE_ID));
    const snap = await getDocs(q);
    
    console.log(`Encontradas ${snap.size} entradas en el plan.`);
    
    // Purge ALL of them so they re-generate cleanly with Smart Mapper without any hardcodes at all
    let badCount = 0;
    for (const d of snap.docs) {
        await deleteDoc(doc(db, 'planPreventivo2026', d.id));
        badCount++;
    }

    if (badCount > 0) {
        console.log(`✅ SE PURGARON ${badCount} ENTRADAS.`);
        console.log("La próxima vez que un usuario de TEST BPT entre, el Smart Mapper re-generará el plan con IDs correctos según la sucursal actual.");
    } else {
        console.log("✨ El plan ya está vacío.");
    }

    process.exit(0);
}

purgeTestBptPlan().catch(console.error);
