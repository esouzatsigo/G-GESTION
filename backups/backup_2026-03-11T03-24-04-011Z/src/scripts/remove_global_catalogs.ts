import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";

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

async function removeGlobalCatalogs() {
    console.log("Iniciando purga estricta de Catálogos Globales ('ADMIN')...");

    const catalogosRef = collection(db, 'catalogos');
    const qGlobal = query(catalogosRef, where('clienteId', '==', 'ADMIN'));
    const globalSnap = await getDocs(qGlobal);

    console.log(`Encontrados ${globalSnap.docs.length} catálogos globales para eliminar.`);

    if (globalSnap.empty) {
        console.log("Limpieza ya realizada. No hay nada que hacer.");
        return;
    }

    let borrados = 0;
    for (const d of globalSnap.docs) {
        await deleteDoc(doc(db, 'catalogos', d.id));
        borrados++;
        console.log(`[X] Borrado: ${d.data().categoria} - ${d.data().nombre}`);
    }

    console.log(`¡Purga completada! Se eliminaron ${borrados} registros globales permanentemente.`);
}

removeGlobalCatalogs().then(() => process.exit(0)).catch(e => {
    console.error("Error crítico:", e);
    process.exit(1);
});
