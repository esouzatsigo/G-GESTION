const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, collection, getDocs } = require('firebase/firestore');

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

async function executeSanitization() {
    console.log('--- EJECUTANDO SANEAMIENTO DE SOLICITANTE (AUTORIZADO) ---');

    const TARGET_USER_ID = 'HjRs59PADerbXOuoXTuy'; // Gerente BP Altabrisa
    const otsSnap = await getDocs(collection(db, 'ordenesTrabajo'));
    let count = 0;

    for (const d of otsSnap.docs) {
        const data = d.data();
        if (data.solicitanteId === 'SYSTEM_PLANNER' && data.sucursalId === 'BA') {
            await updateDoc(doc(db, 'ordenesTrabajo', d.id), {
                solicitanteId: TARGET_USER_ID
            });
            console.log(`ACTUALIZADO: OT ${data.numero} -> Solicitante: ${TARGET_USER_ID}`);
            count++;
        }
    }

    console.log(`--- SANEAMIENTO FINALIZADO: ${count} OTs actualizadas ---`);
}

executeSanitization().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
