const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');

const firebaseConfig = {
    apiKey: 'AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw',
    authDomain: 'h-gestion-dev.firebaseapp.com',
    projectId: 'h-gestion-dev',
    storageBucket: 'h-gestion-dev.firebasestorage.app',
    messagingSenderId: '198928689880',
    appId: '1:198928689880:web:7f90dcd33e710fcc7505ad',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runAudit() {
    console.log('--- INICIANDO AUDITORÍA FORENSE DE INTEGRIDAD EN OTs ---');

    // 1. Cargar Maestros en memoria para validación rápida
    const masters = {
        clientes: new Set(),
        sucursales: new Set(),
        equipos: new Set(),
        usuarios: new Set()
    };

    console.log('Cargando catálogos maestros...');
    for (const coll of Object.keys(masters)) {
        const snap = await getDocs(collection(db, coll));
        snap.forEach(d => masters[coll].add(d.id));
        console.log(`- ${coll}: ${masters[coll].size} cargados.`);
    }

    // 2. Procesar OTs
    const otsSnap = await getDocs(collection(db, 'ordenesTrabajo'));
    console.log(`Procesando ${otsSnap.size} Ordenes de Trabajo...`);

    const failures = [];
    let cleanCount = 0;

    otsSnap.forEach(doc => {
        const data = doc.data();
        const otId = doc.id;
        const otNum = data.numero || 'S/N';
        const errors = [];

        // Validación de Dependencias
        if (!data.clienteId || !masters.clientes.has(data.clienteId)) {
            errors.push(`clienteId inválido o inexistente: ${data.clienteId}`);
        }
        if (!data.sucursalId || !masters.sucursales.has(data.sucursalId)) {
            errors.push(`sucursalId inválido o inexistente: ${data.sucursalId}`);
        }
        if (!data.equipoId || !masters.equipos.has(data.equipoId)) {
            errors.push(`equipoId inválido o inexistente: ${data.equipoId}`);
        }
        if (data.tecnicoId && !masters.usuarios.has(data.tecnicoId)) {
            errors.push(`tecnicoId (Usuario) inexistente: ${data.tecnicoId}`);
        }
        if (data.solicitanteId && !masters.usuarios.has(data.solicitanteId)) {
            errors.push(`solicitanteId (Usuario) inexistente: ${data.solicitanteId}`);
        }

        // Detección de typo histórico
        if (data.clientId) {
            errors.push(`CAMPO OBSOLETO DETECTADO: clientId`);
        }

        if (errors.length > 0) {
            failures.push({
                otId,
                numero: otNum,
                errors
            });
        } else {
            cleanCount++;
        }
    });

    // 3. Generar Reporte
    let report = `# Reporte de Auditoría de Integridad en OTs\n\n`;
    report += `Fecha: ${new Date().toLocaleString()}\n`;
    report += `Total OTs Analizadas: ${otsSnap.size}\n`;
    report += `OTs con Integridad Total: ${cleanCount}\n`;
    report += `OTs con Anomalías: ${failures.length}\n\n`;

    if (failures.length > 0) {
        report += `## Detalle de Anomalías Encontradas\n\n`;
        failures.forEach(f => {
            report += `### OT ${f.numero} (DocID: ${f.otId})\n`;
            f.errors.forEach(err => report += `- ❌ ${err}\n`);
            report += `\n`;
        });
    } else {
        report += `## ✅ ÉXITO: 100% de las OTs mantienen integridad de dependencias.\n`;
    }

    fs.writeFileSync('C:/Users/HACel/.gemini/antigravity/brain/b3a3e1a6-1006-4f56-9ccb-a5ac5642923a/auditoria_ot_dependencias.md', report);
    console.log('--- AUDITORÍA TERMINADA ---');
    console.log(`Integridad: ${cleanCount} OK | Fallas: ${failures.length}`);
}

runAudit().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
