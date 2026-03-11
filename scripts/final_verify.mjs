import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const configDev = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
};

const configTestBpt = {
    apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
    authDomain: "h-gestion-testbpt.firebaseapp.com",
    projectId: "h-gestion-testbpt",
};

async function verifyFinalIsolation() {
    const clients = [
        { name: 'BPT_GROUP (h-gestion-dev)', config: configDev },
        { name: 'TEST_BPT (h-gestion-testbpt)', config: configTestBpt }
    ];

    for (const c of clients) {
        console.log(`\nVerificando ${c.name}...`);
        const app = initializeApp(c.config, c.name);
        const db = getFirestore(app);
        
        const snapshot = await getDocs(collection(db, 'clientes'));
        const activeClients = snapshot.docs.map(doc => ({ id: doc.id, nombre: doc.data().nombre }));
        
        console.log(`   Clientes activos: ${activeClients.length}`);
        activeClients.forEach(client => console.log(`   - [${client.id}] ${client.nombre}`));
        
        const usuariosSnap = await getDocs(collection(db, 'usuarios'));
        console.log(`   Total usuarios: ${usuariosSnap.size}`);
    }
    process.exit(0);
}

verifyFinalIsolation();
