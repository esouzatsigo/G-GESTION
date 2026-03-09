import { doc, getDoc } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function checkUser() {
    const uid = 'XectHhoF0iBuykxXdhsO';
    const snap = await getDoc(doc(db, 'usuarios', uid));

    if (snap.exists()) {
        console.log('--- Usuario Encontrado ---');
        console.log(JSON.stringify(snap.data(), null, 2));
    } else {
        console.log(`Usuario con ID ${uid} NO existe.`);
    }
}
checkUser().catch(console.error);
