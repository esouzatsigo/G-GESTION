
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');
const fs = require('fs');

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

async function backupAndDryRun() {
    console.log(`🔍 GENERANDO BAcKUP Y DRY-RUN DE UNIFICACIÓN...`);

    const CORRECT_SUC_ID = "HocVkOhJBlw3JAulA0Gb"; // Altabrisa TEST BPT
    const CLIENTE_TEST_BPT = "3de6K2GeasZhN2GIQWXw";

    const [otsSnap, eqsSnap] = await Promise.all([
        getDocs(query(collection(db, 'ordenesTrabajo'), where('clienteId', '==', CLIENTE_TEST_BPT))),
        getDocs(query(collection(db, 'equipos'), where('clienteId', '==', CLIENTE_TEST_BPT)))
    ]);

    const backupData = {
        timestamp: new Date().toISOString(),
        ots: [],
        equipos: []
    };

    let reportMd = "# 🛡️ REPORTE DE UNIFICACIÓN ALTABRISA (DRY-RUN)\n\n";
    reportMd += `**Objetivo:** Mover todos los registros de Altabrisa a la sucursal real de TEST BPT (${CORRECT_SUC_ID})\n\n`;

    // Procesar OTs
    reportMd += "## OTs a Corregir\n| OT # | Sucursal Anterior | Sucursal Nueva |\n|---|---|---|\n";
    otsSnap.docs.forEach(d => {
        const data = d.data();
        if (data.sucursalId !== CORRECT_SUC_ID) {
            backupData.ots.push({ id: d.id, ...data });
            reportMd += `| ${data.numero} | ${data.sucursalId} | ${CORRECT_SUC_ID} |\n`;
        }
    });

    // Procesar Equipos
    reportMd += "\n## Equipos a Corregir\n| ID | Nombre | Sucursal Anterior | Sucursal Nueva |\n|---|---|---|---|\n";
    eqsSnap.docs.forEach(d => {
        const data = d.data();
        if (data.sucursalId !== CORRECT_SUC_ID) {
            backupData.equipos.push({ id: d.id, ...data });
            reportMd += `| ${d.id} | ${data.nombre} | ${data.sucursalId} | ${CORRECT_SUC_ID} |\n`;
        }
    });

    fs.writeFileSync('BACKUP_UNIFICACION_ALTABRISA.json', JSON.stringify(backupData, null, 2));
    fs.writeFileSync('DRY_RUN_UNIFICACION.md', reportMd);

    console.log(`\n✅ BACKUP generado en BACKUP_UNIFICACION_ALTABRISA.json`);
    console.log(`✅ DRY-RUN generado en DRY_RUN_UNIFICACION.md`);
}

backupAndDryRun().catch(console.error);
