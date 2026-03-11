
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

// Ayudante de normalización para match difuso
function normalize(text) {
    if (!text) return "";
    return text.toString().toUpperCase()
        .replace(/^ESP_/, "") // Quitar prefijo ESP_
        .replace(/_/g, " ")   // Cambiar guiones bajos por espacios
        .replace(/EQUIPOS$/, "") // Quitar sufijo EQUIPOS
        .replace(/ACONDICIONADOS$/, "") 
        .replace(/ELECTRICOS$/, "")
        .replace(/SISTEMAS /, "")
        .trim();
}

async function migrateFamiliaIdsRobust() {
    console.log("=== MIGRACIÓN ROBUSTA: FASE 7 (INTERNAL IDs) ===\n");

    const catsSnap = await getDocs(query(collection(db, 'catalogos'), where('categoria', '==', 'Familia')));
    const famsSnap = await getDocs(collection(db, 'familias'));
    
    const masterMap = {};

    function addToMap(data, id) {
        const cId = data.clienteId;
        if (!masterMap[cId]) masterMap[cId] = {};
        
        if (data.nomenclatura) {
            masterMap[cId][data.nomenclatura.toUpperCase()] = id;
            masterMap[cId][normalize(data.nomenclatura)] = id;
        }
        if (data.nombre) {
            masterMap[cId][data.nombre.toUpperCase()] = id;
            masterMap[cId][normalize(data.nombre)] = id;
        }
    }

    catsSnap.forEach(d => addToMap(d.data(), d.id));
    famsSnap.forEach(d => addToMap(d.data(), d.id));

    const eqsSnap = await getDocs(collection(db, 'equipos'));
    let updated = 0;
    let skipped = 0;
    let batch = writeBatch(db);
    let batchCount = 0;

    for (const d of eqsSnap.docs) {
        const eq = d.data();
        if (eq.familiaId) continue; // Ya tiene ID, saltar.

        const clientMap = masterMap[eq.clienteId];
        if (!clientMap) {
            skipped++;
            continue;
        }

        // Probar match directo, luego normalizado
        const familiaId = clientMap[eq.familia.toUpperCase()] || clientMap[normalize(eq.familia)];

        if (familiaId) {
            batch.update(doc(db, 'equipos', d.id), { familiaId: familiaId });
            updated++;
            batchCount++;
            
            if (batchCount >= 400) {
                await batch.commit();
                batch = writeBatch(db);
                batchCount = 0;
            }
        } else {
            console.log(`[?] Sin match: Cliente ${eq.clienteId} | Familia: "${eq.familia}" | Normalizada: "${normalize(eq.familia)}"`);
            skipped++;
        }
    }

    if (batchCount > 0) await batch.commit();

    console.log(`\n=== MIGRACIÓN ROBUSTA COMPLETADA ===`);
    console.log(` - Nuevos equipos actualizados: ${updated}`);
    console.log(` - Equipos que siguen sin ID: ${skipped}`);
}

migrateFamiliaIdsRobust().catch(console.error);
