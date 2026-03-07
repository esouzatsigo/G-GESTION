import { db } from './src/services/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function verify() {
    const colRef = collection(db, 'planPreventivo2026');
    const snapshot = await getDocs(colRef);
    console.log(`Documentos en planPreventivo2026: ${snapshot.size}`);

    snapshot.forEach(d => {
        const data = d.data();
        console.log(`Mes: ${data.mes}, Fechas: ${data.fechas}, Sucursal: ${data.txtPDF}`);
    });
}

verify();
