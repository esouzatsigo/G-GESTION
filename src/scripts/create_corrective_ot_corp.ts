import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    addDoc,
    doc,
    runTransaction
} from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
    authDomain: "h-gestion-testbpt.firebaseapp.com",
    projectId: "h-gestion-testbpt",
    storageBucket: "h-gestion-testbpt.firebasestorage.app",
    messagingSenderId: "385439061540",
    appId: "1:385439061540:web:95c1461abd46400724eab1",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

async function createCorrectiveOTCorp() {
    console.log("=== OT CORRECTIVA: CORPORATIVO NACIONAL (ESCENARIO REAL 2:15 AM) ===");

    // Gerente BP Altabrisa
    const gerenteId = "empiiN18VlLXZlXq45i4";
    const clienteId = "3de6K2GeasZhN2GIQWXw";
    const sucursalId = "HuwoZsAHef5kCZwCFirU";
    const sucursalNombre = "Boston's Altabrisa";
    const equipoId = "3KCvYUmZWUV7xxt2HUCk"; // Congelador de Postres

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
        sucursalNombre,
        equipoId,
        descripcionFalla: "REPORTE MADRUGADA: El congelador de postres no está enfriando. Temperatura actual 12°C. Riesgo de pérdida de helados y postres premium.",
        justificacion: "Falla detectada en el cierre de turno/mantenimiento nocturno.",
        fotosGerente: []
    };

    const docRef = await addDoc(collection(db, 'ordenesTrabajo'), otData);

    console.log(`\n[OK] OT Correctiva Corporativa Generada!`);
    console.log(`Cliente: CORPORATIVO NACIONAL`);
    console.log(`Folio: ${numero}`);
    console.log(`Firestore ID: ${docRef.id}`);
    console.log(`Solicitante: Gerente BP Altabrisa`);
    console.log(`Sucursal: ${sucursalNombre}`);
}

createCorrectiveOTCorp().then(() => process.exit(0)).catch(console.error);
