import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function unifyAllAltabrisas() {
    const targetClient = '3de6K2GeasZhN2GIQWXw';
    const newSucId = 'BA';

    // 1. Obtener todas las sucursales llamadas "Altabrisa" o "Boston's Altabrisa"
    const sucsSnap = await getDocs(collection(db, 'sucursales'));
    const altabrisaIds: string[] = [];
    sucsSnap.forEach(d => {
        if (d.data().nombre.toLowerCase().includes('altabrisa')) {
            altabrisaIds.push(d.id);
        }
    });

    console.log(`Sucursales Altabrisa detectadas (Cualquier cliente): ${JSON.stringify(altabrisaIds)}`);

    // 2. Mover todos los equipos de TEST BPT que estén en cualquiera de estas sucursales a "BA"
    const eqQ = query(collection(db, 'equipos'), where('clienteId', '==', targetClient));
    const eqSnap = await getDocs(eqQ);
    console.log(`Analizando ${eqSnap.size} equipos de TEST BPT...`);

    let moved = 0;
    for (const d of eqSnap.docs) {
        const data = d.data();
        if (altabrisaIds.includes(data.sucursalId) && data.sucursalId !== newSucId) {
            await updateDoc(doc(db, 'equipos', d.id), {
                sucursalId: newSucId
            });
            moved++;
        }
    }

    console.log(`Unificación total: ${moved} equipos movidos a la sucursal final "BA".`);
}

unifyAllAltabrisas().catch(console.error);
