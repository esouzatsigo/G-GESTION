
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

async function deepDatabaseAudit() {
    console.log("🔍 INICIANDO AUDITORÍA FORENSE 360° DE TODA LA BASE DE DATOS...");

    const collections = ['clientes', 'franquicias', 'sucursales', 'usuarios', 'equipos', 'ordenesTrabajo', 'catalogos'];
    const report = {
        meta: { fecha: new Date().toISOString(), totalHallazgos: 0 },
        hallazgos: []
    };

    // Cargar Catálogos de Referencia para validación cruzada
    const registry = {};
    for (const coll of collections) {
        console.log(`Reading ${coll}...`);
        const snap = await getDocs(collection(db, coll));
        registry[coll] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    const clienteIds = new Set(registry.clientes.map(c => c.id));
    const franquiciaIds = new Set(registry.franquicias.map(f => f.id));
    const sucursalIds = new Set(registry.sucursales.map(s => s.id));
    const usuarioIds = new Set(registry.usuarios.map(u => u.id));
    const equipoIds = new Set(registry.equipos.map(e => e.id));

    // 1. Validar Usuarios
    registry.usuarios.forEach(u => {
        if (!u.clienteId || !clienteIds.has(u.clienteId)) {
            report.hallazgos.push({ tipo: 'SEGURIDAD', entidad: 'usuario', id: u.id, nombre: u.nombre, detalle: `clienteId inválido o inexistente: ${u.clienteId}` });
        }
    });

    // 2. Validar Sucursales
    registry.sucursales.forEach(s => {
        if (!s.clienteId || !clienteIds.has(s.clienteId)) {
            report.hallazgos.push({ tipo: 'INTEGRIDAD', entidad: 'sucursal', id: s.id, nombre: s.nombre, detalle: `clienteId inválido: ${s.clienteId}` });
        }
        if (s.franquiciaId && !franquiciaIds.has(s.franquiciaId) && s.franquiciaId !== 'NONE') {
            report.hallazgos.push({ tipo: 'INTEGRIDAD', entidad: 'sucursal', id: s.id, nombre: s.nombre, detalle: `franquiciaId huérfano: ${s.franquiciaId}` });
        }
    });

    // 3. Validar Equipos
    registry.equipos.forEach(e => {
        if (!e.clienteId || !clienteIds.has(e.clienteId)) {
            report.hallazgos.push({ tipo: 'INTEGRIDAD', entidad: 'equipo', id: e.id, nombre: e.nombre, detalle: `clienteId inválido: ${e.clienteId}` });
        }
        if (!e.sucursalId || !sucursalIds.has(e.sucursalId)) {
            report.hallazgos.push({ tipo: 'INTEGRIDAD', entidad: 'equipo', id: e.id, nombre: e.nombre, detalle: `sucursalId inválido (Posible cruce): ${e.sucursalId}` });
        }
        // Verificar cruce de Tenant entre Equipo y Sucursal
        const suc = registry.sucursales.find(s => s.id === e.sucursalId);
        if (suc && suc.clienteId !== e.clienteId) {
            report.hallazgos.push({ tipo: 'CRÍTICO', entidad: 'equipo', id: e.id, nombre: e.nombre, detalle: `CRUCE DE TENANT: Equipo es de ${e.clienteId} pero Sucursal es de ${suc.clienteId}` });
        }
    });

    // 4. Validar OTs
    registry.ordenesTrabajo.forEach(ot => {
        if (!clienteIds.has(ot.clienteId)) {
            report.hallazgos.push({ tipo: 'INTEGRIDAD', entidad: 'OT', id: ot.id, numero: ot.numero, detalle: `clienteId inexistente: ${ot.clienteId}` });
        }
        if (ot.sucursalId && !sucursalIds.has(ot.sucursalId)) {
            report.hallazgos.push({ tipo: 'INTEGRIDAD', entidad: 'OT', id: ot.id, numero: ot.numero, detalle: `sucursalId huerfano: ${ot.sucursalId}` });
        }
        if (ot.equipoId && !equipoIds.has(ot.equipoId)) {
            report.hallazgos.push({ tipo: 'INTEGRIDAD', entidad: 'OT', id: ot.id, numero: ot.numero, detalle: `equipoId huerfano: ${ot.equipoId}` });
        }
        if (ot.solicitanteId && !usuarioIds.has(ot.solicitanteId) && !['SYSTEM', 'SYSTEM_PLANNER', 'Gerente.BA'].includes(ot.solicitanteId)) {
            report.hallazgos.push({ tipo: 'INTEGRIDAD', entidad: 'OT', id: ot.id, numero: ot.numero, detalle: `solicitanteId inexistente: ${ot.solicitanteId}` });
        }
    });

    report.meta.totalHallazgos = report.hallazgos.length;
    fs.writeFileSync('AUDITORIA_FORENSE_TOTAL.json', JSON.stringify(report, null, 2));

    // Generar MD
    let md = "# 🛡️ REPORTE DE AUDITORÍA FORENSE TOTAL (360°)\n\n";
    md += `**Fecha:** ${new Date().toLocaleString()}\n`;
    md += `**Total Hallazgos Detectados:** ${report.meta.totalHallazgos}\n\n`;

    if (report.hallazgos.length === 0) {
        md += "## ✅ INTEGRIDAD ABSOLUTA CONFIRMADA\nNo se encontraron inconsistencias en la base de datos.";
    } else {
        md += "## ⚠️ Hallazgos por Gravedad\n\n";
        const criticos = report.hallazgos.filter(h => h.tipo === 'CRÍTICO');
        if (criticos.length > 0) {
            md += "### 💣 CRÍTICOS (Cruce de Tenant / Seguridad)\n";
            criticos.forEach(h => md += `- [${h.entidad.toUpperCase()}] ID: ${h.id} - ${h.nombre || ('OT ' + h.numero)}: **${h.detalle}**\n`);
        }

        const integridad = report.hallazgos.filter(h => h.tipo === 'INTEGRIDAD' || h.tipo === 'SEGURIDAD');
        if (integridad.length > 0) {
            md += "\n### 🛠️ Integridad (Dependencias Rotas)\n";
            integridad.slice(0, 50).forEach(h => md += `- [${h.entidad.toUpperCase()}] ${h.id}: ${h.detalle}\n`);
            if (integridad.length > 50) md += `\n*...y ${integridad.length - 50} hallazgos más (ver JSON).*`;
        }
    }

    fs.writeFileSync('AUDITORIA_FORENSE_TOTAL.md', md);
    console.log(`\n✅ AUDITORÍA COMPLETADA. Hallazgos: ${report.meta.totalHallazgos}`);
    console.log("Revisa AUDITORIA_FORENSE_TOTAL.md para el detalle.");
}

deepDatabaseAudit().catch(console.error);
