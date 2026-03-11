const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where, updateDoc, doc } = require('firebase/firestore');

// ==========================================
// CONFIGURACIÓN BPT GROUP (DEV)
// ==========================================
const devConfig = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
    storageBucket: "h-gestion-dev.firebasestorage.app",
    messagingSenderId: "198928689880",
    appId: "1:198928689880:web:7f90dcd33e710fcc7505ad",
};

// ==========================================
// CONFIGURACIÓN TEST BPT
// ==========================================
const testConfig = {
    apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
    authDomain: "h-gestion-testbpt.firebaseapp.com",
    projectId: "h-gestion-testbpt",
    storageBucket: "h-gestion-testbpt.firebasestorage.app",
    messagingSenderId: "385439061540",
    appId: "1:385439061540:web:95c1461abd46400724eab1",
};

// Inicializar múltiples instancias para conectar a ambas bases de datos simultáneamente
const appDev = initializeApp(devConfig, "dev");
const dbDev = getFirestore(appDev);

const appTest = initializeApp(testConfig, "test");
const dbTest = getFirestore(appTest);

// IDs fantasma globales a erradicar
const GHOST_IDS = ['fmIQBqzkElTEY6nnj0c0', 'HocVkOhJBlw3JAulA0Gb', 'BA', 'Azbef4Og1nABbWAQdQvJ'];

/**
 * Función central de purga y reparación.
 */
async function cleanEnvironment(db, envName, clienteId, oficialId) {
    console.log(`\n=== 🛠️ INICIANDO PURGA EN: ${envName} ===`);
    let usersFixed = 0;
    let equiposFixed = 0;

    // 1. REPARAR USUARIOS (Limpiar sus credenciales de acceso)
    const qUsers = query(collection(db, 'usuarios'), where('clienteId', '==', clienteId));
    const snapUsers = await getDocs(qUsers);
    
    for (const d of snapUsers.docs) {
        const u = d.data();
        let needsFix = false;
        let newPermitidas = Array.isArray(u.sucursalesPermitidas) ? [...u.sucursalesPermitidas] : [];

        for (const badId of GHOST_IDS) {
            if (newPermitidas.includes(badId)) {
                newPermitidas = newPermitidas.filter(id => id !== badId);
                needsFix = true;
            }
        }

        // Si se le purgaron sucursales defectuosas, asegurar que tenga la buena (OFICIAL)
        if (needsFix && !newPermitidas.includes(oficialId) && !newPermitidas.includes('TODAS')) {
            newPermitidas.push(oficialId);
        }

        if (needsFix) {
            console.log(` [👤 Usuario] Reparando perfil de: ${u.nombre || u.email} (${d.id})`);
            await updateDoc(doc(db, 'usuarios', d.id), {
                sucursalesPermitidas: newPermitidas,
                lastMasterRepair: new Date().toISOString()
            });
            usersFixed++;
        }
    }

    // 2. REPARAR EQUIPOS HUÉRFANOS
    for (const badId of GHOST_IDS) {
        const qEq = query(collection(db, 'equipos'), where('sucursalId', '==', badId));
        const snapEq = await getDocs(qEq);
        for (const d of snapEq.docs) {
            const eq = d.data();
            // Evitar cruces, reparar solo si pertenecen al cliente correcto
            if(eq.clienteId === clienteId) {
                console.log(` [🔧 Equipo] Rescatando equipo perdido: ${eq.nombre || d.id}`);
                await updateDoc(doc(db, 'equipos', d.id), {
                    sucursalId: oficialId,
                    fixedByMasterRepair: new Date().toISOString()
                });
                equiposFixed++;
            }
        }
    }

    console.log(`✅ Resultado en ${envName} -> Usuarios reparados: ${usersFixed} | Equipos rescatados: ${equiposFixed}`);
}

async function runMasterRepair() {
    console.log("🚀 EJECUTANDO SALVAVIDAS MAESTRO PARA AMBOS ENTORNOS...");
    
    // 1. REPARAR BPT GROUP (DEV)
    await cleanEnvironment(
        dbDev, 
        "BPT GROUP (DEV)", 
        'HXIjyDoFvWl00Qs29QPw', 
        'mBGfKcTdcjsHeAX8X7Hz'  // ID OFICIAL ALTABRISA BPT GROUP
    );

    // 2. REPARAR TEST BPT
    await cleanEnvironment(
        dbTest, 
        "TEST BPT", 
        '3de6K2GeasZhN2GIQWXw', 
        'HuwoZsAHef5kCZwCFirU'  // ID OFICIAL ALTABRISA TEST BPT
    );

    console.log("\n✨ ¡PROTOCOLO MAESTRO FINALIZADO CON ÉXITO! Todos los entornos están limpios.");
    process.exit(0);
}

runMasterRepair().catch(console.error);
