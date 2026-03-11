
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where, deleteDoc, doc } = require('firebase/firestore');

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

const CLIENTE_ID = 'HXIjyDoFvWl00Qs29QPw';

async function purgeBadBPTPlan() {
    console.log("=== REVISANDO PLAN PREVENTIVO BPT GROUP ===");
    const q = query(collection(db, 'planPreventivo2026'), where('clienteId', '==', CLIENTE_ID));
    const snap = await getDocs(q);
    
    console.log(`Encontradas ${snap.size} entradas en el plan.`);
    
    // Si hay entradas, verificar si tienen IDs que NO pertenecen a BPT GROUP
    // Como acabo de listar las sucursales reales de BPT GROUP, sé que Altabrisa debe ser mBGfKcTdcjsHeAX8X7Hz
    // Si tiene 'HocVk...' o 'HuwoZs...', están contaminadas.

    let badCount = 0;
    for (const d of snap.docs) {
        const data = d.data();
        if (data.sucursalId === 'HuwoZsAHef5kCZwCFirU' || data.sucursalId === 'HocVkOhJBlw3JAulA0Gb' || data.sucursalId === 'BA') {
            // console.log(`[!] Detectada entrada contaminada: ${d.id} -> Sucursal: ${data.sucursalId}`);
            await deleteDoc(doc(db, 'planPreventivo2026', d.id));
            badCount++;
        }
    }

    if (badCount > 0) {
        console.log(`✅ SE PURGARON ${badCount} ENTRADAS CONTAMINADAS.`);
        console.log("La próxima vez que un usuario de BPT GROUP entre, el Smart Mapper re-generará el plan con IDs correctos.");
    } else {
        console.log("✨ El plan parece estar limpio o vacío.");
    }

    process.exit(0);
}

purgeBadBPTPlan().catch(console.error);
