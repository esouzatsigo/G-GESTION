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

async function normalizeUsersAndEquipos() {
    console.log("=== NORMALIZACIÓN DE USUARIOS Y EQUIPOS (VÍNCULO DE HIERRO) ===");

    // 1. OBTENER CATÁLOGOS NORMALIZADOS
    const catSnap = await getDocs(collection(db, 'catalogos'));
    const catalogs = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Mapeos: Nombre -> Nomenclatura
    const roleMap = {};
    const familyMap = {};

    catalogs.forEach(c => {
        if (c.categoria === 'Rol') {
            roleMap[c.nombre.toUpperCase().trim()] = c.nomenclatura;
        }
        if (c.categoria === 'Familia' || c.categoria === 'Especialidad') {
            familyMap[c.nombre.toUpperCase().trim()] = c.nomenclatura;
        }
    });

    // 2. NORMALIZAR USUARIOS
    const userSnap = await getDocs(collection(db, 'usuarios'));
    console.log(`\nProcesando ${userSnap.size} usuarios...`);

    for (const d of userSnap.docs) {
        const u = d.data();
        let update = {};
        let needsUpdate = false;

        // Rol: Si el valor actual es un nombre estético, convertirlo a Nomenclatura
        const roleNomen = roleMap[u.rol.toUpperCase().trim()];
        if (roleNomen && u.rol !== roleNomen) {
            update.rol = roleNomen;
            needsUpdate = true;
            console.log(`[USER] "${u.nombre}" | Rol: "${u.rol}" -> "${roleNomen}"`);
        }

        // Especialidad: Si existe y es texto, convertir a Nomenclatura
        if (u.especialidad) {
            const espNomen = familyMap[u.especialidad.toUpperCase().trim()];
            if (espNomen && u.especialidad !== espNomen) {
                update.especialidad = espNomen;
                needsUpdate = true;
                console.log(`[USER] "${u.nombre}" | Especialidad: "${u.especialidad}" -> "${espNomen}"`);
            }
        }

        if (needsUpdate) {
            await updateDoc(doc(db, 'usuarios', d.id), update);
        }
    }

    // 3. NORMALIZAR EQUIPOS
    const eqSnap = await getDocs(collection(db, 'equipos'));
    console.log(`\nProcesando ${eqSnap.size} equipos...`);

    for (const d of eqSnap.docs) {
        const e = d.data();
        const familyNomen = familyMap[e.familia.toUpperCase().trim()];

        if (familyNomen && e.familia !== familyNomen) {
            await updateDoc(doc(db, 'equipos', d.id), { familia: familyNomen });
            console.log(`[EQUIPO] "${e.nombre}" | Familia: "${e.familia}" -> "${familyNomen}"`);
        }
    }

    console.log("\n=== CONSOLDIACIÓN DE LIGAS COMPLETADA ===");
}

normalizeUsersAndEquipos().catch(console.error);
