import { db } from './src/services/firebase';
import { collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

async function verify() {
    const colRef = collection(db, 'planPreventivo2026');
    const snapshot = await getDocs(colRef);
    let output = `Documentos en planPreventivo2026: ${snapshot.size}\n`;

    snapshot.forEach(d => {
        const data = d.data();
        output += `Mes: ${data.mes}, Fechas: ${data.fechas}, Sucursal: ${data.txtPDF}\n`;
    });
    fs.writeFileSync('verify_output.txt', output);
}

verify();
