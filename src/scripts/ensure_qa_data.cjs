const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where, serverTimestamp } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
    authDomain: "h-gestion-testbpt.firebaseapp.com",
    projectId: "h-gestion-testbpt",
    storageBucket: "h-gestion-testbpt.firebasestorage.app",
    messagingSenderId: "385439061540",
    appId: "1:385439061540:web:95c1461abd46400724eab1",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function ensureData() {
    console.log("🛠️ INYECTANDO DATOS CRÍTICOS QA 🛠️");

    // 1. Asegurar Sucursal Boston's Altabrisa
    const sucursalId = 'HuwoZsAHef5kCZwCFirU';
    const sucRef = doc(db, 'sucursales', sucursalId);
    await setDoc(sucRef, {
        nombre: "Boston's Altabrisa",
        direccion: "Plaza Altabrisa, Merida, Yucatan",
        clienteId: '3de6K2GeasZhN2GIQWXw',
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
        clienteId: '3de6K2GeasZhN2GIQWXw',
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
                clienteId: '3de6K2GeasZhN2GIQWXw',
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
