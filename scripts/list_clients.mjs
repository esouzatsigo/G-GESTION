import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const configDev = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
};

const app = initializeApp(configDev);
const db = getFirestore(app);

async function listAllClients() {
    console.log("=== LISTADO DE CLIENTES EN PRODUCCIÓN ===");
    const snapshot = await getDocs(collection(db, 'clientes'));
    snapshot.forEach(doc => {
        console.log(`ID: ${doc.id} | Nombre: ${doc.data().nombre}`);
    });
    process.exit(0);
}

listAllClients();
