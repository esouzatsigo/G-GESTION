import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import * as fs from "fs";

const firebaseConfig = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    const snap = await getDocs(collection(db, "usuarios"));
    const users = [];
    snap.docs.forEach(doc => {
        const data = doc.data();
        users.push({ id: doc.id, nombre: data.nombre, email: data.email, rol: data.rol });
    });
    fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
    process.exit(0);
}
run();
