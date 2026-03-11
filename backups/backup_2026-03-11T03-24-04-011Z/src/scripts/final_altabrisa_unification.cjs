
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, doc, updateDoc } = require('firebase/firestore');

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

async function finalTenantUnification() {
    console.log(`🚀 UNIFICANDO TENANT ALTABRISA (TEST BPT) 🛡️`);

    const SUCURSAL_DESTINO_ID = "HocVkOhJBlw3JAulA0Gb"; // Altabrisa TEST BPT (Firebase ID)
    const CLIENTE_TEST_BPT = "3de6K2GeasZhN2GIQWXw";
    const SUCURSAL_ERRONEA_CORPO = "21lgUGdfGA5OBjVMo1ee"; // Santa Clara (Error previo)

    // 1. Corregir OTs
    const otsSnap = await getDocs(query(collection(db, 'ordenesTrabajo'), where('clienteId', '==', CLIENTE_TEST_BPT)));
    let otFixed = 0;
    for (const d of otsSnap.docs) {
        if (d.data().sucursalId === SUCURSAL_ERRONEA_CORPO || d.data().sucursalId === 'BA') {
            await updateDoc(doc(db, 'ordenesTrabajo', d.id), {
                sucursalId: SUCURSAL_DESTINO_ID
            });
            otFixed++;
        }
    }

    // 2. Corregir Equipos (por si acaso)
    const eqsSnap = await getDocs(query(collection(db, 'equipos'), where('clienteId', '==', CLIENTE_TEST_BPT)));
    let eqFixed = 0;
    for (const d of eqsSnap.docs) {
        if (d.data().sucursalId === SUCURSAL_ERRONEA_CORPO || d.data().sucursalId === 'BA') {
            await updateDoc(doc(db, 'equipos', d.id), {
                sucursalId: SUCURSAL_DESTINO_ID
            });
            eqFixed++;
        }
    }

    console.log(`\n✅ UNIFICACIÓN COMPLETADA`);
    console.log(`OTs corregidas: ${otFixed}`);
    console.log(`Equipos corregidos: ${eqFixed}`);
    console.log(`Destino: Altabrisa TEST BPT (${SUCURSAL_DESTINO_ID})`);
}

finalTenantUnification().catch(console.error);
