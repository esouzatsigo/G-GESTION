/**
 * RESPALDO TOTAL DE FIRESTORE — Fase 1 de Aislamiento Físico
 * 
 * Exporta TODAS las colecciones de Firestore a archivos JSON individuales
 * en la carpeta backups/snapshot_YYYYMMDD_HHMMSS/
 * 
 * Ejecutar: node scripts/backup_full_firestore.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

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

// Todas las colecciones conocidas del sistema
const COLLECTIONS = [
    'clientes',
    'franquicias',
    'sucursales',
    'equipos',
    'ordenesTrabajo',
    'usuarios',
    'catalogos',
    'familias',
    'bitacora',
    'config',
    'preventivoPlan',
    'massiveBatchRecords',
    'massiveBatchChanges',
    'notificaciones',
    'entityChanges',
];

async function backupAll() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const ts = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const backupDir = join('backups', `snapshot_${ts}`);

    if (!existsSync('backups')) mkdirSync('backups');
    if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

    console.log(`\n🛡️  RESPALDO TOTAL DE FIRESTORE`);
    console.log(`   Proyecto: h-gestion-dev`);
    console.log(`   Fecha: ${now.toLocaleString()}`);
    console.log(`   Destino: ${backupDir}/\n`);

    const summary = {};
    let totalDocs = 0;

    for (const col of COLLECTIONS) {
        try {
            const snapshot = await getDocs(collection(db, col));
            const docs = [];

            snapshot.forEach(doc => {
                docs.push({ _id: doc.id, ...doc.data() });
            });

            const filePath = join(backupDir, `${col}.json`);
            writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');

            summary[col] = docs.length;
            totalDocs += docs.length;
            console.log(`   ✅ ${col}: ${docs.length} documentos`);
        } catch (err) {
            console.log(`   ⚠️  ${col}: Error — ${err.message}`);
            summary[col] = 'ERROR';
        }
    }

    // Escribir manifiesto
    const manifest = {
        proyecto: 'h-gestion-dev',
        fecha: now.toISOString(),
        totalDocumentos: totalDocs,
        colecciones: summary,
    };

    writeFileSync(join(backupDir, '_MANIFEST.json'), JSON.stringify(manifest, null, 2), 'utf-8');

    console.log(`\n   ═══════════════════════════════════`);
    console.log(`   📦 TOTAL: ${totalDocs} documentos respaldados`);
    console.log(`   📂 Ubicación: ${backupDir}/`);
    console.log(`   📋 Manifiesto: ${backupDir}/_MANIFEST.json`);
    console.log(`   ═══════════════════════════════════\n`);

    process.exit(0);
}

backupAll().catch(err => {
    console.error('❌ Error fatal durante el respaldo:', err);
    process.exit(1);
});
