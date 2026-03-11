
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const GERENTE_ALTABRISA_ID = "empiiN18VlLXZlXq45i4"; // Gerente BP Altabrisa
const SUCURSAL_ALTABRISA_ID = "21lgUGdfGA5OBjVMo1ee"; // ID Real de Altabrisa en Firebase
const CLIENTE_TEST_BPT = "3de6K2GeasZhN2GIQWXw";

async function prepareSaneamientoDeep() {
    console.log("--- FASE 1: AUDITORÍA DE ACERO Y BACKUP ---");

    const [otsSnap, bitSnap, eqsSnap, sucsSnap] = await Promise.all([
        getDocs(collection(db, 'ordenesTrabajo')),
        getDocs(collection(db, 'bitacora')),
        getDocs(collection(db, 'equipos')),
        getDocs(collection(db, 'sucursales'))
    ]);

    const ots = otsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const bitEntries = bitSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const eqs = eqsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const sucs = sucsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    fs.writeFileSync('BACKUP_OT_PRE_SANEAMIENTO.json', JSON.stringify(ots, null, 2));

    const changes = [];
    let count = 0;

    for (const ot of ots) {
        let needsUpdate = false;
        const updateData = {};

        // 1. RECONEXIÓN DE SOLICITANTE (Regla Héctor: Invariablemente el Gerente de la sucursal)
        // Detectamos si el solicitanteId es un shortcode o no es el ID real del gerente
        if (ot.clienteId === CLIENTE_TEST_BPT && (ot.solicitanteId === 'Gerente.BA' || ot.solicitanteId === 'SYSTEM_PLANNER' || !ot.solicitanteId)) {
            updateData.solicitanteId = GERENTE_ALTABRISA_ID;
            needsUpdate = true;
        }

        // 2. RECONEXIÓN DE SUCURSAL
        if (ot.clienteId === CLIENTE_TEST_BPT && (ot.sucursalId === 'BA' || !ot.sucursalId)) {
            updateData.sucursalId = SUCURSAL_ALTABRISA_ID;
            needsUpdate = true;
        }

        // 3. RECONEXIÓN DE EQUIPO (Regla Héctor: Cruzar con Bitácora o Familia)
        const currentEq = eqs.find(e => e.id === ot.equipoId);
        if (!ot.equipoId || (currentEq && currentEq.nombre === "Equipo sin nombre")) {

            // MÉTODO A: BITÁCORA
            const history = bitEntries.filter(b =>
                b.entidadId === ot.id ||
                (b.detalles && JSON.stringify(b.detalles).includes(ot.id)) ||
                (b.detalles && JSON.stringify(b.detalles).includes(ot.numero.toString()))
            );

            let foundEqId = null;
            for (const entry of history) {
                const det = entry.detalles || {};
                // Buscar equipoId en los logs de creación o edición
                const str = JSON.stringify(det);
                const matches = str.match(/[a-zA-Z0-9]{20}/g); // Buscar IDs candidatos
                if (matches) {
                    for (const candidateId of matches) {
                        const candidateEq = eqs.find(e => e.id === candidateId && e.nombre !== "Equipo sin nombre");
                        if (candidateEq) {
                            foundEqId = candidateId;
                            break;
                        }
                    }
                }
                if (foundEqId) break;
            }

            // MÉTODO B: FALLBACK POR FAMILIA (Deducción lógica de Héctor)
            if (!foundEqId) {
                // Intentamos deducir la familia si no la tiene la OT (algunas OTs viejas no la traen)
                const familiaDeducida = ot.familia || (currentEq ? currentEq.familia : null);
                if (familiaDeducida) {
                    const fallbackEq = eqs.find(e =>
                        e.sucursalId === SUCURSAL_ALTABRISA_ID &&
                        e.familia === familiaDeducida &&
                        e.nombre !== "Equipo sin nombre"
                    );
                    if (fallbackEq) foundEqId = fallbackEq.id;
                }
            }

            if (foundEqId && foundEqId !== ot.equipoId) {
                updateData.equipoId = foundEqId;
                needsUpdate = true;
            }
        }

        if (needsUpdate) {
            count++;
            changes.push({
                ot: ot.numero,
                id: ot.id,
                before: {
                    solicitanteId: ot.solicitanteId,
                    equipoId: ot.equipoId,
                    sucursalId: ot.sucursalId
                },
                after: updateData
            });
        }
    }

    fs.writeFileSync('DRY_RUN_SANEAMIENTO.json', JSON.stringify(changes, null, 2));

    let resumen = `# REPORTE DE SANEAMIENTO PROFUNDO (DRY-RUN)\n\n`;
    resumen += `**OTs Candidatas a Re-conexión:** ${count}\n\n`;
    resumen += `| OT # | Cambios Propuestos |\n`;
    resumen += `|------|--------------------|\n`;

    changes.forEach(c => {
        const mods = [];
        if (c.after.solicitanteId) mods.push(`Solicitante -> ${c.after.solicitanteId}`);
        if (c.after.sucursalId) mods.push(`Sucursal -> ${c.after.sucursalId}`);
        if (c.after.equipoId) mods.push(`Equipo -> ${c.after.equipoId}`);
        resumen += `| ${c.ot} | ${mods.join("<br>")} |\n`;
    });

    fs.writeFileSync('C:/Users/HACel/Documents/T-SIGO/Proyectos/H-GESTION/RESUMEN_SANEAMIENTO.md', resumen);
    console.log(`Dry-run completado. ${count} cambios planeados.`);
}

prepareSaneamientoDeep().catch(console.error);
