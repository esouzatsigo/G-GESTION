import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';

async function main() {
    const q = query(collection(db, 'franquicias'), where('clienteId', '==', '3de6K2GeasZhN2GIQWXw'));
    const snap = await getDocs(q);
    const results: any[] = [];
    snap.docs.forEach(doc => {
        const d = doc.data();
        if (d.logoUrl || d.colorFondo) {
            results.push({ nombre: d.nombre, logoUrl: d.logoUrl, colorFondo: d.colorFondo });
        }
    });
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
}
main();
