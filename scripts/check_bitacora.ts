
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

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

async function getRecentBitacora() {
    const q = query(collection(db, "bitacora"), orderBy("fecha", "desc"), limit(100));
    const snap = await getDocs(q);
    const results = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(entry =>
            entry.fecha.includes("2026-03-09") &&
            (
                (entry.valorNuevo && typeof entry.valorNuevo === 'string' && entry.valorNuevo.toLowerCase().includes("comentario")) ||
                (entry.valorAnterior && typeof entry.valorAnterior === 'string' && entry.valorAnterior.toLowerCase().includes("comentario")) ||
                (entry.campo && entry.campo.toLowerCase().includes("servicio")) ||
                (entry.accion && entry.accion.toLowerCase().includes("estado"))
            )
        );
    console.log(JSON.stringify(results, null, 2));
}

getRecentBitacora().catch(console.error);
