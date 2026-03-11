
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

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
  const testBptId = "3de6K2GeasZhN2GIQWXw";
  
  const cats = await getDocs(query(collection(db, 'catalogos'), where('clienteId', '==', testBptId), where('categoria', '==', 'Familia')));
  const fams = await getDocs(query(collection(db, 'familias'), where('clienteId', '==', testBptId)));

  console.log("CATALOGS:");
  cats.forEach(d => console.log(`[CAT] ${d.data().nombre} -> ID: ${d.id}`));

  console.log("\nFAMILIAS:");
  fams.forEach(d => console.log(`[FAM] ${d.data().nombre} -> ID: ${d.id}`));

  process.exit(0);
}

check();
