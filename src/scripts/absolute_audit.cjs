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

async function absoluteAudit() {
    console.log("=== AUDITORÍA QUIRÚRGICA DE DATOS (VÍNCULO DE HIERRO) ===");

    // 1. AUDITORÍA DE ROLES
    const uSnap = await getDocs(collection(db, 'usuarios'));
    const fSnap = await getDocs(collection(db, 'franquicias'));
    const sSnap = await getDocs(collection(db, 'sucursales'));

    const franquicias = fSnap.docs.map(d => ({ id: d.id, nombre: d.data().nombre }));
    const sucursales = sSnap.docs.map(d => ({ id: d.id, nombre: d.data().nombre, franquiciaId: d.data().franquiciaId }));

    console.log("\n--- HALLAZGOS EN USUARIOS ---");
    for (const d of uSnap.docs) {
        const u = d.data();
        let needsFix = false;
        let newRol = u.rol;

        // Tránsito de texto a nomenclatura
        if (u.rol === 'Coordinador') { newRol = 'ROL_COORD'; needsFix = true; }
        if (u.rol === 'Tecnico') { newRol = 'ROL_TECNICO'; needsFix = true; }
        if (u.rol === 'TecnicoExterno') { newRol = 'ROL_TECNICO_EXTERNO'; needsFix = true; }
        if (u.rol === 'Gerente') { newRol = 'ROL_GERENTE'; needsFix = true; }
        if (u.rol === 'Supervisor') { newRol = 'ROL_SUPERVISOR'; needsFix = true; }
        if (u.rol === 'Admin General') { newRol = 'ROL_ADMIN_GENERAL'; needsFix = true; }

        if (needsFix) {
            console.log(`[!] USUARIO CON ROL DE TEXTO: ${u.nombre} | Actual: "${u.rol}" -> Sugerencia: "${newRol}"`);
        }
    }

    console.log("\n--- HALLAZGOS EN SUCURSALES (Mismatch Nombre vs FranquiciaId) ---");
    sucursales.forEach(s => {
        // Buscar si el nombre de la sucursal contiene el nombre de alguna franquicia que NO es la asignada
        franquicias.forEach(f => {
            if (s.nombre.toUpperCase().includes(f.nombre.toUpperCase()) && s.franquiciaId !== f.id) {
                const frActual = franquicias.find(fr => fr.id === s.franquiciaId)?.nombre || "N/A";
                console.log(`[!] MISMATCH SUCURSAL: "${s.nombre}"`);
                console.log(`    Contiene "${f.nombre}" pero tiene asignado "${frActual}"`);
            }
        });
    });

    console.log("\n=== FIN DE AUDITORÍA ===");
}

absoluteAudit().catch(console.error);
