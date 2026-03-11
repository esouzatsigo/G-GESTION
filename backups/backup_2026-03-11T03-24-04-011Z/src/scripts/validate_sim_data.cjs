const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where } = require("firebase/firestore");

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

async function validateSimulationData() {
    console.log("🛡️ VALIDACIÓN PRE-VUELO (SIMULACIÓN QA) 🛡️");
    console.log("=========================================");

    // 1. Validar Sucursal
    const sucSnap = await getDocs(query(collection(db, 'sucursales'), where('nombre', '==', "Boston's Altabrisa")));
    if (sucSnap.empty) {
        console.log("❌ ERROR: No se encontró sucursal 'Boston's Altabrisa'");
    } else {
        const suc = sucSnap.docs[0];
        console.log(`✅ SUCURSAL: ${suc.data().nombre} (ID: ${suc.id})`);

        // 2. Validar Equipo en esa Sucursal
        const eqSnap = await getDocs(query(collection(db, 'equipos'), where('sucursalId', '==', suc.id)));
        const targetEq = eqSnap.docs.find(d => d.data().nombre.includes("BA-Camara Congelacion"));
        if (!targetEq) {
            console.log("❌ ERROR: No se encontró el equipo 'BA-Camara Congelacion Walk-in'");
            console.log("Equipos disponibles en la sucursal:");
            eqSnap.forEach(d => console.log(`  - ${d.data().nombre}`));
        } else {
            console.log(`✅ EQUIPO: ${targetEq.data().nombre} (Familia: ${targetEq.data().familia})`);
        }
    }

    // 3. Validar Actores
    const emails = [
        "Ger.Altabrisa@BP.com",
        "coord.bpt@t-sigo.com",
        "tecnico.altabrisa@bpt.com",
        "esp.coccion@t-sigo.com"
    ];

    console.log("\n👥 VALIDANDO ACTORES:");
    for (const email of emails) {
        const uSnap = await getDocs(query(collection(db, 'usuarios'), where('email', '==', email)));
        if (uSnap.empty) {
            console.log(`❌ ERROR: Usuario no encontrado (${email})`);
        } else {
            const u = uSnap.docs[0].data();
            console.log(`✅ OK: ${u.nombre} | Rol: ${u.rol} | Cliente: ${u.clienteId}`);
        }
    }

    process.exit(0);
}

validateSimulationData().catch(console.error);
