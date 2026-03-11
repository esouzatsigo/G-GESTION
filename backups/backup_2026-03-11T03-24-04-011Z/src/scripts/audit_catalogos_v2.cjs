
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
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

async function auditCatalogos() {
    console.log("🔍 AUDITANDO COLECCIÓN 'catalogos' PARA CROSS-TENANT Y DUPLICADOS...");

    const snap = await getDocs(collection(db, 'catalogos'));
    const catalogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const stats = {};
    const duplicates = [];
    const tenants = new Set();

    catalogs.forEach(cat => {
        tenants.add(cat.clienteId);
        const key = `${cat.clienteId}_${cat.categoria}_${cat.nombre.toLowerCase()}`;
        if (!stats[key]) {
            stats[key] = [];
        }
        stats[key].push(cat.id);
    });

    Object.keys(stats).forEach(key => {
        if (stats[key].length > 1) {
            duplicates.push({ key, ids: stats[key] });
        }
    });

    console.log(`\nTotal documentos en catalogos: ${catalogs.length}`);
    console.log(`Tenants detectados: ${Array.from(tenants).join(', ')}`);

    if (duplicates.length > 0) {
        console.log("\n❌ DUPLICADOS ENCONTRADOS DENTRO DEL MISMO TENANT:");
        duplicates.forEach(d => {
            console.log(`  - [${d.key}] -> IDs: ${d.ids.join(', ')}`);
        });
    } else {
        console.log("\n✅ No hay duplicados de Nombre/Categoría dentro del mismo Tenant.");
    }

    // Buscar si hay cruce de lógica: ¿Se están mostrando catálogos de otros clientes?
    // Analizaremos la distribución.
    const distribution = {};
    catalogs.forEach(cat => {
        distribution[cat.clienteId] = (distribution[cat.clienteId] || 0) + 1;
    });
    console.log("\nDistribución por ClienteId:", distribution);

    // Revisar específicamente el cliente TEST BPT (HocVkOhJBlw3JAulA0Gb)
    const testBptId = 'HocVkOhJBlw3JAulA0Gb';
    const bptCatalogs = catalogs.filter(c => c.clienteId === testBptId);
    console.log(`\nCatálogos para TEST BPT (${testBptId}): ${bptCatalogs.length}`);
    bptCatalogs.forEach(c => {
        console.log(`  - [${c.categoria}] ${c.nombre} (${c.nomenclatura})`);
    });
}

auditCatalogos().catch(console.error);
