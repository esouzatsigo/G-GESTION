import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    console.log("Fetching users...");
    const snap = await getDocs(collection(db, 'usuarios'));
    const bptSnap = await getDocs(collection(db, 'clientes'));
    const clientesMatch = bptSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const bptClient = clientesMatch.find((c: any) => c.nombre === 'BPT' || c.nombre.includes('CORPORATIVO'));

    if (!bptClient) {
        console.log("BPT not found, clients available:", clientesMatch.map((c: any) => c.nombre));
        return;
    }

    for (const docSnap of snap.docs) {
        const u = docSnap.data();
        if ((u.rol === 'Coordinador' || u.rol === 'Supervisor') && (u.nombre.includes('BPT') || u.nombre.includes('BA'))) {
            if (u.clienteId !== bptClient.id) {
                console.log(`Updating ${u.nombre} to have BPT clienteId (was ${u.clienteId})`);
                await updateDoc(doc(db, 'usuarios', docSnap.id), { clienteId: bptClient.id });
            }
        }
    }
    console.log("DONE");
    process.exit(0);
}
run();
