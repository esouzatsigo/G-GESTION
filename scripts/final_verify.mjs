
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function verify() {
  const snapshot = await getDocs(collection(db, 'equipos'));
  let total = snapshot.size;
  let withId = 0;
  let withoutId = 0;

  snapshot.forEach(doc => {
    if (doc.data().familiaId) withId++;
    else withoutId++;
  });

  console.log(`TOTAL EQUIPOS: ${total}`);
  console.log(`CON familiaId: ${withId}`);
  console.log(`SIN familiaId: ${withoutId}`);
  
  process.exit(0);
}

verify();
