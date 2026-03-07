import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    projectId: "h-gestion-dev",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    const bptSnap = await getDocs(collection(db, 'clientes'));
    const allClientes = bptSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log("CLIENTES:", allClientes.map((c: any) => `${c.id} -> ${c.nombre}`));
}
run();
