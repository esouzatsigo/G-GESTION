import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../services/firebase';

async function forensicAudit() {
    console.log("--- AUDITORÍA FORENSE DE BITÁCORA ---");

    // Buscar cambios en catálogos o familias
    const q = query(
        collection(db, 'bitacora'),
        orderBy('fecha', 'desc'),
        limit(100)
    );

    const snap = await getDocs(q);
    console.log(`Analizando últimas ${snap.size} entradas...`);

    snap.forEach(doc => {
        const entry = doc.data();
        const isFamily = entry.accion?.includes('Familia') || entry.campo?.includes('Familia') || entry.accion?.includes('Catálogo');

        if (isFamily) {
            console.log(`[${entry.fecha}] USUARIO: ${entry.usuarioNombre} | ACCIÓN: ${entry.accion} | CAMPO: ${entry.campo} | VALOR NUEVO: ${entry.valorNuevo}`);
        }
    });

    console.log("\n--- AUDITORÍA FINALIZADA ---");
    process.exit(0);
}

forensicAudit().catch(console.error);
