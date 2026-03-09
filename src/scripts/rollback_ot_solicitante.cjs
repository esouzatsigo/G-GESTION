const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc } = require('firebase/firestore');
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

async function rollback(backupPath) {
    if (!fs.existsSync(backupPath)) {
        console.error('No se encontró el backup: ' + backupPath);
        return;
    }

    const data = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log('--- REVIRTIENDO CAMBIOS EN OTs ---');

    for (const record of data) {
        await updateDoc(doc(db, 'ordenesTrabajo', record.id), {
            solicitanteId: record.solicitanteId
        });
        console.log(`REVERTIDA: OT ${record.numero} (ID: ${record.id})`);
    }
    console.log('--- REVERSIÓN COMPLETADA ---');
}

const pathArg = process.argv[2];
if (pathArg) {
    rollback(pathArg).then(() => process.exit(0));
} else {
    console.log('Uso: node rollback_ot_solicitante.cjs <ruta_al_backup.json>');
    process.exit(1);
}
