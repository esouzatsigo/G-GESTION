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
    const targetClienteId = '3de6K2GeasZhN2GIQWXw'; // BPT Real ID
    const snap = await getDocs(collection(db, 'usuarios'));
    const incorrectClienteId = 'kWRmv16DNfMUlSF1Yqiv'; // ID Erroneo que causó el bug

    let updated = 0;
    for (const docSnap of snap.docs) {
        const u = docSnap.data();
        if (u.rol !== 'Admin' && u.clienteId === incorrectClienteId) {
            console.log(`Restoring ${u.nombre} to have clienteId ${targetClienteId} (was ${u.clienteId})`);
            await updateDoc(doc(db, 'usuarios', docSnap.id), { clienteId: targetClienteId });
            updated++;
        }
    }
    console.log(`Restored ${updated} users to the correct BPT client.`);
    process.exit(0);
}
run();
