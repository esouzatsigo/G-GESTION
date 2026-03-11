
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, query, where, writeBatch } from "firebase/firestore";

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

async function migrateFamiliaIds() {
    console.log("=== MIGRACIÓN ESTRUCTURAL: FASE 7 (INTERNAL IDs) ===\n");

    // 1. Cargar Catálogos y Familias para mapeo
    console.log("Cargando mapas de referencia...");
    const catsSnap = await getDocs(query(collection(db, 'catalogos'), where('categoria', '==', 'Familia')));
    const famsSnap = await getDocs(collection(db, 'familias'));
    
    // Mapa: clientId -> nomenclature/name -> docId
    const masterMap = {};

    function addToMap(data, id) {
        const cId = data.clienteId;
        if (!masterMap[cId]) masterMap[cId] = {};
        
        // Priorizar nomenclatura, luego nombre
        if (data.nomenclatura) masterMap[cId][data.nomenclatura] = id;
        if (data.nombre) masterMap[cId][data.nombre] = id;
    }

    catsSnap.forEach(d => addToMap(d.data(), d.id));
    famsSnap.forEach(d => addToMap(d.data(), d.id));

    console.log(` - Mapas creados para ${Object.keys(masterMap).length} clientes.`);

    // 2. Procesar Equipos
    console.log("\nProcesando equipos...");
    const eqsSnap = await getDocs(collection(db, 'equipos'));
    console.log(` - Total de equipos encontrados: ${eqsSnap.size}`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;
    let batch = writeBatch(db);
    let batchCount = 0;

    for (const d of eqsSnap.docs) {
        const eq = d.data();
        const clientMap = masterMap[eq.clienteId];
        
        if (!clientMap) {
            console.log(`[!] Cliente ${eq.clienteId} no tiene mapa de familias. Saltando equipo: ${eq.nombre}`);
            skipped++;
            continue;
        }

        const familiaId = clientMap[eq.familia];

        if (familiaId) {
            batch.update(doc(db, 'equipos', d.id), { familiaId: familiaId });
            updated++;
            batchCount++;
            
            // Commit por bloques de 400 para evitar límites de Firestore
            if (batchCount >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
                console.log(` - Progreso: ${updated} equipos actualizados...`);
            }
        } else {
            console.log(`[?] Familia "${eq.familia}" no encontrada en catálogo para cliente ${eq.clienteId}. Equipo: ${eq.nombre}`);
            skipped++;
        }
    }

    if (batchCount > 0) {
        await batch.commit();
    }

    console.log(`\n=== MIGRACIÓN COMPLETADA ===`);
    console.log(` - Equipos actualizados con familiaId: ${updated}`);
    console.log(` - Equipos saltados: ${skipped}`);
    console.log(` - Total final: ${updated + skipped}`);
}

migrateFamiliaIds().catch(console.error);
