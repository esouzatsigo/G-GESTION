import { doc, getDoc } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function checkOTExternaFolio() {
    const clienteId = '3de6K2GeasZhN2GIQWXw'; // TEST BPT
    const counterDocId = `counters_${clienteId}`;

    const snap = await getDoc(doc(db, 'config', counterDocId));

    if (snap.exists()) {
        const data = snap.data();
        console.log(`--- Configuración Counters TEST BPT ---`);
        console.log(`Último Folio OT Normal: ${data.ot}`);
        console.log(`Último Folio OT Externa: ${data.otExterna || 'No inicializado'}`);
        console.log(`Último Folio OT Preventivo: ${data.otPreventivo || 'No inicializado'}`);
    } else {
        console.log(`El documento de configuración 'config/${counterDocId}' no existe.`);
    }
}

checkOTExternaFolio().catch(console.error);
