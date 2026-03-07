
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";

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

async function test() {
    console.log("Iniciando prueba de escritura...");
    try {
        const docRef = await addDoc(collection(db, "test_connection"), {
            timestamp: new Date().toISOString(),
            message: "Test from AI"
        });
        console.log("Documento escrito con ID:", docRef.id);

        const snapshot = await getDocs(collection(db, "test_connection"));
        console.log(`Documentos encontrados en 'test_connection': ${snapshot.size}`);
    } catch (e) {
        console.error("ERROR CRÍTICO:", e);
    }
}

test().then(() => process.exit(0)).catch(console.error);
