
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Read firebase config from src/services/firebase.ts
const firebaseConfigContent = fs.readFileSync(path.join(__dirname, '../src/services/firebase.ts'), 'utf8');
const configMatch = firebaseConfigContent.match(/const firebaseConfig = ({[\s\S]+?});/);
const config = eval(`(${configMatch[1]})`);

const app = initializeApp(config);
const db = getFirestore(app);

async function getIds() {
    const sucursalPrefix = "B Altabrisa"; // or "BA"
    const sucursalesSnap = await getDocs(collection(db, 'sucursales'));
    const sucursales = sucursalesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log("SUCURSALES:");
    sucursales.filter(s => s.nombre.includes("Altabrisa") || s.nombre.includes("BA")).forEach(s => {
        console.log(`ID: ${s.id}, Nombre: ${s.nombre}, FranquiciaId: ${s.franquiciaId}`);
    });

    const franquiciasSnap = await getDocs(collection(db, 'franquicias'));
    const franquicias = franquiciasSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log("\nFRANQUICIAS:");
    franquicias.forEach(f => {
        console.log(`ID: ${f.id}, Nombre: ${f.nombre}`);
    });
}

getIds().catch(console.error);
