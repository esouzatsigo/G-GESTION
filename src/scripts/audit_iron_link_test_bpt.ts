import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const TEST_BPT_CONFIG = {
    apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
    authDomain: "h-gestion-testbpt.firebaseapp.com",
    projectId: "h-gestion-testbpt",
    storageBucket: "h-gestion-testbpt.firebasestorage.app",
    messagingSenderId: "385439061540",
    appId: "1:385439061540:web:95c1461abd46400724eab1",
};

async function auditIronLink() {
  const app = initializeApp(TEST_BPT_CONFIG);
  const db = getFirestore(app);
  
  // 1. Cargar Familias
  const famSnap = await getDocs(collection(db, 'familias'));
  const familias = famSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
  console.log(`\n--- FAMILIAS EN TEST_BPT (${familias.length}) ---`);
  familias.forEach(f => {
    console.log(`ID: ${f.id} | Nombre: ${f.nombre} | Nomenclatura: ${f.nomenclatura}`);
  });

  // 2. Cargar Equipos (muestra de los primeros 20)
  const eqSnap = await getDocs(collection(db, 'equipos'));
  console.log(`\n--- AUDITORÍA DE EQUIPOS (${eqSnap.size}) ---`);
  
  let validCount = 0;
  let brokenCount = 0;
  
  eqSnap.docs.forEach((doc, index) => {
    const data = doc.data();
    const hasFamiliaId = !!data.familiaId;
    const familiaText = data.familia;
    
    // Buscar si el familiaId coincide con alguna familia real
    const matchedFam = familias.find(f => f.id === data.familiaId);
    
    if (index < 30) {
        console.log(`Eq: ${data.nombre.substring(0, 30).padEnd(30)} | FamiliaText: ${String(familiaText).padEnd(15)} | FamID: ${String(data.familiaId).padEnd(15)} | Vínculo: ${matchedFam ? '✅ OK' : '❌ ROTO'}`);
    }
    
    if (matchedFam) validCount++; else brokenCount++;
  });
  
  console.log(`\n--- RESUMEN ---`);
  console.log(`Equipos con Vínculo OK:   ${validCount}`);
  console.log(`Equipos con Vínculo ROTO: ${brokenCount}`);
}

auditIronLink().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
