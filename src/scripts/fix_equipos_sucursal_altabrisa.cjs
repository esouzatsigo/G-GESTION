
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

async function fixEquiposSucursal() {
    console.log(`🚀 CORRIGIENDO SUCURSAL DE EQUIPOS ALTABRISA (TEST BPT) 🛡️`);

    const SUCURSAL_ALTABRISA_REAL = "HuwoZsAHef5kCZwCFirU";
    const CLIENTE_TEST_BPT = "3de6K2GeasZhN2GIQWXw";

    const q = query(collection(db, 'equipos'), where('clienteId', '==', CLIENTE_TEST_BPT));
    const snapshot = await getDocs(q);

    let count = 0;
    for (const d of snapshot.docs) {
        if (d.data().sucursalId !== SUCURSAL_ALTABRISA_REAL) {
            await updateDoc(doc(db, 'equipos', d.id), {
                sucursalId: SUCURSAL_ALTABRISA_REAL
            });
            count++;
        }
    }

    console.log(`\n✅ OPERACIÓN COMPLETADA: ${count} equipos movidos a la sucursal correcta.`);
}

fixEquiposSucursal().catch(console.error);
