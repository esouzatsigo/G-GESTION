import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function listAllEquipos() {
    console.log('--- Resumen Global de Equipos ---');
    const snap = await getDocs(collection(db, 'equipos'));
    console.log(`Total Equipos: ${snap.size}`);

    const bySuc: Record<string, number> = {};
    const byClient: Record<string, number> = {};

    snap.docs.forEach(d => {
        const data = d.data();
        bySuc[data.sucursalId] = (bySuc[data.sucursalId] || 0) + 1;
        byClient[data.clienteId] = (byClient[data.clienteId] || 0) + 1;
    });

    console.log('Por Sucursal:', JSON.stringify(bySuc, null, 2));
    console.log('Por ClienteId:', JSON.stringify(byClient, null, 2));
}

listAllEquipos().catch(console.error);
