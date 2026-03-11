
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

async function repairThreeOTs() {
    console.log(`🚀 REPARANDO ÚNICAMENTE OTs 1021, 1022, 1023 🛡️`);

    const GERENTE_ALTABRISA_ID = "empiiN18VlLXZlXq45i4";
    const SUCURSAL_ALTABRISA_ID = "HocVkOhJBlw3JAulA0Gb"; // Altabrisa TEST BPT

    // Mapeo autorizado por Héctor
    const ASIGNACIONES = {
        1023: "5Q1quwQ4iRgf8fQlWvOZ", // Refrigerador de masas (1)
        1022: "fh00ly3zO0YQNvVo8cMB", // Congelador de papas (1)
        1021: "if1MpK9oHzLRF554GAqo"  // Refrigerador de postres (1)
    };

    const q = query(collection(db, 'ordenesTrabajo'), where('numero', 'in', [1021, 1022, 1023]));
    const snapshot = await getDocs(q);

    let count = 0;
    for (const d of snapshot.docs) {
        const num = d.data().numero;
        const eqId = ASIGNACIONES[num];

        await updateDoc(doc(db, 'ordenesTrabajo', d.id), {
            equipoId: eqId,
            sucursalId: SUCURSAL_ALTABRISA_ID,
            solicitanteId: GERENTE_ALTABRISA_ID
        });
        console.log(`[+] OT ${num} Reparada - EquipoId: ${eqId}`);
        count++;
    }

    console.log(`\n✅ OPERACIÓN COMPLETADA: ${count} OTs actualizadas.`);
}

repairThreeOTs().catch(console.error);
