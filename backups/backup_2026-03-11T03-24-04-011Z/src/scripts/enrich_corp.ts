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

const CORP_ID = 'kWRmv16DNfMUlSF1Yqiv';

const HOLLYWOOD_NAMES_REFRIGERACION = [
    { n: 'Cámara Frigorífica Sub-Cero Industrial', m: 'ThermoKingX', mo: 'TK-9000-Pro', s: 'SN-882910-A' },
    { n: 'Mesa de Preparación Refrigerada', m: 'True', mo: 'TSSU-48', s: 'SN-441-B' },
    { n: 'Congelador Vertical Inteligente', m: 'Traulsen', mo: 'G-Series 120', s: 'TR-9988-X' },
    { n: 'Exhibidor de Conservación Dual', m: 'Torrey', mo: 'VRD-43-Pro', s: 'TY-0012' },
    { n: 'Refrigerador Walk-In (Zona Cero)', m: 'Master-Bilt', mo: 'MB-Walk-200', s: 'MB-10293' },
    { n: 'Unidad Condensadora de Respaldo', m: 'Copeland', mo: 'Scroll-Z', s: 'CP-902' }
];

const HOLLYWOOD_NAMES_COCCION = [
    { n: 'Horno Rational iCombi Pro', m: 'Rational', mo: 'iCombi-10', s: 'RT-55110' },
    { n: 'Freidora de Alto Rendimiento', m: 'Pitco', mo: 'Solstice-Sup', s: 'PT-899-F' },
    { n: 'Parrilla Comercial Vulcan', m: 'Vulcan', mo: 'V-Series-36', s: 'VL-400-P' },
    { n: 'Marmita de Volteo a Vapor', m: 'Groen', mo: 'Kettle-40G', s: 'GR-88-M' },
    { n: 'Salamandra Infrarroja de Rápida Acción', m: 'Garland', mo: 'G-IR-36', s: 'GL-9001' }
];

async function enrichEquipments() {
    let r_idx = 0;
    let c_idx = 0;

    try {
        const equipos = await getDocs(query(collection(db, 'equipos'), where('clienteId', '==', CORP_ID)));
        const updates = [];

        equipos.docs.forEach(eqDoc => {
            const data = eqDoc.data();
            let newDetailsConfig = null;

            if (data.familia?.toLowerCase().includes('refrigeracion') || data.tipo === 'Refrigeracion') {
                newDetailsConfig = HOLLYWOOD_NAMES_REFRIGERACION[r_idx % HOLLYWOOD_NAMES_REFRIGERACION.length];
                r_idx++;
            } else {
                newDetailsConfig = HOLLYWOOD_NAMES_COCCION[c_idx % HOLLYWOOD_NAMES_COCCION.length];
                c_idx++;
            }

            if (newDetailsConfig) {
                console.log(`Enriqueciendo: ${data.nombre} -> ${newDetailsConfig.n}`);
                updates.push(updateDoc(doc(db, 'equipos', eqDoc.id), {
                    nombre: newDetailsConfig.n,
                    marca: newDetailsConfig.m,
                    modelo: newDetailsConfig.mo,
                    ns: newDetailsConfig.s
                }));
            }
        });

        await Promise.all(updates);
        console.log("Enriquecimiento estético finalizado. Equipos actualizados.");

    } catch (e) { console.error(e); }
}

enrichEquipments();
