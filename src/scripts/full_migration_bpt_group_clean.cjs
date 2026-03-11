
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, writeBatch } = require('firebase/firestore');

// CONFIGURACIÓN EXPLÍCITA DE BPT GROUP (DEV)
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

const CLIENTE_ID = 'HXIjyDoFvWl00Qs29QPw';
const OLD_SUCURSAL_ID = 'fmIQBqzkElTEY6nnj0c0';

async function fullMigrationBPTGroup() {
    console.log("🚀 INICIANDO OPERACIÓN: ALTABRISA 2.0 (BPT GROUP - PROD/DEV) 🚀");

    // 1. Obtener Franquicia ID (Boston's) de la sucursal vieja
    const oldSucSnap = await getDocs(query(collection(db, 'sucursales'), where('clienteId', '==', CLIENTE_ID)));
    const oldSucData = oldSucSnap.docs.find(d => d.id === OLD_SUCURSAL_ID)?.data();
    
    if (!oldSucData) {
        console.error("❌ No se encontró la sucursal origenfmIQBqzkElTEY6nnj0c0");
        process.exit(1);
    }

    const FRANQUICIA_ID = oldSucData.franquiciaId;
    console.log(`✅ Franquicia ID identificada: ${FRANQUICIA_ID}`);

    // 2. Crear la nueva sucursal limpia
    const newSucRef = await addDoc(collection(db, 'sucursales'), {
        nombre: "B Altabrisa - OFICIAL",
        nomenclatura: "B-ALT-01",
        clienteId: CLIENTE_ID,
        franquiciaId: FRANQUICIA_ID,
        direccion: oldSucData.direccion || "Plaza Altabrisa, Merida, Yuc.",
        coordenadas: oldSucData.coordenadas || { lat: 21.021, lng: -89.589 },
        activo: true,
        isCleanSlate: true,
        createdAt: new Date().toISOString()
    });
    const NEW_ID = newSucRef.id;
    console.log(`✅ NUEVA SUCURSAL CREADA EN BPT GROUP: ${NEW_ID}`);

    // 3. Migrar Equipos
    console.log("📦 Migrando equipos...");
    const eqQuery = query(collection(db, 'equipos'), where('sucursalId', '==', OLD_SUCURSAL_ID));
    const eqSnap = await getDocs(eqQuery);
    
    let eqCount = 0;
    const batch = writeBatch(db);
    eqSnap.forEach(d => {
        batch.update(doc(db, 'equipos', d.id), { 
            sucursalId: NEW_ID,
            oldSucursalId: OLD_SUCURSAL_ID,
            updatedAt: new Date().toISOString()
        });
        eqCount++;
    });
    
    // Equipos fantasma 'BA' en BPT GROUP
    const ghostEqQuery = query(collection(db, 'equipos'), where('sucursalId', '==', 'BA'));
    const ghostEqSnap = await getDocs(ghostEqQuery);
    ghostEqSnap.forEach(d => {
        batch.update(doc(db, 'equipos', d.id), { 
            sucursalId: NEW_ID,
            fixedFromGhost: true,
            updatedAt: new Date().toISOString()
        });
        eqCount++;
    });

    await batch.commit();
    console.log(`✅ ${eqCount} EQUIPOS MIGRADOS.`);

    // 4. Migrar OTs
    console.log("🎫 Migrando OTs...");
    const otQuery = query(collection(db, 'ordenesTrabajo'), where('sucursalId', '==', OLD_SUCURSAL_ID));
    const otSnap = await getDocs(otQuery);
    
    let otCount = 0;
    const otBatch = writeBatch(db);
    otSnap.forEach(d => {
        otBatch.update(doc(db, 'ordenesTrabajo', d.id), { 
            sucursalId: NEW_ID
        });
        otCount++;
    });

    const ghostOtQuery = query(collection(db, 'ordenesTrabajo'), where('sucursalId', '==', 'BA'));
    const ghostOtSnap = await getDocs(ghostOtQuery);
    ghostOtSnap.forEach(d => {
        otBatch.update(doc(db, 'ordenesTrabajo', d.id), { 
            sucursalId: NEW_ID
        });
        otCount++;
    });

    await otBatch.commit();
    console.log(`✅ ${otCount} ORDENES DE TRABAJO MIGRADAS.`);

    // 5. ELIMINAR LA SUCURSAL VIEJA
    console.log(`🗑️ Eliminando sucursal obsoleta ${OLD_SUCURSAL_ID}...`);
    await deleteDoc(doc(db, 'sucursales', OLD_SUCURSAL_ID));
    
    console.log("\n✨ OPERACIÓN BPT GROUP COMPLETADA CON ÉXITO ✨");
    console.log(`ID NUEVO PARA CÓDIGO (BPT GROUP): ${NEW_ID}`);
    
    process.exit(0);
}

fullMigrationBPTGroup().catch(console.error);
