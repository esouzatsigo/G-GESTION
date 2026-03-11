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

async function checkAllGerentes() {
    console.log("=== TODOS LOS GERENTES EN BPT GROUP ===");

    const qUsers = query(collection(db, 'usuarios'), where('clienteId', '==', CLIENTE_ID));
    const snapUsers = await getDocs(qUsers);
    
    for (const d of snapUsers.docs) {
        const u = d.data();
        if (u.rol === 'Gerente') {
            console.log(`\n- Nombre: ${u.nombre}`);
            console.log(`  ID: ${d.id}`);
            console.log(`  Permisos: [${u.sucursalesPermitidas ? u.sucursalesPermitidas.join(', ') : 'VACÍO'}]`);
            
            // Asignar forzosamente el ID oficial si el nombre dice altabrisa y no lo tiene
            const lowerName = (u.nombre || '').toLowerCase();
            if (lowerName.includes('altabrisa')) {
                let permitidas = Array.isArray(u.sucursalesPermitidas) ? [...u.sucursalesPermitidas] : [];
                if (!permitidas.includes(OFICIAL_ID)) {
                    permitidas.push(OFICIAL_ID);
                    await updateDoc(doc(db, 'usuarios', d.id), {
                        sucursalesPermitidas: permitidas
                    });
                    console.log(`  ✅ **SE REPARÓ EN ESTE INSTANTE**: Se le asignó el ID Oficial de BPT Group (${OFICIAL_ID})`);
                }
            }
        }
    }

    process.exit(0);
}

checkAllGerentes().catch(console.error);
