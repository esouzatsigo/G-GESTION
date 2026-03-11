import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const TEST_BPT_CONFIG = {
    apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
    authDomain: "h-gestion-testbpt.firebaseapp.com",
    projectId: "h-gestion-testbpt",
    storageBucket: "h-gestion-testbpt.firebasestorage.app",
    messagingSenderId: "385439061540",
    appId: "1:385439061540:web:95c1461abd46400724eab1",
};

async function listAllUsers() {
  const app = initializeApp(TEST_BPT_CONFIG);
  const db = getFirestore(app);
  const snap = await getDocs(collection(db, 'usuarios'));
  console.log(`\n--- USERS IN TEST_BPT (${snap.size}) ---`);
  snap.forEach(doc => {
    const data = doc.data();
    if (data.email) {
        console.log(`"${data.email.toLowerCase()}": "TEST_BPT",`);
    }
  });
}

listAllUsers().then(() => process.exit(0));
