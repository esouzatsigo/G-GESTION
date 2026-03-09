import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection, query, where, doc, getDoc } from "firebase/firestore";

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

const CORP_ID = 'kWRmv16DNfMUlSF1Yqiv'; // CORPORATIVO NACIONAL

async function analyzeCorp() {
    try {
        console.log("--- ANALIZANDO CORPORATIVO NACIONAL ---");

        const clientDoc = await getDoc(doc(db, 'clientes', CORP_ID));
        if (clientDoc.exists()) {
            console.log("CLIENTE:", clientDoc.data().nombre);
        } else {
            console.log("CORPORATIVO NACIONAL no encontrado."); return;
        }

        const franquicias = await getDocs(query(collection(db, 'franquicias'), where('clienteId', '==', CORP_ID)));
        console.log(`\nFranquicias encontradas: ${franquicias.size}`);
        franquicias.forEach(f => console.log(`  - ${f.data().nombre} [${f.data().estatus}]`));

        const sucursales = await getDocs(query(collection(db, 'sucursales'), where('clienteId', '==', CORP_ID)));
        console.log(`\nSucursales encontradas: ${sucursales.size}`);
        sucursales.forEach(s => console.log(`  - ${s.data().nombre} (${s.data().ciudad})`));

        const equipos = await getDocs(query(collection(db, 'equipos'), where('clienteId', '==', CORP_ID)));
        console.log(`\nEquipos encontrados: ${equipos.size}`);
        equipos.docs.slice(0, 5).forEach(e => console.log(`  - ${e.data().nombre} [Familia: ${e.data().familia}]`));
        if (equipos.size > 5) console.log(`  ... y ${equipos.size - 5} más.`);

        const usuarios = await getDocs(query(collection(db, 'usuarios'), where('clienteId', '==', CORP_ID)));
        console.log(`\nUsuarios (Gerentes/Técnicos) encontrados: ${usuarios.size}`);
        usuarios.docs.forEach(u => console.log(`  - ${u.data().nombre} [Rol: ${u.data().rol}]`));

        const ots = await getDocs(query(collection(db, 'ordenesTrabajo'), where('clienteId', '==', CORP_ID)));
        console.log(`\nÓrdenes de Trabajo encontradas: ${ots.size}`);
        ots.docs.slice(0, 10).forEach(ot => {
            const data = ot.data();
            console.log(`  - OT [${data.numero}] Tipo: ${data.tipo} | Estatus: ${data.estatus}`);
            console.log(`    Falla: "${data.descripcionFalla}"`);
        });

    } catch (error) {
        console.error("Error analizando datos:", error);
    }
}

analyzeCorp();
