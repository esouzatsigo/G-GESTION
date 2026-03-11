/**
 * VERIFICACIÓN POST-CLONACIÓN
 * Compara conteos entre origen y destino para cada colección.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const sourceApp = initializeApp({
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
    storageBucket: "h-gestion-dev.firebasestorage.app",
    messagingSenderId: "198928689880",
    appId: "1:198928689880:web:7f90dcd33e710fcc7505ad",
}, 'source');

const targetApp = initializeApp({
    apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
    authDomain: "h-gestion-testbpt.firebaseapp.com",
    projectId: "h-gestion-testbpt",
    storageBucket: "h-gestion-testbpt.firebasestorage.app",
    messagingSenderId: "385439061540",
    appId: "1:385439061540:web:95c1461abd46400724eab1",
}, 'target');

const sourceDb = getFirestore(sourceApp);
const targetDb = getFirestore(targetApp);

const COLLECTIONS = [
    'clientes','franquicias','sucursales','equipos','ordenesTrabajo',
    'usuarios','catalogos','familias','bitacora','config',
    'preventivoPlan','massiveBatchRecords','massiveBatchChanges',
    'notificaciones','entityChanges',
];

async function verify() {
    console.log('\n🔍 VERIFICACIÓN POST-CLONACIÓN\n');
    let allMatch = true;

    for (const col of COLLECTIONS) {
        try {
            const src = await getDocs(collection(sourceDb, col));
            const tgt = await getDocs(collection(targetDb, col));
            const ok = src.size === tgt.size;
            if (!ok) allMatch = false;
            console.log(`${ok ? '✅' : '❌'} ${col.padEnd(25)} Origen: ${String(src.size).padStart(4)} → Destino: ${String(tgt.size).padStart(4)}`);
        } catch (err) {
            console.log(`⚠️  ${col.padEnd(25)} Error: ${err.message.substring(0, 60)}`);
        }
    }

    console.log(`\n${allMatch ? '🎉 CLONACIÓN PERFECTA — Todos los conteos coinciden' : '⚠️  Hay discrepancias — revisar errores arriba'}\n`);
    process.exit(0);
}

verify();
