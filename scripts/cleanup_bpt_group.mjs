/**
 * LIMPIEZA POST-CLONACIÓN — Proyecto BPT_GROUP (El original)
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';

const config = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
};

const app = initializeApp(config);
const db = getFirestore(app);

const CLIENTS_TO_DELETE = [
    "3de6K2GeasZhN2GIQWXw", // TEST BPT
    "kWRmv16DNfMUlSF1Yqiv"  // CORPORATIVO NACIONAL
];

const COLLECTIONS = ['sucursales', 'equipos', 'ordenesTrabajo', 'usuarios', 'catalogos', 'preventivoPlan', 'franquicias'];

async function cleanup() {
    console.log(`🧹 LIMPIEZA TOTAL — PROYECTO BPT_GROUP`);
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
