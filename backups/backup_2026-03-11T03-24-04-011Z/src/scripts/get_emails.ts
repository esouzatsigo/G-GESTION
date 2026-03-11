import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection, query, where } from "firebase/firestore";

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

const CORP_ID = 'kWRmv16DNfMUlSF1Yqiv'; // Corporativo Nacional

async function getEmails() {
    try {
        const usuarios = await getDocs(query(collection(db, 'usuarios'), where('clienteId', '==', CORP_ID)));
        usuarios.docs.forEach(usrDoc => {
            const data = usrDoc.data();
            console.log(`Rol: ${data.rol}, Nombre: ${data.nombre}, Email: ${data.email}, Especialidad: ${data.especialidad}`);
        });
    } catch (e) {
        console.error(e);
    }
}

getEmails();
