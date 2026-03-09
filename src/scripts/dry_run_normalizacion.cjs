const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');
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

async function runDryRun() {
    console.log('--- INICIANDO DRY-RUN DE NORMALIZACIÓN ---');

    // Obtener nombres de clientes para el mapeo
    const clientesSnap = await getDocs(collection(db, 'clientes'));
    const mapping = {};
    clientesSnap.forEach(d => mapping[d.id] = d.data().nombre);

    const collections = ['usuarios', 'sucursales', 'franquicias'];
    let report = '# Reporte DRY-RUN de Normalización de Identidad\n\n';
    report += '| Colección | ID Documento | Acción | Nombre a Inyectar |\n';
    report += '| :--- | :--- | :--- | :--- |\n';

    for (const coll of collections) {
        const snap = await getDocs(collection(db, coll));
        snap.forEach(d => {
            const data = d.data();
            if (data.clienteId && !data.clienteNombre) {
                const targetName = mapping[data.clienteId] || 'CLIENTE DESCONOCIDO';
                report += `| ${coll} | ${d.id} | UPDATE (add clienteNombre) | ${targetName} |\n`;
                console.log(`DRY-RUN: ${coll}/${d.id} -> ${targetName}`);
            }
        });
    }

    fs.writeFileSync('C:/Users/HACel/.gemini/antigravity/brain/b3a3e1a6-1006-4f56-9ccb-a5ac5642923a/dry_run_normalizacion.md', report);
    console.log('DRY-RUN COMPLETO. Reporte generado.');
}

runDryRun().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
