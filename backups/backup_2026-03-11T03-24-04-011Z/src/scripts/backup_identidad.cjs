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

async function createSurgicalBackup() {
    const backupDir = 'C:/Users/HACel/.gemini/antigravity/brain/b3a3e1a6-1006-4f56-9ccb-a5ac5642923a/backups';
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const collectionsToBackup = ['usuarios', 'sucursales', 'franquicias'];
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup_identidad_${timestamp}.json`);

    const backupData = {};

    console.log('--- INICIANDO BACKUP QUIRÚRGICO DE RANGO DE DATOS ---');

    for (const collName of collectionsToBackup) {
        console.log(`Backing up collection: ${collName}...`);
        const snap = await getDocs(collection(db, collName));
        backupData[collName] = [];

        snap.forEach(doc => {
            const data = doc.data();
            // Solo respaldamos registros que tengan clienteId pero les falte clienteNombre
            if (data.clienteId && !data.clienteNombre) {
                backupData[collName].push({ id: doc.id, ...data });
            }
        });
        console.log(`Colección ${collName}: ${backupData[collName].length} registros con impacto potencial respaldados.`);
    }

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`BACKUP_COMPLETO: Archivo generado en ${backupFile}`);
}

createSurgicalBackup().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
