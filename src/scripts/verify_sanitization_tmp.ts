import { collection, getDocs, limit, query } from 'firebase/firestore';
import { db } from '../services/firebase';

async function verifySanitization() {
    console.log("--- 🏁 VERIFICACIÓN POST-PARCHE DE SEGURIDAD ---");

    // Obtener una muestra de 10 usuarios aleatorios
    const usersSnap = await getDocs(query(collection(db, 'usuarios'), limit(10)));

    let totalChecked = 0;
    let failures = 0;

    for (const userDoc of usersSnap.docs) {
        const data = userDoc.data();
        totalChecked++;

        if (data.hasOwnProperty('contrasena')) {
            console.error(`❌ FALLO DE SEGURIDAD: El usuario [${data.email || userDoc.id}] todavía tiene el campo 'contrasena'.`);
            failures++;
        } else {
            console.log(`✅ Usuario seguro: [${data.email || userDoc.id}] (Sin rastro de texto plano).`);
        }
    }

    if (failures === 0) {
        console.log("\n🛡️ VERIFICACIÓN COMPLETADA: El parche fue exitoso en toda la muestra.");
    } else {
        console.error("\n⚠️ ALERTA: Se detectaron fallos en la verificación.");
    }

    process.exit(0);
}

verifySanitization().catch(err => {
    console.error("❌ ERROR durante la verificación:", err);
    process.exit(1);
});
