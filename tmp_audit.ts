import { collection, getDocs } from 'firebase/firestore';
import { db } from './src/services/firebase';

async function audit() {
    const querySnapshot = await getDocs(collection(db, 'sucursales'));
    const sucursales = querySnapshot.docs.map(doc => ({
        id: doc.id,
        nombre: doc.data().nombre,
        franquiciaId: doc.data().franquiciaId
    }));
    console.log(JSON.stringify(sucursales, null, 2));

    const franSnapshot = await getDocs(collection(db, 'franquicias'));
    const franquicias = franSnapshot.docs.map(doc => ({
        id: doc.id,
        nombre: doc.data().nombre
    }));
    console.log(JSON.stringify(franquicias, null, 2));
}

audit().catch(console.error);
