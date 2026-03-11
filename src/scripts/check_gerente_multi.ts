import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

const FIREBASE_PROJECTS = {
  BPT_GROUP: {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
    storageBucket: "h-gestion-dev.firebasestorage.app",
    messagingSenderId: "198928689880",
    appId: "1:198928689880:web:7f90dcd33e710fcc7505ad",
  },
  TEST_BPT: {
    apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
    authDomain: "h-gestion-testbpt.firebaseapp.com",
    projectId: "h-gestion-testbpt",
    storageBucket: "h-gestion-testbpt.firebasestorage.app",
    messagingSenderId: "385439061540",
    appId: "1:385439061540:web:95c1461abd46400724eab1",
  }
};

async function checkUser(email: string) {
  for (const [key, config] of Object.entries(FIREBASE_PROJECTS)) {
    console.log(`\n--- Checking ${key} (${config.projectId}) ---`);
    try {
      const app = initializeApp(config, key);
      const db = getFirestore(app);
      const q = query(collection(db, 'usuarios'), where('email', '==', email));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        console.log(`❌ User ${email} NOT FOUND in ${key}`);
      } else {
        console.log(`✅ User ${email} FOUND in ${key}`);
        snap.forEach(doc => {
          console.log(`   ID: ${doc.id}`);
          console.log(`   Rol: ${doc.data().rol}`);
          console.log(`   ClienteId: ${doc.data().clienteId}`);
          console.log(`   Sucursales: ${doc.data().sucursalesPermitidas}`);
        });
      }
    } catch (e: any) {
      console.error(`Error checking ${key}: ${e.message}`);
    }
  }
}

const targetEmail = process.argv[2] || 'Gerente@BA.com';
checkUser(targetEmail).then(() => process.exit(0));
