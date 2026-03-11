import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const configDev = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
};

const app = initializeApp(configDev);
const db = getFirestore(app);

async function findCorporativo() {
    console.log("Buscando 'CORPORATIVO' en la base de datos...");
    const snapshot = await getDocs(collection(db, 'clientes'));
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.nombre && data.nombre.toUpperCase().includes('CORPORATIVO')) {
            console.log(`[ENCONTRADO] ID: ${doc.id}, Nombre: ${data.nombre}`);
        }
    });
    process.exit(0);
}

findCorporativo();
