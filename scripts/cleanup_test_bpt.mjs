/**
 * LIMPIEZA POST-CLONACIÓN — Proyecto TEST_BPT (El clonado)
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';

const config = {
    apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
    authDomain: "h-gestion-testbpt.firebaseapp.com",
    projectId: "h-gestion-testbpt",
};

const app = initializeApp(config);
const db = getFirestore(app);

const CLIENTS_TO_DELETE = [
    "HXIjyDoFvWl00Qs29QPw", // BPT GROUP
    "kWRmv16DNfMUlSF1Yqiv"  // CORPORATIVO NACIONAL
];

const COLLECTIONS = ['sucursales', 'equipos', 'ordenesTrabajo', 'usuarios', 'catalogos', 'preventivoPlan', 'franquicias'];

async function cleanup() {
    console.log(`🧹 LIMPIEZA TOTAL — PROYECTO TEST_BPT`);
    for (const clientId of CLIENTS_TO_DELETE) {
        console.log(`\n>>> Eliminando Cliente: ${clientId}`);
        for (const col of COLLECTIONS) {
            const q = query(collection(db, col), where('clienteId', '==', clientId));
            const snap = await getDocs(q);
            for (const d of snap.docs) await deleteDoc(d.ref);
            if (snap.size > 0) console.log(`   ✅ ${col}: ${snap.size} eliminados`);
        }
        try {
            await deleteDoc(doc(db, 'clientes', clientId));
            console.log(`   ✅ clientes: 1 eliminado`);
        } catch (e) {}
    }
    console.log("\nLimpieza completada.");
    process.exit(0);
}

cleanup();
