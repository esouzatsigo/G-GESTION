import { initializeApp } from "firebase/app";
import { getFirestore, doc, deleteDoc } from "firebase/firestore";

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

const idsToDelete = [
    "5JAtyJkV2VK5WGLz2VVv", // Especialista Externo Refrigeracion (Duplicate)
    "RzG3Q557cHM8ERcUZ9n7", // Especialista Refrigeracion (Duplicate)
    "dz2sNRXMNHyQ4dYSUt4S", // Tecnico Altabrisa (Duplicate)
    "FidQ46TcMSh7VLWFacgT", // Tecnico Interno B Altabrisa (Duplicate/Mismatch)
    "xHXoRwer8TQOwn4jKWTD", // Tecnico Interno Caucel
    "tecnico_caucel_bpt",  // Tecnico Caucel BPT
    "SME341PpWEz9vLF5uvjU"  // Tecnico Caucel
];

async function cleanup() {
    console.log(`Iniciando limpieza quirúrgica de ${idsToDelete.length} usuarios...`);
    for (const id of idsToDelete) {
        await deleteDoc(doc(db, 'usuarios', id));
        console.log(`[X] Eliminado: ${id}`);
    }
    console.log("Limpieza completada.");
}

cleanup().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
