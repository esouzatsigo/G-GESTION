
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

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

async function checkOT() {
    console.log("Searching for OT 1014 in Firestore...");
    const q = query(collection(db, "ordenesTrabajo"), where("numero", "==", 1014));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        console.log("Result: OT 1014 NOT found (number).");
        const qS = query(collection(db, "ordenesTrabajo"), where("numero", "==", "1014"));
        const sq = await getDocs(qS);
        if (!sq.empty) {
            console.log("Result: OT 1014 found! (string)");
        }
    } else {
        console.log("Result: OT 1014 found!");
    }

    console.log("\nListing latest 5 OTs for context:");
    const qAll = query(collection(db, "ordenesTrabajo"));
    const allSnapshot = await getDocs(qAll);
    const docs = allSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => (b.numero || 0) - (a.numero || 0));
    docs.slice(0, 5).forEach(d => console.log(`OT #${d.numero} [${d.id}] - ${d.estatus}`));
}

checkOT().catch(console.error);
