
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from 'fs';

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

async function diagnose() {
    let output = "--- DIAGNÓSTICO DE DATOS ---\n";

    try {
        // 1. Clientes
        const cSnap = await getDocs(collection(db, 'clientes'));
        output += "\nCLIENTES:\n";
        cSnap.forEach(d => output += `ID: ${d.id} | Nombre: ${d.get('nombre')}\n`);

        // 2. Franquicias
        const fSnap = await getDocs(collection(db, 'franquicias'));
        output += "\nFRANQUICIAS:\n";
        fSnap.forEach(d => output += `ID: ${d.id} | Nombre: ${d.get('nombre')} | clienteId: ${d.get('clienteId')}\n`);

        // 3. Sucursales
        const sSnap = await getDocs(collection(db, 'sucursales'));
        output += "\nSUCURSALES:\n";
        sSnap.forEach(d => output += `ID: ${d.id} | Nombre: ${d.get('nombre')} | clienteId: ${d.get('clienteId')} | franquiciaId: ${d.get('franquiciaId')}\n`);

        // 4. Equipos
        const eSnap = await getDocs(collection(db, 'equipos'));
        output += "\nEQUIPOS SELECCIONADOS:\n";
        eSnap.forEach(d => {
            if (d.get('nombre').includes("Freidora")) {
                output += `ID: ${d.id} | Nombre: ${d.get('nombre')} | sucursalId: ${d.get('sucursalId')} | clienteId: ${d.get('clienteId')} | franquiciaId: ${d.get('franquiciaId')}\n`;
            }
        });
    } catch (e) {
        output += `\nERROR: ${e.message}\n`;
    }

    fs.writeFileSync('diag_results.txt', output);
    console.log("Diagnóstico guardado en diag_results.txt");
}

diagnose().catch(console.error);
