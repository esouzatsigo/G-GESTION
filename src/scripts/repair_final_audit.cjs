
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');

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

async function repairFinalAuditItems() {
    console.log(`🚀 SANEAMIENTO FINAL DE INTEGRIDAD (FORENSE) 🛡️`);

    const CORPORATIVO_ID = "3de6K2GeasZhN2GIQWXw";

    const USERS_TO_FIX = [
        '4SW3JjD9h7dVQXc5f0v0pTuM7QT2', 'AckxHhddONey3RXmXFjW3JdRvED2',
        'OivGB2kxb8Oolz28kMRVk7tjM2W2', 'e4DWy0MwLweRiLBxSsP1bEngkTt2',
        'h96hwHnXi7muCcO7GjoC', 'jSr2bCUhnX5pZO3LjLkU',
        'zmipBI3dZVUELOcBk93O7jXgTGI3'
    ];

    const SUCURSAL_TO_FIX = 'mhIVL18Kd9nwWxajOlD0';

    let count = 0;
    for (const uid of USERS_TO_FIX) {
        await updateDoc(doc(db, 'usuarios', uid), { clienteId: CORPORATIVO_ID });
        console.log(`[+] Usuario saneado: ${uid}`);
        count++;
    }

    await updateDoc(doc(db, 'sucursales', SUCURSAL_TO_FIX), { clienteId: CORPORATIVO_ID });
    console.log(`[+] Sucursal saneada: ${SUCURSAL_TO_FIX}`);
    count++;

    console.log(`\n✅ SANEAMIENTO FORESTAL COMPLETADO: ${count} registros normalizados.`);
}

repairFinalAuditItems().catch(console.error);
