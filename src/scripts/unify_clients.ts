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
    const snap = await getDocs(collection(db, 'usuarios'));
    const targetClienteId = 'kWRmv16DNfMUlSF1Yqiv'; // CORPORATIVO NACIONAL

    let updated = 0;
    for (const docSnap of snap.docs) {
        const u = docSnap.data();
        if (u.rol !== 'Admin' && u.clienteId !== targetClienteId) {
            console.log(`Updating ${u.nombre} to have clienteId ${targetClienteId} (was ${u.clienteId})`);
            await updateDoc(doc(db, 'usuarios', docSnap.id), { clienteId: targetClienteId });
            updated++;
        }
    }
    console.log(`Updated ${updated} users.`);
    process.exit(0);
}
run();
