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

// MAPEO ESTANDAR DE ROLES
const ROLE_MAP = {
    'COORDINADOR': 'ROL_COORD',
    'GERENTE': 'ROL_GERENTE',
    'TECNICO': 'ROL_TECNICO',
    'TECNICOEXTERNO': 'ROL_TECNICO_EXTERNO',
    'SUPERVISOR': 'ROL_SUPERVISOR',
    'ADMIN GENERAL': 'ROL_ADMIN',
    'ADMIN': 'ROL_ADMIN'
};

async function normalizeCatalogs() {
    console.log("=== NORMALIZACIÓN DE CATÁLOGOS (VÍNCULO DE HIERRO) ===");
    const catSnap = await getDocs(collection(db, 'catalogos'));

    for (const d of catSnap.docs) {
        const item = d.data();
        let needsUpdate = false;
        let updateData = {};

        // 1. NORMALIZACIÓN DE ROLES
        if (item.categoria === 'Rol') {
            const desc = item.nombre.toUpperCase().trim();
            const stdNomen = ROLE_MAP[desc];
            if (stdNomen && item.nomenclatura !== stdNomen) {
                updateData.nomenclatura = stdNomen;
                needsUpdate = true;
                console.log(`[ROL] "${item.nombre}" (${d.id}) -> Nomenclatura: ${stdNomen}`);
            }
        }

        // 2. NORMALIZACIÓN DE ESPECIALIDADES / FAMILIAS
        if (item.categoria === 'Familia' || item.categoria === 'Especialidad') {
            // Asegurar que Categoría sea siempre 'Familia' para unificar
            if (item.categoria === 'Especialidad') {
                updateData.categoria = 'Familia';
                needsUpdate = true;
            }

            // Generar nomenclatura limpia si no existe o es incorrecta
            const cleanName = item.nombre.toUpperCase()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
                .replace(/[^A-Z0-9]/g, '_'); // Solo letras y números

            const stdNomen = `ESP_${cleanName}`;
            if (item.nomenclatura !== stdNomen) {
                updateData.nomenclatura = stdNomen;
                needsUpdate = true;
                console.log(`[ESP] "${item.nombre}" (${d.id}) -> Nomenclatura: ${stdNomen}`);
            }
        }

        if (needsUpdate) {
            await updateDoc(doc(db, 'catalogos', d.id), updateData);
        }
    }
    console.log("=== NORMALIZACIÓN DE CATÁLOGOS COMPLETADA ===\n");
}

normalizeCatalogs().catch(console.error);
