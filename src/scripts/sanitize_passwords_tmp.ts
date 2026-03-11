import { collection, getDocs, updateDoc, doc, deleteField } from 'firebase/firestore';
import { db } from '../services/firebase';

async function sanitizePasswords() {
    console.log("--- 🛡️ INICIANDO PARCHE DE SEGURIDAD: EXTIRPACIÓN DE CONTRASEÑAS EN TEXTO PLANO ---");

    // 1. Obtener todos los usuarios
    const usersSnap = await getDocs(collection(db, 'usuarios'));
    console.log(`📊 Total de usuarios a procesar: ${usersSnap.size}`);

    let count = 0;
    let skipped = 0;

    for (const userDoc of usersSnap.docs) {
        const data = userDoc.data();

        if (data.contrasena !== undefined) {
            console.log(`   ⏳ Limpiando usuario: [${data.email || userDoc.id}]...`);

            // Usar deleteField() para eliminar la propiedad por completo
            await updateDoc(doc(db, 'usuarios', userDoc.id), {
                contrasena: deleteField()
            });

            count++;
        } else {
            skipped++;
        }
    }

    console.log("\n--- ✨ RESULTADOS DEL PARCHE ---");
    console.log(`✅ Usuarios limpios (campo extirpado): ${count}`);
    console.log(`ℹ️ Usuarios que ya estaban seguros: ${skipped}`);
    console.log(`Total procesado: ${usersSnap.size}`);

    process.exit(0);
}

sanitizePasswords().catch(err => {
    console.error("❌ ERROR CRÍTICO durante la sanitización:", err);
    process.exit(1);
});
