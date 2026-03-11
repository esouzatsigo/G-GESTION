import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import * as fs from 'fs';

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

async function audit() {
    let out = "=== Auditoría de Roles vs Usuarios ===\n";
    const catSnap = await getDocs(query(collection(db, 'catalogos'), where('categoria', '==', 'Rol')));
    const rolesCatalogo = Array.from(new Set(catSnap.docs.map(d => d.data().nombre)));
    out += `Roles en Catálogos: ${JSON.stringify(rolesCatalogo)}\n\n`;

    const userSnap = await getDocs(collection(db, 'usuarios'));
    const usuarios = userSnap.docs.map(d => ({ id: d.id, rol: d.data().rol, nombre: d.data().nombre, email: d.data().email }));

    const orphans = usuarios.filter(u => !rolesCatalogo.includes(u.rol));
    out += `Usuarios huérfanos encontrados: ${orphans.length}\n`;
    orphans.forEach(u => {
        out += `- ${u.nombre} (${u.email}) -> Rol Actual: "${u.rol}"\n`;
    });

    fs.writeFileSync('src/scripts/audit_out.txt', out);
    console.log("Auditoría guardada en src/scripts/audit_out.txt");
}

audit().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
