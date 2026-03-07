import { initializeApp } from "firebase/app";
import { initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Configuración de Firebase (usar credenciales reales)
const firebaseConfig = {
  apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
  authDomain: "h-gestion-dev.firebaseapp.com",
  projectId: "h-gestion-dev",
  storageBucket: "h-gestion-dev.firebasestorage.app",
  messagingSenderId: "198928689880",
  appId: "1:198928689880:web:7f90dcd33e710fcc7505ad",
};

const app = initializeApp(firebaseConfig);

// Inicializar Firestore con caché persistente (API moderna)
export const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
});

export const auth = getAuth(app);
export const storage = getStorage(app);
