import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import * as fs from 'fs';

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

async function findUsers() {
    // 1. Find Client ID for CORPORATIVO NACIONAL
    const cliSnap = await getDocs(query(collection(db, 'clientes'), where('nombre', '==', 'CORPORATIVO NACIONAL')));
    if (cliSnap.empty) {
        console.log("No se encontró el cliente CORPORATIVO NACIONAL");
        return;
    }
    const corpId = cliSnap.docs[0].id;
    console.log(`Cliente: CORPORATIVO NACIONAL (ID: ${corpId})`);

    // 2. List all users for this client
    const userSnap = await getDocs(query(collection(db, 'usuarios'), where('clienteId', '==', corpId)));
    const users = userSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    let out = `Usuarios de CORPORATIVO NACIONAL (${corpId}):\n`;
    users.forEach(u => {
        out += `- ID: ${u.id} | Email: ${u.email} | Nombre: ${u.nombre} | Rol: ${u.rol} | Especialidad: ${u.especialidad}\n`;
    });

    fs.writeFileSync('src/scripts/cleanup_candidates.txt', out);
    console.log("Candidatos guardados en src/scripts/cleanup_candidates.txt");
}

findUsers().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
