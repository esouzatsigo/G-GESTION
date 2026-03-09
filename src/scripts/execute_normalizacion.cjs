const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');

const firebaseConfig = {
    apiKey: 'AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw',
    authDomain: 'h-gestion-dev.firebaseapp.com',
    projectId: 'h-gestion-dev',
    storageBucket: 'h-gestion-dev.firebasestorage.app',
    messagingSenderId: '198928689880',
    appId: '1:198928689880:web:7f90dcd33e710fcc7505ad',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function executeNormalizacion() {
    console.log('--- EJECUTANDO NORMALIZACIÓN DE IDENTIDAD (AUTORIZADO) ---');

    // 1. Mapeo de Clientes
    const clientesSnap = await getDocs(collection(db, 'clientes'));
    const mapping = {};
    clientesSnap.forEach(d => mapping[d.id] = d.data().nombre);

    const collections = ['usuarios', 'sucursales', 'franquicias'];
    let updatedCount = 0;

    for (const coll of collections) {
        const snap = await getDocs(collection(db, coll));
        for (const d of snap.docs) {
            const data = d.data();
            if (data.clienteId && !data.clienteNombre) {
                const targetName = mapping[data.clienteId];
                if (targetName) {
                    await updateDoc(doc(db, coll, d.id), {
                        clienteNombre: targetName
                    });
                    console.log(`ACTUALIZADO: ${coll}/${d.id} -> ${targetName}`);
                    updatedCount++;
                } else {
                    console.warn(`OMITIDO (ID Huérfano): ${coll}/${d.id} - clienteId: ${data.clienteId}`);
                }
            }
        }
    }

    console.log(`--- NORMALIZACIÓN TERMINADA: ${updatedCount} registros actualizados ---`);
}

executeNormalizacion().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
