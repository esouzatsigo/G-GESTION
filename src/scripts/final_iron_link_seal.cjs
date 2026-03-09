const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, updateDoc } = require("firebase/firestore");

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

// MAPEO MAESTRO DE IDENTIDAD (LA LEY)
const MASTER_MAP = {
    // Roles
    'ROL_COORDINADOR': 'ROL_COORD',
    'ROL_COORDINADOR_CN': 'ROL_COORD',
    'ROL_TECNICOEXTERNO': 'ROL_TECNICO_EXTERNO',
    'ROL_TECNICO_EXTERNO': 'ROL_TECNICO_EXTERNO',
    'Admin': 'ROL_ADMIN',
    'Admin General': 'ROL_ADMIN',
    'Coordinador': 'ROL_COORD',
    'Gerente': 'ROL_GERENTE',
    'Tecnico': 'ROL_TECNICO',
    'Supervisor': 'ROL_SUPERVISOR',

    // Especialidades / Familias
    'FAMILIA_REFRIGERACION': 'ESP_REFRIGERACION',
    'FAMILIA_COCCION': 'ESP_COCCION',
    'FAMILIA_AIRES': 'ESP_AIRES',
    'FAMILIA_AGUA': 'ESP_AGUA',
    'FAMILIA_COCINA': 'ESP_COCINA',
    'FAMILIA_RESTAURANTE': 'ESP_RESTAURANTE',
    'FAMILIA_GENERADORES': 'ESP_GENERADORES',
    'FAMILIA_LOCAL': 'ESP_LOCAL',
    'ESPECIALIDAD_COCCION': 'ESP_COCCION',
    'ESPECIALIDAD_REFRIGERACION': 'ESP_REFRIGERACION',
    'ESPECIALIDAD_AIRES': 'ESP_AIRES',
    'Cocina': 'ESP_COCINA'
};

async function finalIronLinkSeal() {
    console.log("=== SELLO DEFINITIVO: EL VÍNCULO DE HIERRO ===\n");

    // 1. Catálogos
    const catSnap = await getDocs(collection(db, 'catalogos'));
    for (const d of catSnap.docs) {
        const item = d.data();
        const targetNomen = MASTER_MAP[item.nomenclatura] || MASTER_MAP[item.nombre];
        if (targetNomen && item.nomenclatura !== targetNomen) {
            await updateDoc(doc(db, 'catalogos', d.id), { nomenclatura: targetNomen });
            console.log(`[CAT] "${item.nombre}" (${item.categoria}) -> ${targetNomen}`);
        }
    }

    // 2. Usuarios
    const userSnap = await getDocs(collection(db, 'usuarios'));
    for (const d of userSnap.docs) {
        const u = d.data();
        let update = {};
        let needsUpdate = false;

        const targetRol = MASTER_MAP[u.rol];
        if (targetRol && u.rol !== targetRol) {
            update.rol = targetRol;
            needsUpdate = true;
        }

        const targetEsp = MASTER_MAP[u.especialidad];
        if (targetEsp && u.especialidad !== targetEsp) {
            update.especialidad = targetEsp;
            needsUpdate = true;
        }

        if (needsUpdate) {
            await updateDoc(doc(db, 'usuarios', d.id), update);
            console.log(`[USER] "${u.nombre}" Saneado.`);
        }
    }

    // 3. Equipos
    const eqSnap = await getDocs(collection(db, 'equipos'));
    for (const d of eqSnap.docs) {
        const e = d.data();
        const targetFam = MASTER_MAP[e.familia];
        if (targetFam && e.familia !== targetFam) {
            await updateDoc(doc(db, 'equipos', d.id), { familia: targetFam });
            console.log(`[EQ] "${e.nombre}" Saneado.`);
        }
    }

    // 4. Órdenes de Trabajo (Saneamiento Quirúrgico)
    const otSnap = await getDocs(collection(db, 'ordenesTrabajo'));
    console.log(`\n--- Saneando OTs (${otSnap.size} registros) ---`);
    for (const d of otSnap.docs) {
        const ot = d.data();
        if (ot.familia && MASTER_MAP[ot.familia]) {
            const targetFam = MASTER_MAP[ot.familia];
            if (ot.familia !== targetFam) {
                await updateDoc(doc(db, 'ordenesTrabajo', d.id), { familia: targetFam });
                console.log(`[OT] #${ot.numero} Corregida (${ot.familia} -> ${targetFam})`);
            }
        }
    }

    console.log("\n=== SISTEMA SELLADO AL 100% ===");
}

finalIronLinkSeal().catch(console.error);
