
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc } = require('firebase/firestore');
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

async function saneamientoCatalogos(isDryRun = true) {
    const mode = isDryRun ? "DRY-RUN (Simulación)" : "EJECUCIÓN REAL";
    console.log(`\n🚀 INICIANDO SANEAMIENTO DE CATÁLOGOS - MODO: ${mode}\n`);

    const snap = await getDocs(collection(db, 'catalogos'));
    const allCatalogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const backup = [];
    const idsToDelete = [];
    const seen = new Set();
    const duplicatesFound = [];

    // Criterio de duplicidad: mismo Cliente, Categoría, Nombre y Nomenclatura
    allCatalogs.forEach(cat => {
        const key = `${cat.clienteId}_${cat.categoria}_${cat.nombre.toLowerCase()}_${cat.nomenclatura}`;
        if (seen.has(key)) {
            duplicatesFound.push(cat);
            idsToDelete.push(cat.id);
            backup.push({ action: 'DELETE', data: cat });
        } else {
            seen.add(key);
        }
    });

    console.log(`Total registros analizados: ${allCatalogs.length}`);
    console.log(`Registros duplicados detectados: ${duplicatesFound.length}`);

    if (duplicatesFound.length > 0) {
        let md = `# 🛡️ REPORTE DE SANEAMIENTO DE CATÁLOGOS\n\n`;
        md += `**Modo:** ${mode}\n`;
        md += `**Fecha:** ${new Date().toLocaleString()}\n`;
        md += `**Total duplicados encontrados:** ${duplicatesFound.length}\n\n`;
        md += `| Cliente | Categoría | Nombre | Nomenclatura | ID a Eliminar |\n`;
        md += `|---|---|---|---|---|\n`;

        duplicatesFound.forEach(cat => {
            md += `| ${cat.clienteId} | ${cat.categoria} | ${cat.nombre} | ${cat.nomenclatura} | ${cat.id} |\n`;
        });

        fs.writeFileSync('DRYRUN_SANEAMIENTO_CATALOGOS.md', md);
        fs.writeFileSync('BACKUP_CATALOGOS_DUPLICADOS.json', JSON.stringify(backup, null, 2));

        console.log(`\n✅ Reporte generado: DRYRUN_SANEAMIENTO_CATALOGOS.md`);
        console.log(`✅ Backup generado: BACKUP_CATALOGOS_DUPLICADOS.json`);

        if (!isDryRun) {
            console.log(`\n⚠️ Procediendo con la eliminación de ${idsToDelete.length} registros...`);
            for (const id of idsToDelete) {
                await deleteDoc(doc(db, 'catalogos', id));
                console.log(`   - Eliminado: ${id}`);
            }
            console.log("\n✅ SANEAMIENTO COMPLETADO.");
        }
    } else {
        console.log("\n✅ No se encontraron duplicados estructurales.");
    }
}

// Ejecutar Dry Run por defecto
saneamientoCatalogos(true).catch(console.error);
