
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
    storageBucket: "h-gestion-dev.firebasestorage.app",
    messagingSenderId: "198928689880",
    appId: "1:198928689880:web:7f90dcd33e710fcc7505ad",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkMapping() {
    console.log("--- ANÁLISIS DE MAPEADO FAMILIA -> INTERNALID ---");

    const clients = ['3de6K2GeasZhN2GIQWXw', 'HXIjyDoFvWl00Qs29QPw', 'kWRmv16DNfMUlSF1Yqiv'];
    
    for (const clientId of clients) {
        console.log(`\nCLIENTE: ${clientId}`);
        
        // Cargar Catálogos y Familias
        const catsSnap = await getDocs(query(collection(db, 'catalogos'), where('clienteId', '==', clientId), where('categoria', '==', 'Familia')));
        const famsSnap = await getDocs(query(collection(db, 'familias'), where('clienteId', '==', clientId)));
        
        const catalogMap = {};
        catsSnap.forEach(d => {
            const data = d.data();
            catalogMap[data.nomenclatura] = d.id;
            catalogMap[data.nombre] = d.id;
        });
        famsSnap.forEach(d => {
            const data = d.data();
            catalogMap[data.nomenclatura] = d.id;
            catalogMap[data.nombre] = d.id;
        });

        console.log(` - Registros de catálogo/familias encontrados: ${Object.keys(catalogMap).length}`);

        // Revisar equipos
        const eqsSnap = await getDocs(query(collection(db, 'equipos'), where('clienteId', '==', clientId)));
        console.log(` - Total Equipos: ${eqsSnap.size}`);

        let matched = 0;
        let unmatchedFamilies = new Set();

        eqsSnap.forEach(d => {
            const data = d.data();
            if (catalogMap[data.familia]) {
                matched++;
            } else {
                unmatchedFamilies.add(data.familia);
            }
        });

        console.log(` - Equipos con match exitoso: ${matched}`);
        if (unmatchedFamilies.size > 0) {
            console.log(` - Familias SIN match: ${Array.from(unmatchedFamilies).join(', ')}`);
        }
    }
}

checkMapping().catch(console.error);
