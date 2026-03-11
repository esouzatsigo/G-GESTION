
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');
const fs = require('fs');

const firebaseConfig = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
    storageBucket: "h-gestion-dev.firebasestorage.app",
    messagingSenderId: "198928689880",
    appId: "1:198928689880:web:7f90dcd33e710fcc7505ad",
};

const EQUIPOS_DICCIONARIO = [
    "BA-Congelador de tarros vertical (1)", "BA-Bomba de lodos (1)", "BA-Camara de congelación (1)", "BA-Horno de microondas de pastas (1)",
    "BA-Rayador de quesos (1)", "BA-Calentador 220v 40 galones calorex dish (1)", "BA-Nevera de pizza (1)", "BA-Nevera vertical heineken palco (1)",
    "BA-Grill /parrilla (1)", "BA-Hobart (1)", "BA-Fan and coil área de juegos(1)", "BA-Horno de microondas pizza (1)", "BA-Bomba de pozo (1)",
    "BA-Enfriador de jugos (1)", "BA-Freidora (2)", "BA-Horno de microondas de corte (1)", "BA-Camara fría de cervezas (1)", "BA-Freidora (3)",
    "BA-Minisplit oficina (1)", "BA-Estufa de inducción pastas (3)", "BA-Nevera de tarros horizontal barra (1)", "BA-Máquina de hielo (2)",
    "BA-Calentador de platos 110v expo (1)", "BA-Paquete aire acondicionado Bar (1)", "BA-Minisplit palco (2)", "BA-Bomba de agua dura (1)",
    "BA-Rebanadora (1)", "BA-Refrigerador de postres (1)", "BA-Horno de microondas pizza (2)", "BA-Minisplit terraza nueva (2)",
    "BA-Horno de convección (1)", "BA-Máquina de hielo (1)", "BA-Suavizadores (1)", "BA-Planta de emergencia (1)", "BA-Calentador 220v 40 galones reen bodega (1)",
    "BA-Paquete aire acondicionado salón (1)", "BA-Nevera de parrilla (1)", "BA-Nevera de cervezas barra (1)", "BA-Mesa de pastas (1)",
    "BA-Nevera de corte (1)", "BA-Congelador de papas (1)", "BA-Estufa de inducción pastas (1)", "BA-Camara de conserva (1)", "BA-Freidora (1)",
    "BA-Estufa de induccion pastas (4)", "BA-Paquete aire acondicionado cocina (1)", "BA-Cafetera Nescafé (1)", "BA-Refrigerador de masas (1)",
    "BA-Bomba de agua suave (1)", "BA-Nevera de vinos (1)", "BA-Estufa de inducción pastas (2)", "BA-Osmosis de agua purificada (1)",
    "BA-Máquina lavaloza de Bar (1)", "BA-Horno de microondas pizza (3)", "BA-Paneles (1)", "BA-Calentador de platos 110v expo (2)",
    "BA-Baño María (1)", "BA-Máquina lavaloza (1)", "BA-Torre de cerveza (1)", "BA-Máquina de margaritas (1)", "BA-Congelador de helados (1)",
    "BA-Minisplit palco (1)", "BA-Minisplit terraza nueva (1)"
];

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function aplicarSaneamientoReal() {
    console.log(`🚀 EJECUTANDO SANEAMIENTO REAL - ALTABRISA 🛡️`);

    const GERENTE_ALTABRISA_ID = "empiiN18VlLXZlXq45i4";
    const SUCURSAL_ALTABRISA_ID = "21lgUGdfGA5OBjVMo1ee";
    const CLIENTE_TEST_BPT = "3de6K2GeasZhN2GIQWXw";

    const [otsSnap, eqsSnap] = await Promise.all([
        getDocs(collection(db, 'ordenesTrabajo')),
        getDocs(collection(db, 'equipos'))
    ]);

    const ots = otsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const eqs = eqsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    let eqUpdates = 0;
    let otUpdates = 0;

    // 1. Corregir Nombres de Equipos (Placeholders)
    for (const eq of eqs) {
        if (eq.clienteId === CLIENTE_TEST_BPT && eq.nombre === "Equipo sin nombre" && eq.idInterno && eq.idInterno.startsWith('BA-')) {
            const numPart = parseInt(eq.idInterno.split('-')[1]);
            const realName = EQUIPOS_DICCIONARIO[numPart - 1];

            if (realName) {
                await updateDoc(doc(db, 'equipos', eq.id), { nombre: realName });
                eqUpdates++;
            }
        }
    }

    // 2. Corregir OTs
    for (const ot of ots) {
        if (ot.clienteId === CLIENTE_TEST_BPT) {
            const updateProps = {};
            if (ot.solicitanteId === 'Gerente.BA' || ot.solicitanteId === 'SYSTEM_PLANNER' || !ot.solicitanteId) {
                updateProps.solicitanteId = GERENTE_ALTABRISA_ID;
            }
            if (ot.sucursalId === 'BA' || !ot.sucursalId) {
                updateProps.sucursalId = SUCURSAL_ALTABRISA_ID;
            }

            if (Object.keys(updateProps).length > 0) {
                await updateDoc(doc(db, 'ordenesTrabajo', ot.id), updateProps);
                otUpdates++;
            }
        }
    }

    console.log(`\n✅ SANEAMIENTO COMPLETADO`);
    console.log(`Equipos actualizados: ${eqUpdates}`);
    console.log(`OTs reconectadas: ${otUpdates}`);
}

aplicarSaneamientoReal().catch(console.error);
