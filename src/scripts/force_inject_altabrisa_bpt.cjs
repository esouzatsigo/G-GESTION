const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where, updateDoc, doc } = require('firebase/firestore');

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
const OFICIAL_ID = 'mBGfKcTdcjsHeAX8X7Hz'; // B Altabrisa - OFICIAL

async function fixGerenteAltabrisa() {
    console.log("=== BUSCANDO AL GERENTE DE ALTABRISA EN BPT GROUP ===");

    const qUsers = query(collection(db, 'usuarios'), where('clienteId', '==', CLIENTE_ID));
    const snapUsers = await getDocs(qUsers);
    
    let foundAndFixed = false;
    for (const d of snapUsers.docs) {
        const u = d.data();
        const lowerName = (u.nombre || '').toLowerCase();
        
        // Buscar usuarios que sean gerentes y tengan "altabrisa" o "ba" en el nombre
        if (u.rol === 'Gerente' && (lowerName.includes('altabrisa') || lowerName.includes(' ba '))) {
            console.log(`\n🔍 Usuario encontrado: ${u.nombre} (${d.id})`);
            console.log(`   Permisos actuales: [${u.sucursalesPermitidas ? u.sucursalesPermitidas.join(', ') : 'Ninguno'}]`);
            
            let permitidas = Array.isArray(u.sucursalesPermitidas) ? [...u.sucursalesPermitidas] : [];
            
            if (!permitidas.includes(OFICIAL_ID)) {
                permitidas.push(OFICIAL_ID);
                await updateDoc(doc(db, 'usuarios', d.id), {
                    sucursalesPermitidas: permitidas,
                    lastForcedRepair: new Date().toISOString()
                });
                console.log(`   ✅ SUCURSAL OFICIAL (${OFICIAL_ID}) INYECTADA CORRECTAMENTE.`);
                foundAndFixed = true;
            } else {
                console.log(`   ✨ El usuario ya tiene la sucursal Oficial asignada.`);
            }
        }
    }

    if (!foundAndFixed) {
        console.log("\n⚠️ No se encontró ningún gerente al que le faltara la sucursal de Altabrisa.");
    }

    process.exit(0);
}

fixGerenteAltabrisa().catch(console.error);
