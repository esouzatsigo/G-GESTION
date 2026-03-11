const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

// Cargar credenciales
const serviceAccount = require('C:/Users/HACel/Documents/T-SIGO/Proyectos/H-GESTION/serviceAccountKey.json');

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function purgeFamiliesGlobal() {
    console.log("🚀 INICIANDO PURGA GLOBAL DE FAMILIAS (Estandarización Maestra)");

    // 1. Obtener todas las familias
    const familiesSnap = await db.collection('familias').get();
    const allFamilies = familiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    console.log(`🔍 Encontradas ${allFamilies.length} familias totales.`);

    // 2. Agrupar por nombre (normalizado)
    const groups = {};
    allFamilies.forEach(f => {
        const nameNormalized = (f.nombre || '').trim().toUpperCase();
        if (!groups[nameNormalized]) {
            groups[nameNormalized] = [];
        }
        groups[nameNormalized].push(f);
    });

    console.log(`📊 Agrupadas en ${Object.keys(groups).length} nombres únicos.`);

    for (const name in groups) {
        const list = groups[name];
        if (list.length <= 1) continue;

        console.log(`\n⚖️ Procesando duplicados de: "${name}" (${list.length} entradas)`);

        // Elegir ganador (el que no tenga clienteId si existe, o el primero)
        const winner = list.find(f => !f.clienteId) || list[0];
        const losers = list.filter(f => f.id !== winner.id);

        console.log(`   👑 Ganador: ${winner.id}`);

        for (const loser of losers) {
            console.log(`   🔸 Fusionando legado: ${loser.id} (Cliente: ${loser.clienteId || 'N/A'})`);

            // Re-vincular equipos que usen el ID perdedor
            const equiposSnap = await db.collection('equipos').where('familiaId', '==', loser.id).get();
            
            if (!equiposSnap.empty) {
                console.log(`      🔄 Re-vinculando ${equiposSnap.length} equipos...`);
                const batch = db.batch();
                equiposSnap.docs.forEach(doc => {
                    batch.update(doc.ref, { familiaId: winner.id });
                });
                await batch.commit();
            }

            // Eliminar la familia duplicada
            await db.collection('familias').doc(loser.id).delete();
            console.log(`      🗑️ Eliminada familia duplicada ${loser.id}`);
        }
    }

    console.log("\n✅ FIN DEL PROCESO: El catálogo de familias ahora es Maestro y Global.");
}

purgeFamiliesGlobal().catch(console.error);
