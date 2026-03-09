/**
 * SCRIPT: Migrar Logos y Colores de Franquicias (Test BPT -> BPT GROUP)
 * 
 * Busca las franquicias en el cliente "Test BPT" (donde estaban los logos originales)
 * y copia el logoUrl y colorFondo a la franquicia con el mismo nombre en "BPT GROUP".
 */

import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { trackedUpdateDoc } from '../services/firestoreHelpers';
import { db } from '../services/firebase';

async function main() {
    console.log("Iniciando migración de logos y colores de franquicias...");

    // 1. Obtener los IDs de ambos clientes
    const qTestBpt = query(collection(db, 'clientes'), where('nombre', '==', 'TEST BPT'));
    const snapTestBpt = await getDocs(qTestBpt);
    if (snapTestBpt.empty) {
        console.error("⛔ No se encontró el cliente 'TEST BPT'.");
        process.exit(1);
    }
    const idTestBpt = snapTestBpt.docs[0].id;

    const qBptGroup = query(collection(db, 'clientes'), where('nombre', '==', 'BPT GROUP'));
    const snapBptGroup = await getDocs(qBptGroup);
    if (snapBptGroup.empty) {
        console.error("⛔ No se encontró el cliente 'BPT GROUP'.");
        process.exit(1);
    }
    const idBptGroup = snapBptGroup.docs[0].id;

    console.log(`✅ Origen (TEST BPT): ${idTestBpt}`);
    console.log(`✅ Destino (BPT GROUP): ${idBptGroup}\n`);

    // 2. Obtener franquicias de Test BPT
    const qFranqOrigen = query(collection(db, 'franquicias'), where('clienteId', '==', idTestBpt));
    const snapFranqOrigen = await getDocs(qFranqOrigen);
    const franquiciasOrigen = snapFranqOrigen.docs.map(d => d.data());

    console.log(`Se encontraron ${franquiciasOrigen.length} franquicias en el origen.`);

    // 3. Obtener franquicias de BPT GROUP
    const qFranqDestino = query(collection(db, 'franquicias'), where('clienteId', '==', idBptGroup));
    const snapFranqDestino = await getDocs(qFranqDestino);

    let actualizadas = 0;

    // 4. Mapear y actualizar
    for (const docDestino of snapFranqDestino.docs) {
        const dataDestino = docDestino.data();
        const nombreFranquicia = dataDestino.nombre;

        // Buscar la equivalente en el origen
        const franquiciaOriginal = franquiciasOrigen.find(f => f.nombre === nombreFranquicia);

        if (franquiciaOriginal) {
            const hasLogo = franquiciaOriginal.logoUrl && franquiciaOriginal.logoUrl !== '';
            const hasColor = franquiciaOriginal.colorFondo && franquiciaOriginal.colorFondo !== '#FFFFFF' && franquiciaOriginal.colorFondo !== '#000000';

            if (hasLogo || hasColor) {
                console.log(`🔄 Actualizando [${nombreFranquicia}]...`);

                const updates: any = {};
                if (hasLogo) {
                    updates.logoUrl = franquiciaOriginal.logoUrl;
                    console.log(`   - Logo: ${franquiciaOriginal.logoUrl.substring(0, 30)}...`);
                }
                if (hasColor) {
                    updates.colorFondo = franquiciaOriginal.colorFondo;
                    console.log(`   - Color: ${franquiciaOriginal.colorFondo}`);
                }

                await trackedUpdateDoc(doc(db, 'franquicias', docDestino.id), updates);
                actualizadas++;
            } else {
                console.log(`⏩ Saltando [${nombreFranquicia}]: No tiene logo ni color personalizado en Test BPT.`);
            }
        } else {
            console.log(`⚠️ No se encontró la franquicia [${nombreFranquicia}] en Test BPT para copiar sus datos.`);
        }
    }

    console.log(`\n🎉 Migración completada. Se actualizaron ${actualizadas} franquicias en BPT GROUP.`);
    process.exit(0);
}

main().catch(console.error);
