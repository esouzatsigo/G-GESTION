import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection, query, where, writeBatch, doc } from "firebase/firestore";
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "h-gestion-dev.firebaseapp.com",
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "h-gestion-dev",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "h-gestion-dev.firebasestorage.app",
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "198928689880",
    appId: process.env.VITE_FIREBASE_APP_ID || "1:198928689880:web:7f90dcd33e710fcc7505ad"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function renameAdminRole() {
    try {
        console.log("Iniciando migración de rol 'Admin' a 'Admin General'...");
        const usuariosRef = collection(db, 'usuarios');
        const q = query(usuariosRef, where('rol', '==', 'Admin'));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("No se encontraron usuarios con rol 'Admin'.");
        } else {
            const batch = writeBatch(db);
            let count = 0;
            querySnapshot.forEach((document) => {
                batch.update(doc(db, 'usuarios', document.id), { rol: 'Admin General' });
                count++;
                console.log(`Usuario marcado para actualizar: ${document.id} (${document.data().nombre})`);
            });
            await batch.commit();
            console.log(`Migración completada. ${count} usuarios actualizados a 'Admin General'.`);
        }
    } catch (error) {
        console.error("Error durante la migración:", error);
    }
}

renameAdminRole();
