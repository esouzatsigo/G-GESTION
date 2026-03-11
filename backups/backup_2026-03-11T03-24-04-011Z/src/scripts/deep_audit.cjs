
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
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

async function runAudit() {
    console.log("Iniciando auditoría de higiene y dependencias...");

    const [otsSnap, usersSnap, sucsSnap, eqsSnap] = await Promise.all([
        getDocs(collection(db, 'ordenesTrabajo')),
        getDocs(collection(db, 'usuarios')),
        getDocs(collection(db, 'sucursales')),
        getDocs(collection(db, 'equipos'))
    ]);

    const userIds = new Set(usersSnap.docs.map(d => d.id));
    const sucIds = new Set(sucsSnap.docs.map(d => d.id));
    console.log("Muestra de IDs de Sucursales:", Array.from(sucIds).slice(0, 5));
    const eqDocs = {};
    eqsSnap.docs.forEach(d => eqDocs[d.id] = d.data());

    let stats = {
        total: 0,
        anomalies: 0,
        missingEquipo: 0,
        placeholderName: 0,
        invalidSucursalRef: 0,
        missingSolicitante: 0,
        crossTenant: 0
    };

    const reporte = [];

    otsSnap.docs.forEach(doc => {
        stats.total++;
        const data = doc.data();
        const otNum = data.numero || doc.id;
        const issues = [];

        // 1. Verificación de Solicitante
        if (!data.solicitanteId) {
            issues.push("Falta solicitanteId (OT Huérfana)");
            stats.missingSolicitante++;
        } else if (!userIds.has(data.solicitanteId) && data.solicitanteId !== 'SYSTEM_PLANNER') {
            issues.push(`solicitanteId inexistente: ${data.solicitanteId}`);
            stats.missingSolicitante++;
        }

        // 2. Verificación de Sucursal en OT
        if (!data.sucursalId) {
            issues.push("OT sin sucursalId");
            stats.invalidSucursalRef++;
        } else if (!sucIds.has(data.sucursalId)) {
            issues.push(`sucursalId en OT no es un ID válido de Firebase: ${data.sucursalId}`);
            stats.invalidSucursalRef++;
        }

        // 3. Verificación de Equipo y su Higiene
        if (!data.equipoId) {
            issues.push("OT sin equipoId");
            stats.missingEquipo++;
        } else {
            const eq = eqDocs[data.equipoId];
            if (!eq) {
                issues.push(`equipoId no encontrado en base de datos: ${data.equipoId}`);
                stats.missingEquipo++;
            } else {
                // Higiene del equipo vinculado
                if (eq.nombre === "Equipo sin nombre") {
                    issues.push(`VINCULADA A PLACEHOLDER: El equipo tiene nombre default 'Equipo sin nombre'`);
                    stats.placeholderName++;
                }

                // Consistencia de Sucursal en el Equipo
                if (!sucIds.has(eq.sucursalId)) {
                    issues.push(`ERROR DE VÍNCULO: El equipo reporta sucursalId '${eq.sucursalId}' que no existe como ID Real`);
                    stats.invalidSucursalRef++;
                }

                // Consistencia de Tenant
                if (eq.clienteId !== data.clienteId) {
                    issues.push(`CRÍTICO: Cruce de Tenant. OT es cliente ${data.clienteId} pero Equipo es cliente ${eq.clienteId}`);
                    stats.crossTenant++;
                }
            }
        }

        if (issues.length > 0) {
            stats.anomalies++;
            reporte.push({
                ot: otNum,
                docId: doc.id,
                cliente: data.clienteId,
                issues
            });
        }
    });

    let md = `# INFORME DE AUDITORÍA DE HIGIENE DE DATOS (OTs)\n\n`;
    md += `**Fecha:** ${new Date().toLocaleString()}\n`;
    md += `**Total OTs Analizadas:** ${stats.total}\n`;
    md += `**OTs con Hallazgos:** ${stats.anomalies}\n\n`;

    md += `## Resumen de Problemas\n`;
    md += `- Equipos Inexistentes/Faltantes: ${stats.missingEquipo}\n`;
    md += `- Equipos con Nombre Placeholder ("Equipo sin nombre"): ${stats.placeholderName}\n`;
    md += `- Referencias a Sucursales Inválidas (Shortcode en lugar de ID): ${stats.invalidSucursalRef}\n`;
    md += `- Problemas de Solicitante/Huérfanas: ${stats.missingSolicitante}\n`;
    md += `- Cruces de Tenant (Seguridad): ${stats.crossTenant}\n\n`;

    md += `## Detalle por Orden de Trabajo\n\n`;
    reporte.sort((a, b) => b.ot - a.ot).forEach(r => {
        md += `### OT ${r.ot} (Doc: ${r.docId})\n`;
        md += `*Cliente:* ${r.cliente}\n`;
        r.issues.forEach(i => md += `- ❌ ${i}\n`);
        md += `\n`;
    });

    fs.writeFileSync('C:/Users/HACel/Documents/T-SIGO/Proyectos/H-GESTION/INFORME_HIGIENE_DATOS.md', md);
    console.log(`Auditoría terminada. ${stats.anomalies} anomalías detectadas.`);
    console.log("Reporte generado en INFORME_HIGIENE_DATOS.md");
}

runAudit().catch(console.error);
