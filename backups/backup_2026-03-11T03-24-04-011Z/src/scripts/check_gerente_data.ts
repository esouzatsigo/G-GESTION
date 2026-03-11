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

async function checkGerente() {
    const docSnap = await getDoc(doc(db, 'usuarios', 'HjRs59PADerbXOuoXTuy'));
    if (docSnap.exists()) {
        console.log(JSON.stringify(docSnap.data(), null, 2));
    } else {
        console.log("Gerente no encontrado");
    }
}

checkGerente().then(() => process.exit(0)).catch(console.error);
