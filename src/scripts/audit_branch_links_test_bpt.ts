import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

const TEST_BPT_CONFIG = {
    apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
    authDomain: "h-gestion-testbpt.firebaseapp.com",
    projectId: "h-gestion-testbpt",
    storageBucket: "h-gestion-testbpt.firebasestorage.app",
    messagingSenderId: "385439061540",
    appId: "1:385439061540:web:95c1461abd46400724eab1",
};

async function auditBranchLinks() {
  const app = initializeApp(TEST_BPT_CONFIG);
  const db = getFirestore(app);
  
  // 1. Cargar Sucursales
  const sucSnap = await getDocs(collection(db, 'sucursales'));
  const sucursales = sucSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  console.log(`\n--- SUCURSALES EN TEST_BPT (${sucursales.length}) ---`);
  sucursales.forEach(s => {
    console.log(`ID: ${s.id.padEnd(20)} | Nombre: ${s.nombre}`);
  });

  // 2. Cargar un Gerente para ver qué sucursales tiene
  const userDoc = await getDoc(doc(db, 'usuarios', 'Gerente.BA'));
  const userData = userDoc.data();
  console.log(`\n--- USUARIO: ${userData?.nombre} ---`);
  console.log(`Sucursales Permitidas (IDs): ${userData?.sucursalesPermitidas}`);

  // 3. Auditar equipos por SucursalId
  const eqSnap = await getDocs(collection(db, 'equipos'));
  console.log(`\n--- AUDITORÍA DE EQUIPOS POR SUCURSAL (${eqSnap.size}) ---`);
  
  const branchCounts: Record<string, number> = {};
  const unknownBranches: Set<string> = new Set();
  
  eqSnap.docs.forEach(doc => {
    const data = doc.data();
    const sId = data.sucursalId;
    branchCounts[sId] = (branchCounts[sId] || 0) + 1;
    if (!sucursales.find(s => s.id === sId)) {
      unknownBranches.add(sId);
    }
  });

  console.log(`\nDistribución de equipos por SucursalId:`);
  Object.entries(branchCounts).forEach(([id, count]) => {
    const suc = sucursales.find(s => s.id === id);
    console.log(`ID: ${id.padEnd(20)} | Nombre: ${(suc?.nombre || '⚠️ DESCONOCIDA').padEnd(20)} | Equipos: ${count}`);
  });
  
  if (unknownBranches.size > 0) {
    console.log(`\n❌ IDs DE SUCURSAL HUÉRFANOS (Existen en equipos pero no en la colección sucursales):`);
    unknownBranches.forEach(id => console.log(` - ${id}`));
  }
}

auditBranchLinks().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
