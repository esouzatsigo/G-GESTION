import { db } from './src/services/firebase';
import { collection, getDocs, deleteDoc, doc, addDoc } from 'firebase/firestore';

const NEW_PLAN_2026 = [
    // ENERO
    { mes: 0, fechas: '12', sucursalId: 'tmQHKne6BlMFqdICP3DI', txtPDF: 'MB Dzityá' },
    { mes: 0, fechas: '20', sucursalId: 'MBIpcrIvTAbPHNvyypTN', txtPDF: 'Camp Bostons' },
    // FEBRERO
    { mes: 1, fechas: '3', sucursalId: 'X8Mb8ee1zg3HmobPeUOt', txtPDF: 'B Gran Plaza' },
    { mes: 1, fechas: '5 - 6', sucursalId: 'QasVH9RAZKlSuaCYZw6N', txtPDF: 'Parr. City' },
    { mes: 1, fechas: '12', sucursalId: 'HocVkOhJBlw3JAulA0Gb', txtPDF: 'B Altabrisa' },
    { mes: 1, fechas: '18', sucursalId: 'Y9Cu0FxR5NA8deNTm0D3', txtPDF: 'Panadería' },
    { mes: 1, fechas: '19', sucursalId: 'TpJoq0yMVvsrPNfKSBBr', txtPDF: 'Camp Parroquia' },
    // MARZO
    { mes: 2, fechas: '3', sucursalId: '4GipsUh9rTx391J6RM6A', txtPDF: 'B Pens' },
    { mes: 2, fechas: '5', sucursalId: 'Y9Cu0FxR5NA8deNTm0D3', txtPDF: 'Comisariato' },
    { mes: 2, fechas: '11', sucursalId: 'G8uSICvhYBN5e7C5aXvj', txtPDF: 'B Caucel' },
    { mes: 2, fechas: '18 - 19', sucursalId: 'MHe8zggUNx0ByyURbG71', txtPDF: 'Parr. Caucel' },
    { mes: 2, fechas: '23', sucursalId: 'VRJSUXdXepBLyi6PjD1n', txtPDF: 'MB Xcanatún' },
    // ABRIL
    { mes: 3, fechas: '7', sucursalId: 'qnj7AHjSOkpTYq73KX5t', txtPDF: 'Camp Sushi' },
    { mes: 3, fechas: '20', sucursalId: 'tmQHKne6BlMFqdICP3DI', txtPDF: 'MB Dzityá' },
    { mes: 3, fechas: '21', sucursalId: 'MBIpcrIvTAbPHNvyypTN', txtPDF: 'Camp Bostons' },
    // MAYO
    { mes: 4, fechas: '5', sucursalId: 'X8Mb8ee1zg3HmobPeUOt', txtPDF: 'B Gran Plaza' },
    { mes: 4, fechas: '11', sucursalId: 'QasVH9RAZKlSuaCYZw6N', txtPDF: 'P. City' },
    { mes: 4, fechas: '14', sucursalId: 'HocVkOhJBlw3JAulA0Gb', txtPDF: 'B Altabrisa' },
    { mes: 4, fechas: '19', sucursalId: 'Y9Cu0FxR5NA8deNTm0D3', txtPDF: 'Panadería' },
    { mes: 4, fechas: '20', sucursalId: 'TpJoq0yMVvsrPNfKSBBr', txtPDF: 'Camp Parroquia' },
    // JUNIO
    { mes: 5, fechas: '2', sucursalId: '4GipsUh9rTx391J6RM6A', txtPDF: 'B Pens' },
    { mes: 5, fechas: '8', sucursalId: 'Y9Cu0FxR5NA8deNTm0D3', txtPDF: 'Comisariato' },
    { mes: 5, fechas: '10', sucursalId: 'G8uSICvhYBN5e7C5aXvj', txtPDF: 'B Caucel' },
    { mes: 5, fechas: '17', sucursalId: 'MHe8zggUNx0ByyURbG71', txtPDF: 'Parr. Caucel' },
    { mes: 5, fechas: '22', sucursalId: 'VRJSUXdXepBLyi6PjD1n', txtPDF: 'MB Xcanatún' },
    // JULIO
    { mes: 6, fechas: '7', sucursalId: 'qnj7AHjSOkpTYq73KX5t', txtPDF: 'Camp Sushi' },
    { mes: 6, fechas: '13', sucursalId: 'tmQHKne6BlMFqdICP3DI', txtPDF: 'MB Dzityá' },
    { mes: 6, fechas: '20', sucursalId: 'MBIpcrIvTAbPHNvyypTN', txtPDF: 'Camp Bostons' },
    // AGOSTO
    { mes: 7, fechas: '4', sucursalId: 'X8Mb8ee1zg3HmobPeUOt', txtPDF: 'B Gran Plaza' },
    { mes: 7, fechas: '10 - 11', sucursalId: 'QasVH9RAZKlSuaCYZw6N', txtPDF: 'Parr. City' },
    { mes: 7, fechas: '13', sucursalId: 'HocVkOhJBlw3JAulA0Gb', txtPDF: 'B Altabrisa' },
    { mes: 7, fechas: '18', sucursalId: 'Y9Cu0FxR5NA8deNTm0D3', txtPDF: 'Panadería' },
    { mes: 7, fechas: '19', sucursalId: 'TpJoq0yMVvsrPNfKSBBr', txtPDF: 'Camp Parroquia' },
    // SEPTIEMBRE
    { mes: 8, fechas: '1', sucursalId: '4GipsUh9rTx391J6RM6A', txtPDF: 'B Pens' },
    { mes: 8, fechas: '7', sucursalId: 'Y9Cu0FxR5NA8deNTm0D3', txtPDF: 'Comisariato' },
    { mes: 8, fechas: '9', sucursalId: 'G8uSICvhYBN5e7C5aXvj', txtPDF: 'B Caucel' },
    { mes: 8, fechas: '17 - 18', sucursalId: 'MHe8zggUNx0ByyURbG71', txtPDF: 'Parr. Caucel' },
    { mes: 8, fechas: '21', sucursalId: 'VRJSUXdXepBLyi6PjD1n', txtPDF: 'MB Xcanatún' },
    // OCTUBRE
    { mes: 9, fechas: '7', sucursalId: 'qnj7AHjSOkpTYq73KX5t', txtPDF: 'Camp Sushi' },
    { mes: 9, fechas: '12', sucursalId: 'tmQHKne6BlMFqdICP3DI', txtPDF: 'MB Dzityá' },
    { mes: 9, fechas: '19', sucursalId: 'MBIpcrIvTAbPHNvyypTN', txtPDF: 'Camp Bostons' },
    // NOVIEMBRE
    { mes: 10, fechas: '3', sucursalId: 'X8Mb8ee1zg3HmobPeUOt', txtPDF: 'B Gran Plaza' },
    { mes: 10, fechas: '9 - 10', sucursalId: 'QasVH9RAZKlSuaCYZw6N', txtPDF: 'Parr. City' },
    { mes: 10, fechas: '12', sucursalId: 'HocVkOhJBlw3JAulA0Gb', txtPDF: 'B Altabrisa' },
    { mes: 10, fechas: '18', sucursalId: 'Y9Cu0FxR5NA8deNTm0D3', txtPDF: 'Panadería' },
    { mes: 10, fechas: '19', sucursalId: 'TpJoq0yMVvsrPNfKSBBr', txtPDF: 'Camp Parroquia' },
    // DICIEMBRE
    { mes: 11, fechas: '1', sucursalId: '4GipsUh9rTx391J6RM6A', txtPDF: 'B Pens' },
    { mes: 11, fechas: '7', sucursalId: 'Y9Cu0FxR5NA8deNTm0D3', txtPDF: 'Comisariato' },
    { mes: 11, fechas: '9', sucursalId: 'G8uSICvhYBN5e7C5aXvj', txtPDF: 'B Caucel' },
    { mes: 11, fechas: '17 - 18', sucursalId: 'MHe8zggUNx0ByyURbG71', txtPDF: 'Parr. Caucel' },
    { mes: 11, fechas: '21', sucursalId: 'VRJSUXdXepBLyi6PjD1n', txtPDF: 'MB Xcanatún' }
];

async function purgeAndSeed() {
    console.log('--- PURGE ---');
    const colRef = collection(db, 'planPreventivo2026');
    const snapshot = await getDocs(colRef);
    console.log(`Eliminando ${snapshot.size} registros...`);
    for (const d of snapshot.docs) {
        await deleteDoc(doc(db, 'planPreventivo2026', d.id));
    }
    console.log('Colección vacía.');

    console.log('\n--- SEED ---');
    for (const entry of NEW_PLAN_2026) {
        await addDoc(collection(db, 'planPreventivo2026'), entry);
    }
    console.log(`Insertados ${NEW_PLAN_2026.length} registros.`);
}

purgeAndSeed();
