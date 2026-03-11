/**
 * CLONACIÓN DE FIRESTORE — Fase 3 de Aislamiento Físico
 * 
 * Copia TODAS las colecciones del proyecto ORIGEN (h-gestion-dev)
 * al proyecto DESTINO (h-gestion-testbpt), preservando los IDs originales.
 * 
 * Ejecutar: node scripts/clone_firestore.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';

// ═══════════════════════════════════════
//  PROYECTO ORIGEN: h-gestion-dev
// ═══════════════════════════════════════
const sourceConfig = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
    storageBucket: "h-gestion-dev.firebasestorage.app",
    messagingSenderId: "198928689880",
    appId: "1:198928689880:web:7f90dcd33e710fcc7505ad",
};

// ═══════════════════════════════════════
//  PROYECTO DESTINO: h-gestion-testbpt
// ═══════════════════════════════════════
const targetConfig = {
    apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
    authDomain: "h-gestion-testbpt.firebaseapp.com",
    projectId: "h-gestion-testbpt",
    storageBucket: "h-gestion-testbpt.firebasestorage.app",
    messagingSenderId: "385439061540",
    appId: "1:385439061540:web:95c1461abd46400724eab1",
    measurementId: "G-4VQGLN5WRB"
};

const sourceApp = initializeApp(sourceConfig, 'source');
const targetApp = initializeApp(targetConfig, 'target');

const sourceDb = getFirestore(sourceApp);
const targetDb = getFirestore(targetApp);

// Todas las colecciones a clonar
const COLLECTIONS = [
    'clientes',
    'franquicias',
    'sucursales',
    'equipos',
    'ordenesTrabajo',
    'usuarios',
    'catalogos',
    'familias',
    'bitacora',
    'config',
    'preventivoPlan',
    'massiveBatchRecords',
    'massiveBatchChanges',
    'notificaciones',
    'entityChanges',
];

async function cloneCollection(colName) {
    const sourceSnap = await getDocs(collection(sourceDb, colName));
    
    if (sourceSnap.empty) {
        console.log(`   ⏭️  ${colName}: vacía — omitida`);
        return 0;
    }

    const docs = sourceSnap.docs;
    let written = 0;

    // Firestore batches soportan max 500 operaciones
    for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(targetDb);
        const chunk = docs.slice(i, i + 400);

        chunk.forEach(srcDoc => {
            const targetRef = doc(targetDb, colName, srcDoc.id);
            batch.set(targetRef, srcDoc.data());
        });

        await batch.commit();
        written += chunk.length;
    }

    console.log(`   ✅ ${colName}: ${written} documentos clonados`);
    return written;
}

async function cloneAll() {
    console.log(`\n📋 CLONACIÓN DE FIRESTORE`);
    console.log(`   Origen:  h-gestion-dev`);
    console.log(`   Destino: h-gestion-testbpt`);
    console.log(`   Fecha:   ${new Date().toLocaleString()}\n`);

    let totalDocs = 0;

    for (const col of COLLECTIONS) {
        try {
            const count = await cloneCollection(col);
            totalDocs += count;
        } catch (err) {
            console.log(`   ❌ ${col}: ERROR — ${err.message}`);
        }
    }

    console.log(`\n   ═══════════════════════════════════`);
    console.log(`   📦 TOTAL: ${totalDocs} documentos clonados`);
    console.log(`   ═══════════════════════════════════\n`);

    // Verificación cruzada
    console.log(`   🔍 VERIFICACIÓN CRUZADA:\n`);
    for (const col of COLLECTIONS) {
        try {
            const srcSnap = await getDocs(collection(sourceDb, col));
            const tgtSnap = await getDocs(collection(targetDb, col));
            const match = srcSnap.size === tgtSnap.size;
            console.log(`   ${match ? '✅' : '❌'} ${col}: Origen=${srcSnap.size} → Destino=${tgtSnap.size}`);
        } catch (err) {
            console.log(`   ⚠️  ${col}: Error en verificación`);
        }
    }

    process.exit(0);
}

cloneAll().catch(err => {
    console.error('❌ Error fatal durante la clonación:', err);
    process.exit(1);
});
