
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

const firebaseConfigContent = fs.readFileSync(path.join(__dirname, '../src/services/firebase.ts'), 'utf8');
const configMatch = firebaseConfigContent.match(/const firebaseConfig = ({[\s\S]+?});/);
const config = eval(`(${configMatch[1]})`);

const app = initializeApp(config);
const db = getFirestore(app);

async function addPreventivo() {
    const entry = {
        mes: 2, // Marzo
        fechas: '6',
        sucursalId: 'BA',
        franquiciaId: '6FLWZQZAaudZG60UrLTY', // Boston's
        txtPDF: 'B Altabrisa'
    };

    const docRef = await addDoc(collection(db, 'planPreventivo2026'), entry);
    console.log(`Documento agregado con ID: ${docRef.id}`);
}

addPreventivo().catch(console.error);
