import { doc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';

async function restoreHijackedData() {
    console.log("--- RESTAURACIÓN DE SUCURSAL SECUESTRADA (BA) ---");

    // 1. Encontrar el ID REAL de BPT GROUP
    const q = query(collection(db, 'clientes'), where('nombre', '==', 'BPT GROUP'));
    const snap = await getDocs(q);

    if (snap.empty) {
        console.error("❌ ERROR CRÍTICO: No se encontró el cliente 'BPT GROUP' para restaurar.");
        process.exit(1);
    }

    const realClienteId = snap.docs[0].id;
    console.log(`✅ ID Real de BPT GROUP: ${realClienteId}`);

    // 2. Restaurar Sucursal BA
    const sucRef = doc(db, 'sucursales', 'BA');
    await updateDoc(sucRef, { clienteId: realClienteId });
    console.log(`✅ Sucursal 'BA' restaurada al ClienteID: ${realClienteId}`);

    // 3. Restaurar Equipos de Altabrisa
    const eqQuery = query(collection(db, 'equipos'), where('sucursalId', '==', 'BA'));
    const eqsSnap = await getDocs(eqQuery);

    console.log(`Restaurando ${eqsSnap.size} equipos...`);
    for (const eqDoc of eqsSnap.docs) {
        await updateDoc(doc(db, 'equipos', eqDoc.id), { clienteId: realClienteId });
        console.log(`   - Equipo ${eqDoc.id} restaurado.`);
    }

    console.log("\n--- RESTAURACIÓN COMPLETADA CON ÉXITO ---");
    process.exit(0);
}

restoreHijackedData().catch(console.error);
