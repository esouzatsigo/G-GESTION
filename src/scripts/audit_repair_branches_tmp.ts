import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

async function auditAndRepairBranches() {
    console.log("🕵️ Iniciando Auditoría de Vínculos de Sucursales...");

    // 1. Cargar todas las sucursales
    const sucsSnap = await getDocs(collection(db, 'sucursales'));
    const allSucs = sucsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 2. Cargar todos los usuarios
    const usersSnap = await getDocs(collection(db, 'usuarios'));
    const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log(`Analizando ${allUsers.length} usuarios y ${allSucs.length} sucursales...`);

    for (const user of allUsers) {
        if (!user.sucursalesPermitidas || user.sucursalesPermitidas.includes('TODAS')) continue;

        const currentPermitidas = user.sucursalesPermitidas;
        const correctIds = [];
        let repairNeeded = false;

        for (const sucId of currentPermitidas) {
            // Verificar si el ID existe en el cliente del usuario
            const exists = allSucs.find(s => s.id === sucId && s.clienteId === user.clienteId);

            if (exists) {
                correctIds.push(sucId);
            } else {
                // BUG DETECTADO: El ID no existe para este cliente. Buscar por nomenclatura.
                console.log(`⚠️ Mismatch en usuario ${user.nombre} (${user.email}): ID "${sucId}" no pertenece al cliente ${user.clienteId}`);

                // Buscar la sucursal "Sombra" correcta por nomenclatura
                // Primero necesitamos saber la nomenclatura del ID fallido (si existe en el universo global)
                const globalSuc = allSucs.find(s => s.id === sucId);
                const nomenclature = globalSuc?.nomenclatura || sucId; // A veces el ID es la nomenclatura (como "BA")

                const shadowSuc = allSucs.find(s => s.clienteId === user.clienteId && (s.nomenclatura === nomenclature || s.id === nomenclature));

                if (shadowSuc) {
                    console.log(`✅ Reparación sugerida: Cambiar "${sucId}" por "${shadowSuc.id}" (Sucursal: ${shadowSuc.nombre})`);
                    correctIds.push(shadowSuc.id);
                    repairNeeded = true;
                } else {
                    console.log(`❌ ERROR CRÍTICO: No se encontró sucursal de reemplazo para "${sucId}" en el cliente ${user.clienteId}`);
                }
            }
        }

        if (repairNeeded) {
            console.log(`🔧 Ejecutando reparación para ${user.email}...`);
            await updateDoc(doc(db, 'usuarios', user.id), {
                sucursalesPermitidas: correctIds
            });
        }
    }

    console.log("🏁 Auditoría y Reparación finalizada.");
}

auditAndRepairBranches().catch(console.error);
