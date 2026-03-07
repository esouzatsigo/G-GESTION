import { db } from './src/services/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function listData() {
    console.log('--- FRANQUICIAS ---');
    const fSnap = await getDocs(collection(db, 'franquicias'));
    fSnap.forEach(doc => console.log(`${doc.id}: ${doc.data().nombre}`));

    console.log('\n--- SUCURSALES ---');
    const sSnap = await getDocs(collection(db, 'sucursales'));
    sSnap.forEach(doc => console.log(`${doc.id}: ${doc.data().nombre} (${doc.data().franquiciaId})`));
}

listData();
