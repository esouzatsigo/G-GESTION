import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection } from "firebase/firestore";

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

async function checkOTs() {
    try {
        const otsSnap = await getDocs(collection(db, 'ordenesTrabajo'));
        let correctivas = 0;
        let preventivas = 0;
        let cStats: Record<string, number> = {};
        let pStats: Record<string, number> = {};

        otsSnap.forEach(doc => {
            const data = doc.data();
            const esCorrectiva = data.tipo === 'Correctivo' || data.tipo === 'Correctiva' || !data.tipo;

            const client = data.clienteId || 'SIN_CLIENTE';
            if (!cStats[client]) cStats[client] = 0;
            if (!pStats[client]) pStats[client] = 0;

            if (esCorrectiva) {
                correctivas++;
                cStats[client]++;
            } else {
                preventivas++;
                pStats[client]++;
            }
        });

        console.log(`Total OTs: ${otsSnap.size}`);
        console.log(`\nCorrectivas por Cliente:`);
        Object.entries(cStats).forEach(([cliente, count]) => {
            if (count > 0) console.log(`  - ${cliente}: ${count}`);
        });

        console.log(`\nPreventivas por Cliente:`);
        Object.entries(pStats).forEach(([cliente, count]) => {
            if (count > 0) console.log(`  - ${cliente}: ${count}`);
        });

    } catch (e) {
        console.error(e);
    }
}

checkOTs();
