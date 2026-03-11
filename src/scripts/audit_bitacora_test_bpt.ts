import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

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

async function checkBitacora() {
    console.log("=== AUDITORÍA DE BITÁCORA (PROYECTO: TEST BPT) ===");

    // Buscamos cambios al valor 'BA' en cualquier campo o menciones de 'BA'
    const q = query(
        collection(db, 'bitacora'),
        orderBy('fecha', 'desc'),
        limit(2000)
    );

    const snap = await getDocs(q);
    console.log(`Analizando los últimos ${snap.size} eventos...`);

    const suspicious = snap.docs.filter(d => {
        const data = d.data();
        const str = JSON.stringify(data).toUpperCase();
        return str.includes('"BA"') || (data.campo === 'sucursalId' && data.valorNuevo === 'BA');
    });

    if (suspicious.length === 0) {
        console.log("✅ No se encontraron cambios registrados a 'BA' en las últimas 500 entradas.");
        
        // Vamos a ver qué tipo de cambios hay en general para equipos
        console.log("\n--- Resumen de cambios recientes en la bitácora ---");
        const summary = snap.docs.slice(0, 10).map(d => {
            const data = d.data();
            return `${data.fecha} | ${data.usuarioNombre} | ${data.accion} | ${data.campo}: ${data.valorAnterior} -> ${data.valorNuevo}`;
        });
        summary.forEach(s => console.log(s));
    } else {
        console.log(`⚠️ Se encontraron ${suspicious.length} eventos sospechosos!`);
        suspicious.forEach(d => {
            const data = d.data();
            console.log("------------------------------------------");
            console.log(`FECHA: ${data.fecha}`);
            console.log(`USUARIO: ${data.usuarioNombre} (${data.usuarioId})`);
            console.log(`ACCIÓN: ${data.accion}`);
            console.log(`CAMPO: ${data.campo}`);
            console.log(`VALOR: ${data.valorAnterior} -> ${data.valorNuevo}`);
            console.log(`ID ENTIDAD: ${data.otId || data.entityId}`);
        });
    }

    process.exit(0);
}

checkBitacora().catch(console.error);
