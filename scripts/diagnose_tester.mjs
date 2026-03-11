
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
  console.log("=== DIAGNÓSTICO DE VISIBILIDAD DE EQUIPOS ===\n");

  // 1. Encontrar cliente "TEST BPT"
  const clientsSnap = await getDocs(collection(db, 'clientes'));
  let testBptId = "";
  clientsSnap.forEach(d => {
    if (d.data().nombre === "TEST BPT") testBptId = d.id;
  });

  if (!testBptId) {
    console.log("ERR: No se encontró el cliente TEST BPT");
    process.exit(1);
  }
  console.log(`Cliente: TEST BPT (ID: ${testBptId})`);

  // 2. Familias disponibles para este cliente
  const famsSnap = await getDocs(query(collection(db, 'familias'), where('clienteId', '==', testBptId)));
  console.log(`\nFAMILIAS EN COLECCIÓN 'familias' (${famsSnap.size}):`);
  famsSnap.forEach(d => {
    console.log(` - ID: ${d.id} | Nombre: ${d.data().nombre} | Nomenclatura: ${d.data().nomenclatura}`);
  });

  // 3. Catálogos legacy categoria Familia
  const catsSnap = await getDocs(query(collection(db, 'catalogos'), where('clienteId', '==', testBptId), where('categoria', '==', 'Familia')));
  console.log(`\nCATÁLOGOS LEGACY 'Familia' (${catsSnap.size}):`);
  catsSnap.forEach(d => {
    console.log(` - ID: ${d.id} | Nombre: ${d.data().nombre} | Nomenclatura: ${d.data().nomenclatura}`);
  });

  // 4. Muestra de equipos en Altabrisa (BA)
  const eqsSnap = await getDocs(query(collection(db, 'equipos'), where('clienteId', '==', testBptId), where('sucursalId', '==', 'BA')));
  console.log(`\nEQUIPOS EN ALTABRISA (BA) - Total: ${eqsSnap.size}`);
  if (eqsSnap.size > 0) {
    const first = eqsSnap.docs[0].data();
    console.log(`Ejemplo Equipo: "${first.nombre}"`);
    console.log(` - familia (texto): ${first.familia}`);
    console.log(` - familiaId: ${first.familiaId}`);
  }

  process.exit(0);
}

diagnose();
