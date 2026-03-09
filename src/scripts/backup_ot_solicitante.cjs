const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

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

async function backupAndDryRun() {
    const backupDir = 'C:/Users/HACel/.gemini/antigravity/brain/b3a3e1a6-1006-4f56-9ccb-a5ac5642923a/backups';
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup_ot_solicitante_${timestamp}.json`);
    const dryRunReport = path.join(backupDir, `dry_run_ot_solicitante_${timestamp}.md`);

    const otsSnap = await getDocs(collection(db, 'ordenesTrabajo'));
    const backupData = [];
    let reportContent = '# Reporte Dry-Run: Saneamiento de Solicitante en OTs (Branch BA)\n\n';
    reportContent += '| OT Numero | Doc ID | Estado Actual | Nuevo Solicitante (Gerente Altabrisa) |\n';
    reportContent += '| :--- | :--- | :--- | :--- |\n';

    console.log('--- INICIANDO BACKUP Y DRY-RUN ---');

    otsSnap.forEach(doc => {
        const data = doc.data();
        if (data.solicitanteId === 'SYSTEM_PLANNER' && data.sucursalId === 'BA') {
            backupData.push({ id: doc.id, ...data });
            reportContent += `| ${data.numero || 'S/N'} | ${doc.id} | SYSTEM_PLANNER | HjRs59PADerbXOuoXTuy |\n`;
        }
    });

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    fs.writeFileSync(dryRunReport, reportContent);

    console.log(`BACKUP COMPLETO: ${backupData.length} registros respaldados en ${backupFile}`);
    console.log(`DRY-RUN GENERADO: ${dryRunReport}`);
}

backupAndDryRun().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
