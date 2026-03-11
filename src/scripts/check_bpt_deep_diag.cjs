const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

async function verifyBPTData() {
    console.log("=== DIAGNÓSTICO PROFUNDO BPT GROUP (PRODUCCIÓN) ===");

    // 1. Dónde están los equipos?
    const qEq = query(collection(db, 'equipos'), where('clienteId', '==', CLIENTE_ID));
    const snapEq = await getDocs(qEq);
    console.log(`\nTotal Equipos BPT GROUP: ${snapEq.size}`);
    
    const countBySuc = {};
    snapEq.forEach(d => {
        const sid = d.data().sucursalId;
        countBySuc[sid] = (countBySuc[sid] || 0) + 1;
    });

    console.log("\nDistribución de equipos por sucursalId:");
    for (const [sid, count] of Object.entries(countBySuc)) {
        const qS = query(collection(db, 'sucursales'), where('__name__', '==', sid));
        const snapS = await getDocs(qS);
        const sName = snapS.empty ? `¡SUCURSAL BORRADA O FANTASMA! [${sid}]` : snapS.docs[0].data().nombre;
        console.log(` - ${count} equipos -> ${sName} (${sid})`);
    }

    // 2. Cómo están los usuarios de Altabrisa?
    const qUsr = query(collection(db, 'usuarios'), where('clienteId', '==', CLIENTE_ID));
    const snapUsr = await getDocs(qUsr);
    console.log(`\nRevisando permisos de los ${snapUsr.size} usuarios...`);
    
    snapUsr.forEach(d => {
        const u = d.data();
        if (u.sucursalesPermitidas && Array.isArray(u.sucursalesPermitidas)) {
            // Check if they have ANY known altabrisa ID (Old, Ghost, New)
            const hasGhost = u.sucursalesPermitidas.some(id => ['fmIQBqzkElTEY6nnj0c0', 'HocVkOhJBlw3JAulA0Gb', 'BA', 'Azbef4Og1nABbWAQdQvJ'].includes(id));
            const hasOfficial = u.sucursalesPermitidas.includes('mBGfKcTdcjsHeAX8X7Hz');
            const hasTestOfficial = u.sucursalesPermitidas.includes('HuwoZsAHef5kCZwCFirU'); // Cruzado!
            
            if (hasGhost || hasOfficial || hasTestOfficial || u.sucursalesPermitidas.includes('TODAS')) {
                 console.log(`[Usuario] ${u.nombre} (${d.id}) -> Permisos: [${u.sucursalesPermitidas.join(', ')}]`);
            }
        }
    });

    process.exit(0);
}

verifyBPTData().catch(console.error);
