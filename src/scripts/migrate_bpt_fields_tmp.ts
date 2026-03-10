import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';

async function main() {
    console.log("Migrando sitioWeb y colorFondo completo...");

    // Test BPT = 3de6K2GeasZhN2GIQWXw
    // BPT GROUP = HXIjyDoFvWl00Qs29QPw

    const qTestBpt = query(collection(db, 'franquicias'), where('clienteId', '==', '3de6K2GeasZhN2GIQWXw'));
    const snapTestBpt = await getDocs(qTestBpt);
    const franquiciasOrigen = snapTestBpt.docs.map(d => d.data());

    const qBptGroup = query(collection(db, 'franquicias'), where('clienteId', '==', 'HXIjyDoFvWl00Qs29QPw'));
    const snapBptGroup = await getDocs(qBptGroup);

    let actualizadas = 0;

    for (const docDestino of snapBptGroup.docs) {
        const nombreFranquicia = docDestino.data().nombre;
        const franquiciaOriginal = franquiciasOrigen.find(f => f.nombre === nombreFranquicia);

        if (franquiciaOriginal) {
            console.log(`🔄 Actualizando [${nombreFranquicia}]...`);
            const updates: any = {};

            // Transfer colorFondo exactly as it is (including falsy/nulls if applicable, but default to #FFFFFF if missing in original)
            if (franquiciaOriginal.colorFondo !== undefined) {
                updates.colorFondo = franquiciaOriginal.colorFondo;
                console.log(`   - colorFondo: ${updates.colorFondo}`);
            }

            // Transfer sitioWeb
            if (franquiciaOriginal.sitioWeb !== undefined) {
                updates.sitioWeb = franquiciaOriginal.sitioWeb;
                console.log(`   - sitioWeb: ${updates.sitioWeb}`);
            }

            if (Object.keys(updates).length > 0) {
                await updateDoc(doc(db, 'franquicias', docDestino.id), updates);
                actualizadas++;
            }
        }
    }

    console.log(`\n🎉 Migración completada. Se actualizaron ${actualizadas} franquicias.`);
    process.exit(0);
}

main().catch(console.error);
