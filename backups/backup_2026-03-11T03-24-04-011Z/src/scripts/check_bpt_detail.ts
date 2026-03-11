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

const BPT_ID = '3de6K2GeasZhN2GIQWXw';

async function details() {
    console.log("=== SUCURSALES de TEST BPT ===");
    const sucs = await getDocs(query(collection(db, 'sucursales'), where('clienteId', '==', BPT_ID)));
    sucs.docs.forEach(d => console.log(`  ID: "${d.id}" | nombre: "${d.data().nombre}" | franquiciaId: "${d.data().franquiciaId}"`));

    console.log("\n=== EQUIPOS de TEST BPT ===");
    const eqs = await getDocs(query(collection(db, 'equipos'), where('clienteId', '==', BPT_ID)));
    eqs.docs.forEach(d => console.log(`  ID: "${d.id}" | nombre: "${d.data().nombre}" | sucursalId: "${d.data().sucursalId}" | familia: "${d.data().familia}"`));

    console.log("\n=== USUARIOS de TEST BPT ===");
    const usrs = await getDocs(query(collection(db, 'usuarios'), where('clienteId', '==', BPT_ID)));
    usrs.docs.forEach(d => console.log(`  ID: "${d.id}" | nombre: "${d.data().nombre}" | rol: "${d.data().rol}" | sucursalesPermitidas: ${JSON.stringify(d.data().sucursalesPermitidas)}`));

    console.log("\n=== OTs de TEST BPT ===");
    const ots = await getDocs(query(collection(db, 'ordenesTrabajo'), where('clienteId', '==', BPT_ID)));
    console.log(`  Total: ${ots.size}`);
    ots.docs.slice(0, 5).forEach(d => console.log(`  OT#${d.data().numero} | status: ${d.data().status} | sucursalId: ${d.data().sucursalId}`));

    process.exit(0);
}
details();
