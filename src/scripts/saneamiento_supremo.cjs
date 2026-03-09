
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

async function saneamientoSupremo(isDryRun = true) {
    console.log(`--- INICIANDO SANEAMIENTO SUPREMO (DRY-RUN: ${isDryRun}) ---`);

    // IDs de referencia (Extraídos de list_users y sucursales)
    const GERENTE_ALTABRISA_ID = "empiiN18VlLXZlXq45i4";
    const SUCURSAL_ALTABRISA_ID = "21lgUGdfGA5OBjVMo1ee";
    const CLIENTE_TEST_BPT = "3de6K2GeasZhN2GIQWXw";

    const [otsSnap, eqsSnap] = await Promise.all([
        getDocs(collection(db, 'ordenesTrabajo')),
        getDocs(collection(db, 'equipos'))
    ]);

    const ots = otsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const eqs = eqsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    fs.writeFileSync('BACKUP_SANEAMIENTO_ALTABRISA.json', JSON.stringify({ ots, eqs }, null, 2));

    const otChanges = [];
    const eqChanges = [];

    // 1. Sanear Equipos Placeholders
    eqs.forEach(eq => {
        if (eq.clienteId === CLIENTE_TEST_BPT && eq.nombre === "Equipo sin nombre" && eq.idInterno && eq.idInterno.startsWith('BA-')) {
            const numPart = parseInt(eq.idInterno.split('-')[1]);
            const realName = EQUIPOS_DICCIONARIO[numPart - 1] || "Equipo Desconocido Altabrisa";

            eqChanges.push({
                id: eq.id,
                before: eq.nombre,
                after: realName
            });
        }
    });

    // 2. Sanear OTs (Solicitante, Sucursal, Integridad)
    ots.forEach(ot => {
        if (ot.clienteId === CLIENTE_TEST_BPT) {
            let needsUpdate = false;
            const updateData = {};

            // Solicitante shortcode -> ID Real
            if (ot.solicitanteId === 'Gerente.BA' || ot.solicitanteId === 'SYSTEM_PLANNER' || !ot.solicitanteId) {
                updateData.solicitanteId = GERENTE_ALTABRISA_ID;
                needsUpdate = true;
            }

            // Sucursal shortcode -> ID Real
            if (ot.sucursalId === 'BA' || !ot.sucursalId) {
                updateData.sucursalId = SUCURSAL_ALTABRISA_ID;
                needsUpdate = true;
            }

            if (needsUpdate) {
                otChanges.push({
                    ot: ot.numero,
                    id: ot.id,
                    before: { solicitanteId: ot.solicitanteId, sucursalId: ot.sucursalId },
                    after: updateData
                });
            }
        }
    });

    console.log(`\n✅ ANÁLISIS COMPLETADO (AUDITORÍA DE ACERO)`);
    console.log(`Equipos a Restaurar Nombre: ${eqChanges.length}`);
    console.log(`OTs a Reconectar Datos: ${otChanges.length}`);

    // Reporte en Markdown
    let reportMd = "# REPORTE SUPREMO DE SANEAMIENTO (DRY-RUN)\n\n";
    reportMd += `He identificado ${eqChanges.length} equipos con nombre perdido y ${otChanges.length} OTs con dependencias rotas.\n\n`;

    reportMd += "## Resturación de Equipos (Muestra)\n";
    reportMd += "| ID Equipo | Nombre Anterior | Nombre Restaurado |\n";
    reportMd += "|-----------|-----------------|-------------------|\n";
    eqChanges.slice(0, 10).forEach(e => reportMd += `| ${e.id} | ${e.before} | ${e.after} |\n`);

    reportMd += "\n## Reconexión de OTs (Muestra)\n";
    reportMd += "| OT # | Solicitante Antes | Solicitante Ahora | Sucursal |\n";
    reportMd += "|------|-------------------|-------------------|----------|\n";
    otChanges.forEach(o => {
        const finalSolicitante = o.after.solicitanteId || o.before.solicitanteId;
        const finalSucursal = o.after.sucursalId || o.before.sucursalId;
        reportMd += `| ${o.ot} | ${o.before.solicitanteId} | ${finalSolicitante} | ${finalSucursal} |\n`;
    });

    fs.writeFileSync('DRY_RUN_SANEAMIENTO_360.md', reportMd);
    console.log(`Revisa reporte en DRY_RUN_SANEAMIENTO_360.md`);
}

saneamientoSupremo(true).catch(console.error);
