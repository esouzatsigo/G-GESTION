import { collection, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

async function main() {
    const snap = await getDocs(collection(db, 'ordenesTrabajo'));
    let fixedCount = 0;

    for (const d of snap.docs) {
        const data = d.data();
        if (data.fotosGerente && Array.isArray(data.fotosGerente)) {
            let changed = false;
            const newPhotos = data.fotosGerente.map((p: string) => {
                if (typeof p === 'string' && p.includes('Sin título')) {
                    changed = true;
                    return p.replace('Sin título', 'kardex_');
                }
                return p;
            });

            if (changed) {
                await updateDoc(d.ref, { fotosGerente: newPhotos });
                console.log(`✅ OT #${data.numero} actualizada.`);
                fixedCount++;
            }
        }
    }

    console.log(`\n🎉 Resumen: ${fixedCount} OTs corregidas.`);
    process.exit(0);
}
main();
