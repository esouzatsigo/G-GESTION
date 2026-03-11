
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

async function diagnose() {
  const testBptId = "3de6K2GeasZhN2GIQWXw"; // Hardcoded from previous run
  console.log(`Analizando 'Refrigeración' para Cliente: ${testBptId}\n`);

  const catsSnap = await getDocs(query(collection(db, 'catalogos'), where('clienteId', '==', testBptId), where('categoria', '==', 'Familia')));
  const famsSnap = await getDocs(query(collection(db, 'familias'), where('clienteId', '==', testBptId)));

  console.log("ENTRADAS EN 'catalogos':");
  catsSnap.forEach(d => {
    if (d.data().nombre?.includes("Refrigeracion") || d.data().nomenclatura?.includes("REFRIGERACION")) {
        console.log(` - ID: ${d.id} | Nombre: ${d.data().nombre} | Nomenclatura: ${d.data().nomenclatura}`);
    }
  });

  console.log("\nENTRADAS EN 'familias':");
  famsSnap.forEach(d => {
    if (d.data().nombre?.includes("Refrigeracion") || d.data().nomenclatura?.includes("REFRIGERACION")) {
        console.log(` - ID: ${d.id} | Nombre: ${d.data().nombre} | Nomenclatura: ${d.data().nomenclatura}`);
    }
  });

  process.exit(0);
}

diagnose();
