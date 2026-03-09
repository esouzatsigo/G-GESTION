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

const CORP_ID = 'kWRmv16DNfMUlSF1Yqiv';

async function scan() {
    try {
        const sucs = await getDocs(query(collection(db, 'sucursales'), where('clienteId', '==', CORP_ID)));
        console.log("== SUCURSALES ==");
        sucs.docs.forEach(d => console.log(`${d.id} -> ${d.data().nombre}`));

        const usrs = await getDocs(query(collection(db, 'usuarios'), where('clienteId', '==', CORP_ID)));
        console.log("\n== USUARIOS ==");
        usrs.docs.forEach(d => console.log(`${d.id} -> ${d.data().nombre} (${d.data().email}) - Rol: ${d.data().rol} - Sucursales: ${d.data().sucursalesPermitidas?.join(',')}`));

    } catch (e) {
        console.error(e);
    }
}
scan();
