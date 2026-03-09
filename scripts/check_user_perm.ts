import { doc, getDoc } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function checkUserFirestore() {
    const user = await getDoc(doc(db, 'usuarios', 'Gerente.BA'));
    if (user.exists()) {
        console.log('--- Usuario Gerente.BA en Firestore ---');
        console.log(JSON.stringify(user.data(), null, 2));
    } else {
        console.log('Usuario Gerente.BA no encontrado en Firestore.');
    }
}
checkUserFirestore().catch(console.error);
