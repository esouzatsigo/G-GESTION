import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection, deleteDoc, doc, updateDoc, query, where } from "firebase/firestore";
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

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

async function cleanup() {
    try {
        console.log("--- Búsqueda de Sucursales ---");
        const sucursalesSnap = await getDocs(collection(db, 'sucursales'));
        let montejoId = "";
        let altabrisaId = "";
        sucursalesSnap.forEach(d => {
            const data = d.data();
            console.log(`Sucursal: [${d.id}] ${data.nombre} (${data.franquiciaId})`);
            if (data.nombre.toLowerCase().includes("montejo")) {
                montejoId = d.id;
            }
            if (data.nombre.toLowerCase().includes("altabrisa")) {
                altabrisaId = d.id;
            }
        });

        if (montejoId) {
            console.log(`\nEliminando Sucursal Montejo: ${montejoId}`);
            // await deleteDoc(doc(db, 'sucursales', montejoId)); // Descomentar después de validar

            // Buscar equipos dependientes
            const equiposSnap = await getDocs(query(collection(db, 'equipos'), where('sucursalId', '==', montejoId)));
            console.log(`Equipos en Montejo a eliminar: ${equiposSnap.size}`);
            // for(const e of equiposSnap.docs) await deleteDoc(e.ref);

            // Buscar OTs dependientes
            const otsSnap = await getDocs(query(collection(db, 'ordenesTrabajo'), where('sucursalId', '==', montejoId)));
            console.log(`OTs en Montejo a eliminar: ${otsSnap.size}`);
            // for(const ot of otsSnap.docs) await deleteDoc(ot.ref);
        }

        console.log("\n--- Búsqueda de Técnicos ---");
        const usuariosSnap = await getDocs(collection(db, 'usuarios'));

        // 1. Un solo técnico externo de refrigeración
        // 2. Solo "Tecnico Interno B. Altabrisa"

        let extRefriCount = 0;
        usuariosSnap.forEach(d => {
            const data = d.data();
            const esExterno = data.rol === 'TecnicoExterno';
            const esInterno = data.rol === 'Tecnico';

            if (esExterno) {
                if (data.especialidad === 'Refrigeracion') {
                    extRefriCount++;
                    console.log(`[EXTERNO] ${data.nombre} (${data.especialidad}) - Mantener? (Contador: ${extRefriCount})`);
                } else {
                    console.log(`[EXTERNO] ${data.nombre} (${data.especialidad}) - ELIMINAR (No es refrigeración)`);
                }
            } else if (esInterno) {
                if (data.nombre.includes("Interno B. Altabrisa")) {
                    console.log(`[INTERNO] ${data.nombre} - MANTENER`);
                } else {
                    console.log(`[INTERNO] ${data.nombre} - ELIMINAR (No es Altabrisa)`);
                }
            }
        });

    } catch (e) {
        console.error(e);
    }
}

cleanup();
