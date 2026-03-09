const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where, serverTimestamp } = require("firebase/firestore");

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

async function ensureData() {
    console.log("🛠️ INYECTANDO DATOS CRÍTICOS QA 🛠️");

    // 1. Asegurar Sucursal Boston's Altabrisa
    const sucursalId = 'Azbef4Og1nABbWAQdQvJ';
    const sucRef = doc(db, 'sucursales', sucursalId);
    await setDoc(sucRef, {
        nombre: "Boston's Altabrisa",
        direccion: "Plaza Altabrisa, Merida, Yucatan",
        clienteId: 'kWRmv16DNfMUlSF1Yqiv',
        activo: true
    }, { merge: true });
    console.log("✅ Sucursal Altabrisa Asegurada.");

    // 2. Asegurar Equipo Cámara de Congelación
    const equipoId = 'BA-Camara-Congelacion-Walk-in';
    const equipoRef = doc(db, 'equipos', equipoId);
    await setDoc(equipoRef, {
        nombre: 'BA-Camara Congelacion Walk-in',
        familia: 'Refrigeracion',
        sucursalId: sucursalId,
        clienteId: 'kWRmv16DNfMUlSF1Yqiv',
        idInterno: 'EQ-BA-REF-001',
        activo: true,
        lastUpdate: serverTimestamp()
    }, { merge: true });
    console.log("✅ Equipo Cámara de Congelación Asegurado.");

    // 3. Verificar Actores (Solo aviso si no están)
    const actors = [
        { email: "Ger.Altabrisa@BP.com", nombre: "Gerente BP Altabrisa", rol: "Gerente" },
        { email: "coord.bpt@t-sigo.com", nombre: "Coordinador Gral", rol: "Coordinador" },
        { email: "esp.coccion@t-sigo.com", nombre: "Especialista Coccion", rol: "TecnicoExterno" }
    ];

    for (const actor of actors) {
        const q = query(collection(db, 'usuarios'), where('email', '==', actor.email));
        const snap = await getDocs(q);
        if (snap.empty) {
            console.log(`⚠️ Actor faltante: ${actor.email}. Creando...`);
            await setDoc(doc(collection(db, 'usuarios')), {
                ...actor,
                clienteId: 'kWRmv16DNfMUlSF1Yqiv',
                sucursalesPermitidas: [sucursalId],
                activo: true
            });
        } else {
            console.log(`✅ Actor OK: ${actor.email}`);
        }
    }

    process.exit(0);
}

ensureData().catch(err => { console.error(err); process.exit(1); });
