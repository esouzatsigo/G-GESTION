import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";

const TEST_BPT_CONFIG = {
    apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
    authDomain: "h-gestion-testbpt.firebaseapp.com",
    projectId: "h-gestion-testbpt",
    storageBucket: "h-gestion-testbpt.firebasestorage.app",
    messagingSenderId: "385439061540",
    appId: "1:385439061540:web:95c1461abd46400724eab1",
};

// MAPEO DE UNIFICACIÓN (Legacy ID -> Real Firestore ID en TEST BPT)
const BRANCH_UNIFICATION_MAP: Record<string, string> = {
    'BA': 'HuwoZsAHef5kCZwCFirU',     // Altabrisa (Oficial Clean Slate)
    'BCA': 'G8uSICvhYBN5e7C5aXvj',    // Caucel (Boston's)
    // Agregaremos otros si detectamos más huérfanos con IDs simplificados
};

async function fixIronLink() {
  const app = initializeApp(TEST_BPT_CONFIG);
  const db = getFirestore(app);
  
  console.log("🚀 Iniciando reparación de Vínculo de Hierro en TEST BPT...");

  // 1. Re-vincular Equipos
  const eqSnap = await getDocs(collection(db, 'equipos'));
  let fixedCount = 0;
  
  for (const eqDoc of eqSnap.docs) {
    const data = eqDoc.data();
    const legacyId = data.sucursalId;
    const realId = BRANCH_UNIFICATION_MAP[legacyId];
    
    if (realId) {
      console.log(`🛠️ Reparando equipo: ${data.nombre} (${legacyId} -> ${realId})`);
      await updateDoc(doc(db, 'equipos', eqDoc.id), {
        sucursalId: realId
      });
      fixedCount++;
    }
  }

  console.log(`\n✅ Se re-vincularon ${fixedCount} equipos.`);

  // 2. Eliminar sucursales duplicadas (Legacy IDs)
  console.log("\n🧹 Limpiando sucursales duplicadas (Legacy IDs)...");
  for (const legacyId of Object.keys(BRANCH_UNIFICATION_MAP)) {
    try {
      await deleteDoc(doc(db, 'sucursales', legacyId));
      console.log(`🗑️ Sucursal eliminada: ${legacyId}`);
    } catch (e: any) {
      console.warn(`⚠️ No se pudo eliminar sucursal ${legacyId}: ${e.message}`);
    }
  }

  console.log("\n✨ Operación completada con éxito.");
}

fixIronLink().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
