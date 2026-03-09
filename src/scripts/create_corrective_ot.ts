import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    addDoc,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    runTransaction,
    limit,
    orderBy
} from "firebase/firestore";

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

// Helper para el consecutivo
async function getNextOTNumber(clienteId: string): Promise<number> {
    const counterRef = doc(db, 'counters', `ot_${clienteId}`);
    return await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let next = 1;
        if (counterDoc.exists()) {
            next = (counterDoc.data().current || 0) + 1;
        }
        transaction.set(counterRef, { current: next }, { merge: true });
        return next;
    });
}

async function createCorrectiveOT() {
    console.log("=== GENERANDO ORDEN DE TRABAJO CORRECTIVA (GERENTE ALTABRISA) ===");

    const gerenteId = "HjRs59PADerbXOuoXTuy";
    const clienteId = "3de6K2GeasZhN2GIQWXw";
    const sucursalId = "BA";
    const equipoId = "1sALklXdn2XP4e450yUY"; // BA-Congelador de tarros

    const numero = await getNextOTNumber(clienteId);

    const otData = {
        numero,
        tipo: 'Correctivo',
        estatus: 'Pendiente',
        prioridad: 'ALTA',
        fechas: {
            solicitada: new Date().toISOString()
        },
        solicitanteId: gerenteId,
        clienteId,
        sucursalId,
        sucursalNombre: "Altabrisa",
        equipoId,
        descripcionFalla: "URGENTE: El congelador de tarros no baja de 0°C. Se requiere revisión inmediata para evitar pérdida de producto.",
        justificacion: "Operación crítica de restaurante. 2:15 AM - Reporte de turno nocturno.",
        fotosGerente: []
    };

    const docRef = await addDoc(collection(db, 'ordenesTrabajo'), otData);

    console.log(`\n[OK] OT Correctiva Generada con Éxito!`);
    console.log(`Folio: ${numero}`);
    console.log(`Firestore ID: ${docRef.id}`);
    console.log(`Solicitante: Gerente Altabrisa`);
    console.log(`Sucursal: ${otData.sucursalNombre}`);
    console.log(`Equipo ID: ${equipoId}`);
}

createCorrectiveOT().then(() => process.exit(0)).catch(console.error);
