const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where, updateDoc, doc } = require('firebase/firestore');

const devConfig = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
    storageBucket: "h-gestion-dev.firebasestorage.app",
    messagingSenderId: "198928689880",
    appId: "1:198928689880:web:7f90dcd33e710fcc7505ad",
};

const testConfig = {
    apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
    authDomain: "h-gestion-testbpt.firebaseapp.com",
    projectId: "h-gestion-testbpt",
    storageBucket: "h-gestion-testbpt.firebasestorage.app",
    messagingSenderId: "385439061540",
    appId: "1:385439061540:web:95c1461abd46400724eab1",
};

// IDs Master para cada familia (Basados en auditoría anterior)
// Elegimos uno como "Oficial" para cada nombre
const OFFICIAL_FAMILY_MAP = {
    'Cocina': 'lN4wL4MwLTjKdOJjKall',
    'Refrigeracion': 'CoR8fRcqW7xxmIY5AQ88',
    'Aires': 'Cz5CxVo7pvNcfMA0ogYp',
    'Coccion': 'ZUkIueLrrnQ9R1WxIBML',
    'Agua': 'hiHr50ddB0dw1hUcqLM9',
    'Generadores': 'mZpKIME0E1H89MvERoIy',
    'Restaurante': 'nFVXsxiMTNrhkjRPT5hR',
    'Local': 'j8St8MzSTJ2bmLINIMtH' // Agua/Local
};

async function consolidate(config, envName) {
    console.log(`\n--- CONSOLIDANDO FAMILIAS EN ${envName} ---`);
    const app = initializeApp(config, envName);
    const db = getFirestore(app);
    
    // 1. Obtener todas las familias para mapear IDs duplicados al nombre
    const snapFam = await getDocs(collection(db, 'familias'));
    const idToOfficial = {};
    
    snapFam.forEach(d => {
        const fam = d.data();
        const nombre = (fam.nombre || fam.nomenclatura || '').trim();
        const officialId = OFFICIAL_FAMILY_MAP[nombre];
        
        if (officialId && d.id !== officialId) {
            idToOfficial[d.id] = officialId;
        }
    });

    console.log(`Detectados ${Object.keys(idToOfficial).length} IDs de familias duplicados que deben migrar.`);

    // 2. Actualizar EQUIPOS
    const snapEq = await getDocs(collection(db, 'equipos'));
    let fixed = 0;
    
    for (const deq of snapEq.docs) {
        const eq = deq.data();
        const currentFamId = eq.familiaId;
        const targetId = idToOfficial[currentFamId];
        
        if (targetId) {
            // console.log(`   [🔧] Actualizando equipo ${eq.nombre} (${deq.id}): ${currentFamId} -> ${targetId}`);
            await updateDoc(doc(db, 'equipos', deq.id), {
                familiaId: targetId
            });
            fixed++;
        }
    }

    console.log(`✅ ${envName}: ${fixed} equipos actualizados al ID de familia oficial.`);
}

async function run() {
    await consolidate(devConfig, "BPT_GROUP_DEV");
    await consolidate(testConfig, "TEST_BPT");
    console.log("\n✨ Saneamiento de catálogos completado.");
    process.exit(0);
}

run().catch(console.error);
