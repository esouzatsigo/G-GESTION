import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';

async function checkDuplicates() {
    console.log("--- BUSCANDO UNIVERSOS PARALELOS (CLIENTES DUPLICADOS) ---");

    const clientsSnap = await getDocs(collection(db, 'clientes'));
    const clientsByName: Record<string, any[]> = {};

    clientsSnap.forEach(doc => {
        const data = doc.data();
        const name = data.nombre;
        if (!clientsByName[name]) clientsByName[name] = [];
        clientsByName[name].push({ id: doc.id, ...data });
    });

    for (const [name, list] of Object.entries(clientsByName)) {
        if (list.length > 1) {
            console.log(`\n⚠️ DUPLICADO DETECTADO: "${name}" (${list.length} instancias)`);
            for (const c of list) {
                console.log(`   - ID: ${c.id} | Razón Social: ${c.razonSocial}`);

                // Contar familias
                const famsSnap = await getDocs(query(collection(db, 'familias'), where('clienteId', '==', c.id)));
                const catsSnap = await getDocs(query(collection(db, 'catalogos'), where('clienteId', '==', c.id), where('categoria', '==', 'Familia')));

                console.log(`     -> Familias (Nuevas): ${famsSnap.size}`);
                console.log(`     -> Familias (Viejas): ${catsSnap.size}`);
            }
        }
    }

    console.log("\n--- FIN DEL DIAGNÓSTICO ---");
    process.exit(0);
}

checkDuplicates().catch(console.error);
