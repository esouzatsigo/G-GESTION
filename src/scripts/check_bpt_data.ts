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

async function check() {
    // 1. Check clientes collection for 'BPT'
    console.log("=== CLIENTES ===");
    const clientes = await getDocs(collection(db, 'clientes'));
    clientes.docs.forEach(d => {
        const data = d.data();
        console.log(`  ID: "${d.id}" | nombre: "${data.nombre}" | razonSocial: "${data.razonSocial}"`);
    });

    // 2. Check sucursales with clienteId='BPT'
    console.log("\n=== SUCURSALES (clienteId='BPT') ===");
    const sucBPT = await getDocs(query(collection(db, 'sucursales'), where('clienteId', '==', 'BPT')));
    console.log(`  Found: ${sucBPT.size}`);
    sucBPT.docs.forEach(d => console.log(`  ${d.id} -> ${d.data().nombre}`));

    // 3. Check ALL sucursales to see what clienteIds exist
    console.log("\n=== ALL SUCURSALES (distinct clienteIds) ===");
    const allSucs = await getDocs(collection(db, 'sucursales'));
    const clienteIds = new Set<string>();
    allSucs.docs.forEach(d => {
        clienteIds.add(d.data().clienteId);
    });
    console.log(`  Distinct clienteIds: ${[...clienteIds].join(', ')}`);
    console.log(`  Total sucursales: ${allSucs.size}`);

    // 4. Check equipos with clienteId='BPT'
    console.log("\n=== EQUIPOS (clienteId='BPT') ===");
    const eqBPT = await getDocs(query(collection(db, 'equipos'), where('clienteId', '==', 'BPT')));
    console.log(`  Found: ${eqBPT.size}`);

    // 5. Check ALL equipos distinct clienteIds
    console.log("\n=== ALL EQUIPOS (distinct clienteIds) ===");
    const allEqs = await getDocs(collection(db, 'equipos'));
    const eqClienteIds = new Set<string>();
    allEqs.docs.forEach(d => {
        eqClienteIds.add(d.data().clienteId);
    });
    console.log(`  Distinct clienteIds: ${[...eqClienteIds].join(', ')}`);
    console.log(`  Total equipos: ${allEqs.size}`);

    // 6. OTs
    console.log("\n=== OTs (clienteId='BPT') ===");
    const otBPT = await getDocs(query(collection(db, 'ordenesTrabajo'), where('clienteId', '==', 'BPT')));
    console.log(`  Found: ${otBPT.size}`);

    console.log("\n=== ALL OTs (distinct clienteIds) ===");
    const allOTs = await getDocs(collection(db, 'ordenesTrabajo'));
    const otClienteIds = new Set<string>();
    allOTs.docs.forEach(d => {
        otClienteIds.add(d.data().clienteId);
    });
    console.log(`  Distinct clienteIds: ${[...otClienteIds].join(', ')}`);
    console.log(`  Total OTs: ${allOTs.size}`);

    process.exit(0);
}
check();
