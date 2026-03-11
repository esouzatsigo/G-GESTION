const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where, updateDoc, doc } = require('firebase/firestore');

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

const CLIENTE_ID = 'HXIjyDoFvWl00Qs29QPw';

async function fixUsersAndEquipos() {
    console.log("=== INICIANDO AUTO-REPARADOR DE EMERGENCIAS (BPT GROUP) ===");

    // IDs conocidos
    const ID_NUEVO = 'mBGfKcTdcjsHeAX8X7Hz'; // B Altabrisa - OFICIAL
    const IDS_VIEJOS = ['fmIQBqzkElTEY6nnj0c0', 'HocVkOhJBlw3JAulA0Gb', 'BA', 'Azbef4Og1nABbWAQdQvJ'];

    // 1. REPARAR USUARIOS (sucursalesPermitidas)
    const qUsers = query(collection(db, 'usuarios'), where('clienteId', '==', CLIENTE_ID));
    const snapUsers = await getDocs(qUsers);
    
    let usersFixed = 0;
    for (const d of snapUsers.docs) {
        const u = d.data();
        let needsFix = false;
        let newPermitidas = [...(u.sucursalesPermitidas || [])];

        for (const badId of IDS_VIEJOS) {
            if (newPermitidas.includes(badId)) {
                newPermitidas = newPermitidas.filter(id => id !== badId);
                if (!newPermitidas.includes(ID_NUEVO)) {
                    newPermitidas.push(ID_NUEVO);
                }
                needsFix = true;
            }
        }

        if (needsFix) {
            console.log(`[Users] Reparando usuario: ${u.nombre} (${d.id})`);
            await updateDoc(doc(db, 'usuarios', d.id), {
                sucursalesPermitidas: newPermitidas
            });
            usersFixed++;
        }
    }
    console.log(`✅ Usuarios reparados: ${usersFixed}`);

    // 2. REPARAR EQUIPOS HUÉRFANOS (por si quedó alguno)
    let equiposFixed = 0;
    for (const badId of IDS_VIEJOS) {
        const qEq = query(collection(db, 'equipos'), where('sucursalId', '==', badId));
        const snapEq = await getDocs(qEq);
        for (const d of snapEq.docs) {
            console.log(`[Equip] Reparando equipo: ${d.id}`);
            await updateDoc(doc(db, 'equipos', d.id), {
                sucursalId: ID_NUEVO,
                fixedByAutoRepair: new Date().toISOString()
            });
            equiposFixed++;
        }
    }
    console.log(`✅ Equipos reparados: ${equiposFixed}`);

    process.exit(0);
}

fixUsersAndEquipos().catch(console.error);
