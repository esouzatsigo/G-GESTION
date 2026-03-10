/**
 * SCRIPT DE RESPALDO TOTAL: H-GESTION
 * 
 * Este script realiza un volcado completo de todas las colecciones de Firestore
 * a archivos JSON legibles, organizados por fecha y hora.
 */

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// CONFIGURACIÓN
// ============================================================
const COLLECTIONS = [
    'clientes',
    'sucursales',
    'franquicias',
    'equipos',
    'familias',
    'usuarios',
    'catalogos',
    'bitacora',
    'ordenesTrabajo',
    'massiveBatchRecords',
    'massiveBatchChanges',
    'planPreventivo2026',
    'bitacoraPreventivos2026',
    'notificaciones',
    'config'
];

const BACKUP_ROOT = path.join(process.cwd(), 'backups');

// ============================================================
// LÓGICA DE RESPALDO
// ============================================================

async function runBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sessionDir = path.join(BACKUP_ROOT, `backup_${timestamp}`);

    console.log("📂 Iniciando Respaldo Total de Base de Datos...");
    console.log(`📍 Destino: ${sessionDir}\n`);

    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    const report: Record<string, number> = {};
    const fullBackupData: Record<string, any[]> = {};

    for (const collName of COLLECTIONS) {
        try {
            console.log(`   ⏳ Procesando colección: [${collName}]...`);
            const snap = await getDocs(collection(db, collName));
            const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Guardar archivo individual por colección (más fácil de manejar)
            const collFile = path.join(sessionDir, `${collName}.json`);
            fs.writeFileSync(collFile, JSON.stringify(docs, null, 2));

            report[collName] = docs.length;
            fullBackupData[collName] = docs;

            console.log(`      ✅ Completado: ${docs.length} registros.`);
        } catch (error) {
            console.error(`      ❌ Error en [${collName}]:`, error);
            report[collName] = -1;
        }
    }

    // Guardar un archivo maestro con TODO (Snapshot único)
    const masterFile = path.join(sessionDir, '_FULL_SNAPSHOT.json');
    fs.writeFileSync(masterFile, JSON.stringify(fullBackupData, null, 2));

    // Generar Reporte de Resumen
    const summaryFile = path.join(sessionDir, 'SUMMARY.txt');
    const summaryLines = [
        `H-GESTION DATABASE BACKUP REPORT`,
        `Fecha: ${new Date().toLocaleString()}`,
        `ID Sesión: backup_${timestamp}`,
        `----------------------------------------`,
        ...Object.entries(report).map(([name, count]) => `${name.padEnd(25)}: ${count === -1 ? 'ERROR' : count} docs`),
        `----------------------------------------`,
        `SNAPSHOT MAESTRO: _FULL_SNAPSHOT.json`
    ];
    fs.writeFileSync(summaryFile, summaryLines.join('\n'));

    console.log("\n✨ ¡Respaldo Finalizado con Éxito!");
    console.log(`📄 Resumen guardado en: ${summaryFile}`);
    console.log(`📦 Snapshot maestro: ${masterFile}\n`);

    process.exit(0);
}

runBackup().catch(err => {
    console.error("❌ ERROR CRÍTICO durante el respaldo:", err);
    process.exit(1);
});
