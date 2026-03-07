
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';

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

async function revertSimulation() {
    console.log("🧹 Iniciando reversión total de datos de simulación (IDs con prefijo SIM-)...");

    const colecciones = ['clientes', 'sucursales', 'usuarios', 'equipos', 'workOrders', 'planPreventivo2026', 'massiveBatchRecords'];
    let totalEliminados = 0;

    for (const colName of colecciones) {
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);
        const batch = writeBatch(db);
        let count = 0;

        snapshot.forEach((d) => {
            const data = d.data();
            const stringified = JSON.stringify(data).toUpperCase();
            const isSimTarget = d.id.startsWith('SIM-') ||
                stringified.includes('BPT - CORPORATIVO NACIONAL') ||
                stringified.includes('BOSTONS CORPORATIVO') ||
                stringified.includes('SIMULACIÓN');

            if (isSimTarget) {
                batch.delete(doc(db, colName, d.id));
                count++;
            }
        });

        if (count > 0) {
            try {
                await batch.commit();
                console.log(`✅ Eliminados ${count} documentos de '${colName}'`);
                totalEliminados += count;
            } catch (e) {
                console.error(`❌ Error en batch de '${colName}':`, e);
            }
        }
    }

    console.log(`\n✨ Reversión completada. Se eliminaron ${totalEliminados} registros de prueba.`);
}

revertSimulation().catch(console.error);
