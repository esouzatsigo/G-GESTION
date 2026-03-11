import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, getDocs, orderBy, limit } from "firebase/firestore";

const TEST_BPT_CONFIG = {
    apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
    authDomain: "h-gestion-testbpt.firebaseapp.com",
    projectId: "h-gestion-testbpt",
    storageBucket: "h-gestion-testbpt.firebasestorage.app",
    messagingSenderId: "385439061540",
    appId: "1:385439061540:web:95c1461abd46400724eab1",
};

async function auditReversion() {
  console.log("🔍 Iniciando Auditoría de Reversión de IDs en TEST BPT...");
  const app = initializeApp(TEST_BPT_CONFIG);
  const db = getFirestore(app);
  
  const bitacoraRef = collection(db, 'bitacora');
  const q = query(
      bitacoraRef, 
      orderBy('fecha', 'desc'),
      limit(500)
  );

  console.log("📡 Consultando registros de HOY (2026-03-11)...");
  const snap = await getDocs(q);
  
  const today = "2026-03-11";
  const relevantChanges: any[] = [];
  
  snap.docs.forEach(d => {
      const data = d.data() as any;
      const dataStr = JSON.stringify(data);
      if (data.fecha?.includes(today) && (dataStr.includes('"BA"') || data.valorNuevo === 'BA' || data.campo === 'sucursalId')) {
          relevantChanges.push({ id: d.id, ...data });
      }
  });

  if (relevantChanges.length === 0) {
      console.log(`❌ No se encontraron cambios sospechosos con 'BA' el día de hoy (${today}).`);
      
      console.log("\n📋 Mostrando ÚLTIMOS 10 registros de la bitácora (sin filtros):");
      snap.docs.slice(0, 10).forEach(d => {
          const data = d.data() as any;
          console.log(`- [${data.fecha}] User: ${data.usuarioNombre} | Acción: ${data.accion} | Campo: ${data.campo} | Nuevo: ${data.valorNuevo}`);
      });
  } else {
      console.log(`✅ Se encontraron ${relevantChanges.length} cambios sospechosos HOY:`);
      relevantChanges.forEach(data => {
          console.log(`- [${data.fecha}] User: ${data.usuarioNombre} | Acción: ${data.accion} | Campo: ${data.campo} | Nuevo: ${data.valorNuevo} | ID: ${data.otId}`);
      });
  }

  // 2. Revisar bitacoraPreventivos2026 también
  console.log("\n📡 Consultando bitacoraPreventivos2026...");
  const prevSnap = await getDocs(collection(db, 'bitacoraPreventivos2026'));
  if (!prevSnap.empty) {
      console.log(`✅ Se encontraron ${prevSnap.size} registros en bitacoraPreventivos2026.`);
      prevSnap.docs.forEach(d => {
          const data = d.data() as any;
          if (data.fecha?.includes(today) && JSON.stringify(data).includes('"BA"')) {
              console.log(`- [${data.fecha}] User: ${data.usuarioNombre} | Acción: ${data.accion} | (Menciona BA)`);
          }
      });
  }
}

auditReversion().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
