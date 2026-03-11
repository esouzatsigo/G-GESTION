import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection, query, where, doc, updateDoc } from "firebase/firestore";

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

const CORP_ID = '3de6K2GeasZhN2GIQWXw';
const BPT_ID = '3de6K2GeasZhN2GIQWXw';

async function syncFromBPTtoCorp() {
    try {
        console.log("Iniciando copia selectiva de Nombres/Datos de TEST BPT hacia CORPORATIVO NACIONAL...");

        // 1. Obtener Equipos de BPT para robar los nombres reales
        const bptEquiposSnap = await getDocs(query(collection(db, 'equipos'), where('clienteId', '==', BPT_ID)));
        const nombresRealesBase = bptEquiposSnap.docs.map(d => d.data().nombre).filter(Boolean);
        let nombresReales = [...nombresRealesBase];

        // 2. Afinar Sucursales de Corporativo (Altabrisa como Joya de la Corona y de Mérida)
        const corpSucursalesSnap = await getDocs(query(collection(db, 'sucursales'), where('clienteId', '==', CORP_ID)));
        const sucursalesUpdates = [];

        const franqueos = {
            'Altabrisa': { n: "Boston's Altabrisa", c: "Mérida, Yuc." },
            'Caucel': { n: "Boston's Caucel", c: "Mérida, Yuc." },
            'Universidad': { n: "Sushiroll Paseo Montejo", c: "Mérida, Yuc." },
            'Centro': { n: "Santa Clara Centro Mérida", c: "Mérida, Yuc." },
            'Insurgentes': { n: "Boston's Montejo", c: "Mérida, Yuc." },
            'Polanco': { n: "MB Chicken Gran Plaza", c: "Mérida, Yuc." },
            'Santa Fe': { n: "Boston's City Center", c: "Mérida, Yuc." },
            'Reforma': { n: "MB Chicken Macroplaza", c: "Mérida, Yuc." },
        };

        corpSucursalesSnap.docs.forEach(sucDoc => {
            const currentName = sucDoc.data().nombre;
            const newValues = franqueos[currentName as keyof typeof franqueos];
            if (newValues) {
                console.log(`Renombrando Sucursal: ${currentName} -> ${newValues.n}`);
                sucursalesUpdates.push(updateDoc(doc(db, 'sucursales', sucDoc.id), {
                    nombre: newValues.n,
                    ciudad: newValues.c
                }));
            }
        });
        await Promise.all(sucursalesUpdates);
        console.log("Sucursales de Corporativo ajustadas a Mérida/Boston's.");

        // 3. Modificamos los Equipos (Cambiamos el "Hollywood" por los nombres "Orgánicos de BPT")
        const corpEquiposSnap = await getDocs(query(collection(db, 'equipos'), where('clienteId', '==', CORP_ID)));
        const equiposUpdates = [];

        corpEquiposSnap.docs.forEach(eqDoc => {
            if (nombresReales.length === 0) {
                nombresReales = [...nombresRealesBase]; // refill
            }
            if (nombresReales.length > 0) {
                const randomBptName = nombresReales.pop(); // Sacar uno aleatorio y real
                const cleanName = randomBptName?.replace('BA-', '') || randomBptName; // limpiar prefijos
                equiposUpdates.push(updateDoc(doc(db, 'equipos', eqDoc.id), { nombre: cleanName }));
            }
        });

        await Promise.all(equiposUpdates);
        console.log("Equipos de Corporativo reemplazados por los nombres orgánicos de TEST BPT.");

    } catch (e) {
        console.error("Error al sincronizar nombres de BPT:", e);
    }
}

syncFromBPTtoCorp();
