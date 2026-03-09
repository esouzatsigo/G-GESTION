const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, collection, getDocs } = require('firebase/firestore');
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

/** 
 * Script de Recuperación: Restaura los datos desde el último backup realizado 
 * por backup_identidad.cjs.
 */
async function rollbackModification(backupPath) {
    if (!fs.existsSync(backupPath)) {
        console.error('ERROR: No se encontró el archivo de backup en ' + backupPath);
        return;
    }

    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log('--- INICIANDO PROCESO DE REVERSIÓN ---');

    for (const collName in backupData) {
        console.log(`Revirtiendo colección ${collName}...`);
        for (const record of backupData[collName]) {
            const docRef = doc(db, collName, record.id);
            // Restauramos el estado original (eliminando clienteNombre si no existía)
            const restoreData = { ...record };
            delete restoreData.id;

            await updateDoc(docRef, restoreData);
            console.log(`REVERTIDO: ${collName}/${record.id}`);
        }
    }
    console.log('--- REVERSIÓN FINALIZADA CON ÉXITO ---');
}

// Para usar: node rollback.cjs <ruta_al_json>
const argPath = process.argv[2];
if (argPath) {
    rollbackModification(argPath).then(() => process.exit(0));
} else {
    console.log('Uso: node restore_identidad.cjs <ruta_al_backup.json>');
    process.exit(1);
}
