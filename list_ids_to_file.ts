import { db } from './src/services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

async function listData() {
    let output = '--- FRANQUICIAS ---\n';
    const fSnap = await getDocs(collection(db, 'franquicias'));
    fSnap.forEach(doc => { output += `${doc.id}: ${doc.data().nombre}\n`; });

    output += '\n--- SUCURSALES ---\n';
    const sSnap = await getDocs(collection(db, 'sucursales'));
    sSnap.forEach(doc => { output += `${doc.id}: ${doc.data().nombre} (${doc.data().franquiciaId})\n`; });

    fs.writeFileSync('ids_output.txt', output);
}

listData();
