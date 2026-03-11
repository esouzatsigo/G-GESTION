import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

async function seedShadowEquipos() {
    console.log("🚀 Iniciando sembrado de Equipos Sombra...");

    const sourceClienteId = "HXIjyDoFvWl00Qs29QPw"; // BPT GROUP (Real)
    const targetClienteId = "3de6K2GeasZhN2GIQWXw"; // TEST BPT (Shadow)

    // 1. Cargar todas las sucursales para mapeo de IDs
    const sucsSnap = await getDocs(collection(db, 'sucursales'));
    const allSucs = sucsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 2. Cargar equipos del cliente origen
    const sourceEqQuery = query(collection(db, 'equipos'), where('clienteId', '==', sourceClienteId));
    const sourceSnap = await getDocs(sourceEqQuery);
    const sourceEquipos = sourceSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log(`📦 Encontrados ${sourceEquipos.length} equipos en cliente origen.`);

    let seedCount = 0;

    for (const eq of sourceEquipos) {
        // Encontrar la sucursal origen para saber su nomenclatura
        const sourceSuc = allSucs.find(s => s.id === eq.sucursalId);
        if (!sourceSuc) {
            console.log(`⚠️ Equipo [${eq.id}] tiene sucursalId [${eq.sucursalId}] que no existe en el catálogo global.`);
            continue;
        }

        const nomenclature = sourceSuc.nomenclatura || sourceSuc.id;

        // Encontrar la sucursal destino con la misma nomenclatura
        const targetSuc = allSucs.find(s => s.clienteId === targetClienteId && (s.nomenclatura === nomenclature || s.id === nomenclature));

        if (targetSuc) {
            const newEq = {
                ...eq,
                clienteId: targetClienteId,
                sucursalId: targetSuc.id,
                batchTag: `SEED_SHADOW_FIX_20260310`,
                createdAt: new Date().toISOString()
            };
            delete (newEq as any).id; // Firestore generará nuevo ID

            await addDoc(collection(db, 'equipos'), newEq);
            seedCount++;
            if (seedCount % 10 === 0) console.log(`✅ Sembrados ${seedCount} equipos...`);
        } else {
            // No existe la sucursal sombra para esa nomenclatura en el target
            // Esto es normal para algunas sucursales que quizás no se sembraron
        }
    }

    console.log(`🏁 Sembrado completo. Total equipos creados para TEST BPT: ${seedCount}`);
}

seedShadowEquipos().catch(console.error);
