import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function checkOT() {
    const num = 1003;
    const q = query(collection(db, 'ordenesTrabajo'), where('numero', '==', num));
    const snap = await getDocs(q);

    if (snap.empty) {
        console.log(`OT ${num} no encontrada.`);
        return;
    }

    snap.forEach(d => {
        const data = d.data();
        console.log(`--- OT #${data.numero} ---`);
        console.log(`ID en BD: ${d.id}`);
        console.log(`Estatus: ${data.estatus}`);
        console.log(`Asignada a tecnicoId: ${data.tecnicoId || 'NINGUNO'}`);
        console.log(`Cliente ID: ${data.clienteId}`);
        console.log(`Fechas:`, JSON.stringify(data.fechas));
    });
}
checkOT().catch(console.error);
