import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection, doc, getDoc } from "firebase/firestore";

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

async function checkClient() {
    try {
        const docRef = await getDoc(doc(db, 'clientes', '3de6K2GeasZhN2GIQWXw'));
        if (docRef.exists()) {
            console.log("Client Doc:", docRef.data());
        }

        const docRef2 = await getDoc(doc(db, 'clientes', 'BPT'));
        if (docRef2.exists()) {
            console.log("Client BPT:", docRef2.data());
        } else {
            console.log("BPT does not exist as a client document!");
        }

    } catch (e) {
        console.error(e);
    }
}

checkClient();
