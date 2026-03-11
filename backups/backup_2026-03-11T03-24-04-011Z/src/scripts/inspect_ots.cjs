
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');

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

async function inspectOTs() {
    console.log("Inspeccionando OTs...");
    const otsSnap = await getDocs(collection(db, 'ordenesTrabajo'));
    const eqsSnap = await getDocs(collection(db, 'equipos'));

    const eqs = {};
    eqsSnap.docs.forEach(d => eqs[d.id] = d.data());

    console.log(`OTs encontradas: ${otsSnap.size}`);
    console.log(`Equipos encontrados: ${eqsSnap.size}`);

    const list = [];
    otsSnap.docs.forEach(d => {
        const data = d.data();
        const eq = eqs[data.equipoId];
        list.push({
            numero: data.numero,
            id: d.id,
            equipoId: data.equipoId,
            equipoNombre: eq ? eq.nombre : 'NO ENCONTRADO EN COLLECCION EQUIPOS',
            otClienteId: data.clienteId,
            eqClienteId: eq ? eq.clienteId : 'N/A'
        });
    });

    // Ordenar por número descendente como en la pantalla
    list.sort((a, b) => b.numero - a.numero);

    require('fs').writeFileSync('OT_INSPECTION.json', JSON.stringify(list, null, 2));
    console.log("Guardado en OT_INSPECTION.json");
}

inspectOTs().catch(console.error);
