import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection, doc, updateDoc } from "firebase/firestore";

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

const TARGET_ID = '3de6K2GeasZhN2GIQWXw';

async function migrateGhosts() {
    const collections = ['ordenesTrabajo', 'equipos', 'sucursales', 'usuarios', 'franquicias', 'bitacora'];
    for (const col of collections) {
        try {
            const snap = await getDocs(collection(db, col));
            let fixed = 0;
            const updates = [];
            snap.forEach(d => {
                const data = d.data();
                if (data.clienteId === 'BPT' || data.clienteId === 'bpt') {
                    console.log(`[${col}] Migrating ${d.id}`);
                    updates.push(updateDoc(doc(db, col, d.id), { clienteId: TARGET_ID }));
                    fixed++;
                }
            });
            await Promise.all(updates);
            console.log(`Migrated ${fixed} documents in ${col}`);
        } catch (e) {
            console.error(`Error in ${col}:`, e);
        }
    }
}

migrateGhosts().catch(console.error);
