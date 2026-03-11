
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, writeBatch } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
    authDomain: "h-gestion-testbpt.firebaseapp.com",
    projectId: "h-gestion-testbpt",
    storageBucket: "h-gestion-testbpt.firebasestorage.app",
    messagingSenderId: "385439061540",
    appId: "1:385439061540:web:95c1461abd46400724eab1",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CLIENTE_ID = '3de6K2GeasZhN2GIQWXw';
const FRANQUICIA_ID = '6FLWZQZAaudZG60UrLTY'; // Boston's
const OLD_SUCURSAL_ID = 'HocVkOhJBlw3JAulA0Gb';

async function fullMigration() {
    console.log("🚀 INICIANDO OPERACIÓN: ALTABRISA 2.0 (MODO CLEAN SLATE) 🚀");

    // 1. Crear la nueva sucursal limpia
    const newSucRef = await addDoc(collection(db, 'sucursales'), {
        nombre: "B Altabrisa - OFICIAL",
        nomenclatura: "B-ALT-01",
        clienteId: CLIENTE_ID,
        franquiciaId: FRANQUICIA_ID,
        direccion: "Plaza Altabrisa, Merida, Yuc.",
        coordenadas: { lat: 21.021, lng: -89.589 },
        activo: true,
        isCleanSlate: true,
        createdAt: new Date().toISOString()
    });
    const NEW_ID = newSucRef.id;
    console.log(`✅ NUEVA SUCURSAL CREADA: ${NEW_ID}`);

    // 2. Migrar Equipos
    console.log("📦 Migrando equipos...");
    const eqQuery = query(collection(db, 'equipos'), where('sucursalId', '==', OLD_SUCURSAL_ID));
    const eqSnap = await getDocs(eqQuery);
    
    let eqCount = 0;
    const batch = writeBatch(db);
    eqSnap.forEach(d => {
        batch.update(doc(db, 'equipos', d.id), { 
            sucursalId: NEW_ID,
            oldSucursalId: OLD_SUCURSAL_ID, // Backup por seguridad
            updatedAt: new Date().toISOString()
        });
        eqCount++;
    });
    
    // También buscar equipos que tengan el ID 'BA' (los "fantasmas")
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

    // 3. Migrar OTs
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

    // Migrar OTs fantasma ('BA')
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

    // 4. ELIMINAR LA SUCURSAL VIEJA
    console.log(`🗑️ Eliminando sucursal obsoleta ${OLD_SUCURSAL_ID}...`);
    await deleteDoc(doc(db, 'sucursales', OLD_SUCURSAL_ID));
    
    console.log("\n✨ OPERACIÓN COMPLETADA CON ÉXITO ✨");
    console.log(`ID NUEVO PARA CÓDIGO: ${NEW_ID}`);
    
    process.exit(0);
}

fullMigration().catch(console.error);
