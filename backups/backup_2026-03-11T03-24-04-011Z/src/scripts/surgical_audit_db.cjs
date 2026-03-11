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

async function runSurgicalAudit() {
    const collectionsToAudit = [
        'usuarios',
        'equipos',
        'ordenesTrabajo',
        'sucursales',
        'franquicias',
        'familias',
        'clientes'
    ];

    let auditReport = '# Reporte de Auditoría Quirúrgica de Base de Datos\n\n';
    auditReport += `Fecha: ${new Date().toLocaleString()}\n\n`;
    auditReport += '| Colección | Total Registros | Con clienteId | Sin clienteId | Estado |\n';
    auditReport += '| :--- | :--- | :--- | :--- | :--- |\n';

    let globalIssues = 0;

    for (const collName of collectionsToAudit) {
        console.log(`Auditando colección: ${collName}...`);
        const snap = await getDocs(collection(db, collName));
        let total = 0;
        let withId = 0;
        let withoutId = 0;

        snap.forEach(doc => {
            total++;
            const data = doc.data();
            if (data.clienteId) {
                withId++;
            } else {
                // El propio catálogo de clientes no suele tener clienteId (es la raíz)
                if (collName !== 'clientes') {
                    withoutId++;
                } else {
                    withId++; // Para propósitos de reporte en clientes
                }
            }
        });

        const status = withoutId === 0 ? '✅ LIMPIO' : '🚨 ANOMALÍAS';
        if (withoutId > 0) globalIssues += withoutId;

        auditReport += `| ${collName} | ${total} | ${withId} | ${withoutId} | ${status} |\n`;
    }

    auditReport += `\n\n**Total de Anomalías Detectadas:** ${globalIssues}\n`;

    if (globalIssues === 0) {
        auditReport += '\n> [!NOTE]\n';
        auditReport += '> La base de datos se encuentra íntegra en cuanto a aislamiento de clientes (clienteId).\n';
    } else {
        auditReport += '\n> [!WARNING]\n';
        auditReport += '> Se han detectado registros huérfanos de clienteId que requieren atención inmediata.\n';
    }

    fs.writeFileSync('C:/Users/HACel/.gemini/antigravity/brain/b3a3e1a6-1006-4f56-9ccb-a5ac5642923a/auditoria_quirurgica_database.md', auditReport);
    console.log('AUDITORIA_COMPLETA: Reporte generado en auditoria_quirurgica_database.md');
}

runSurgicalAudit().then(() => process.exit(0));
