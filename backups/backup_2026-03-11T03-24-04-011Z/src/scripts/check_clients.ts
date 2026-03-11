import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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
    const c1 = await getDoc(doc(db, 'clientes', '3de6K2GeasZhN2GIQWXw'));
    const c2 = await getDoc(doc(db, 'clientes', 'kWRmv16DNfMUlSF1Yqiv'));

    console.log(`ID 1 (Gerente): ${c1.data()?.nombre}`);
    console.log(`ID 2 (Coord): ${c2.data()?.nombre}`);
}

checkClients().then(() => process.exit(0)).catch(console.error);
