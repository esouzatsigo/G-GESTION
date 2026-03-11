const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, deleteDoc, doc, updateDoc, writeBatch } = require('firebase/firestore');

const devConfig = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
    storageBucket: "h-gestion-dev.firebasestorage.app",
    messagingSenderId: "198928689880",
    appId: "1:198928689880:web:7f90dcd33e710fcc7505ad",
};

const testConfig = {
    apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
    authDomain: "h-gestion-testbpt.firebaseapp.com",
    projectId: "h-gestion-testbpt",
    storageBucket: "h-gestion-testbpt.firebasestorage.app",
    messagingSenderId: "385439061540",
    appId: "1:385439061540:web:95c1461abd46400724eab1",
};

async function purgeAndStandardize(config, envName) {
    console.log(`\n=== 🔥 PURGA DEFINITIVA DE CATÁLOGOS: ${envName} ===`);
    const app = initializeApp(config, envName);
    const db = getFirestore(app);

    // 1. Agrupar familias por nombre para detectar duplicados
    const snapFam = await getDocs(collection(db, 'familias'));
    const groups = {};
    
    snapFam.forEach(d => {
        const data = d.data();
        const name = (data.nombre || data.nomenclatura || '').trim();
        if (!name) return;
        
        if (!groups[name]) groups[name] = [];
        groups[name].push({ id: d.id, ...data });
    });

    const masterMap = {}; // nombre -> ID_Ganador
    const toDelete = [];

    console.log("Analizando grupos de familias...");
    for (const name in groups) {
        const instances = groups[name];
        // El "Ganador" será el primero que encontremos (o uno específico si ya lo conocemos)
        const winner = instances[0];
        masterMap[name] = winner.id;
        
        if (instances.length > 1) {
            console.log(`⚠️ Familia Duplicada: "${name}" (${instances.length} versiones)`);
            console.log(`   🏆 Ganador: ${winner.id}`);
            for (let i = 1; i < instances.length; i++) {
                console.log(`   🗑️ Para eliminar: ${instances[i].id}`);
                toDelete.push(instances[i].id);
            }
        }
    }

    if (toDelete.length === 0) {
        console.log("✅ No se encontraron duplicados en la colección de familias.");
    } else {
        // 2. Asegurar que NINGÚN equipo use los IDs que vamos a borrar
        console.log("\nRe-vinculando todos los equipos al catálogo Maestro...");
        const snapEq = await getDocs(collection(db, 'equipos'));
        let eqFixed = 0;
        
        for (const deq of snapEq.docs) {
            const eq = deq.data();
            const currentFamId = eq.familiaId;
            
            // Buscar si el ID actual es uno de los destinados a morir
            const isBadId = toDelete.includes(currentFamId);
            
            // Si el equipo no tiene familiaId pero tiene familia (nombre), también lo arreglamos
            if (isBadId || !currentFamId) {
                const nameKey = eq.familia || (snapFam.docs.find(f => f.id === currentFamId)?.data().nombre);
                const correctId = masterMap[nameKey];
                
                if (correctId && correctId !== currentFamId) {
                    await updateDoc(doc(db, 'equipos', deq.id), {
                        familiaId: correctId
                    });
                    eqFixed++;
                }
            }
        }
        console.log(`🔧 ${eqFixed} equipos re-vinculados.`);

        // 3. Proceder al BORRADO FÍSICO de los duplicados
        console.log(`\nEjecutando borrado de ${toDelete.length} registros duplicados...`);
        for (const badId of toDelete) {
            await deleteDoc(doc(db, 'familias', badId));
        }
        console.log("✅ Borrado completado.");
    }
}

async function run() {
    await purgeAndStandardize(devConfig, "BPT GROUP (DEV)");
    await purgeAndStandardize(testConfig, "TEST BPT");
    console.log("\n✨ LA BASE DE DATOS ESTÁ AHORA 100% LIMPIA DE DUPLICADOS.");
    process.exit(0);
}

run().catch(console.error);
