import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection } from "firebase/firestore";

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

async function checkClients() {
    try {
        const snap = await getDocs(collection(db, 'clientes'));
        snap.forEach(doc => {
            console.log(`Cliente ID: ${doc.id}, Nombre: ${doc.data().nombre}`);
        });

    } catch (e) {
        console.error(e);
    }
}

checkClients();
