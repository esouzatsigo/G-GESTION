import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection, query, where, doc, updateDoc } from "firebase/firestore";

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

const BPT_ID = '3de6K2GeasZhN2GIQWXw';

async function updatePasswords() {
    try {
        console.log("Iniciando reseteo de contraseñas de interfaz (contrasena) en Firestore para TEST BPT...");
        const usuarios = await getDocs(query(collection(db, 'usuarios'), where('clienteId', '==', BPT_ID)));
        const updates = [];

        usuarios.docs.forEach(usrDoc => {
            console.log(`Actualizando contraseña (BD) del usuario: ${usrDoc.data().nombre} (${usrDoc.data().email})`);
            updates.push(updateDoc(doc(db, 'usuarios', usrDoc.id), { contrasena: '12345678' }));
        });

        await Promise.all(updates);
        console.log("Contraseñas (referencia en BD) actualizadas a 12345678 para TEST BPT.");

    } catch (e) {
        console.error("Error reseteando contraseñas", e);
    }
}

updatePasswords();
