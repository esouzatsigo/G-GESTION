import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

async function main() {
    const q = query(collection(db, 'ordenesTrabajo'), where('numero', '==', 1001));
    const snap = await getDocs(q);

    if (snap.empty) {
        console.log("No se encontró la OT #1001");
    } else {
        const docRef = snap.docs[0].ref;
        const data = snap.docs[0].data();

        if (data.fotosGerente) {
            const newPhotos = data.fotosGerente.map((p: string) => {
                if (p.includes('Sin título')) {
                    return p.replace('Sin título', 'kardex_');
                }
                return p;
            });

            await updateDoc(docRef, { fotosGerente: newPhotos });
            console.log("OT #1001 actualizada con nuevas rutas de fotos.");
        }
    }
    process.exit(0);
}
main();
