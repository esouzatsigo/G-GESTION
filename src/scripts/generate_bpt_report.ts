import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, query, where } from "firebase/firestore";
import * as fs from "fs";

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
        const sucursalesSnap = await getDocs(collection(db, 'sucursales'));
        const sucursales: Record<string, string> = {};
        sucursalesSnap.forEach(doc => { sucursales[doc.id] = doc.data().nombre; });

        let output = "## Relación de Usuarios BPT\n\n| Nombre | Correo (Contraseña) | Rol | Sucursal Asignada |\n|---|---|---|---|\n";
        const usuariosBpt = usersSnap.docs.map(d => d.data()).filter(u => u.clienteId === bptId && u.rol !== 'Admin General');

        usuariosBpt.forEach(u => {
            let sucN = u.sucursalesPermitidas ? u.sucursalesPermitidas.map((id: string) => sucursales[id] || id).join(', ') : 'N/A';
            output += `| ${u.nombre} | \`${u.email}\` | ${u.rol} | ${sucN} |\n`;
        });

        console.log("START_MARKDOWN");
        console.log(output);
        console.log("END_MARKDOWN");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
run();
