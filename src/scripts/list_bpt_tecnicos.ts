import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
    storageBucket: "h-gestion-dev.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    try {
        const clientesRef = collection(db, 'clientes');
        const clientesSnap = await getDocs(clientesRef);
        let bptId = '';
        clientesSnap.forEach(doc => {
            const data = doc.data();
            if (data.nombre.toLowerCase().includes('bpt')) {
                bptId = doc.id;
            }
        });

        if (!bptId) {
            console.error("No se encontró cliente BPT.");
            process.exit(1);
        }

        const usersSnap = await getDocs(collection(db, 'usuarios'));

        console.log("=== RELACIÓN DE USUARIOS BPT ===");
        const usuariosBpt = usersSnap.docs.map(d => d.data()).filter(u => u.clienteId === bptId && u.rol === 'Tecnico');

        usuariosBpt.forEach(u => {
            console.log(`Nombre: ${u.nombre}`);
            console.log(`Correo: ${u.email}`);
            console.log(`Contraseña: ${u.email}`); // Le seteamos la misma
            console.log('-----------------------------------');
        });

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
