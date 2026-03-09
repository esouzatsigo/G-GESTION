import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection } from "firebase/firestore";
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkOTs() {
    try {
        const otsSnap = await getDocs(collection(db, 'ordenesTrabajo'));
        let correctivas = 0;
        let preventivas = 0;
        let correctivasCuentanConClienteId = 0;
        let preventivasCuentanConClienteId = 0;
        let clienteIds = new Set<string>();

        otsSnap.forEach(doc => {
            const data = doc.data();
            const esCorrectiva = data.tipo === 'Correctivo' || data.tipo === 'Correctiva' || !data.tipo;
            if (esCorrectiva) {
                correctivas++;
                if (data.clienteId) {
                    correctivasCuentanConClienteId++;
                    clienteIds.add(data.clienteId);
                }
            } else {
                preventivas++;
                if (data.clienteId) {
                    preventivasCuentanConClienteId++;
                    clienteIds.add(data.clienteId);
                }
            }
        });

        console.log(`Total OTs: ${otsSnap.size}`);
        console.log(`Correctivas: ${correctivas} (Con clienteId: ${correctivasCuentanConClienteId})`);
        console.log(`Preventivas: ${preventivas} (Con clienteId: ${preventivasCuentanConClienteId})`);
        console.log(`Client IDs presentes en Correctivas:`, Array.from(clienteIds));

    } catch (e) {
        console.error(e);
    }
}

checkOTs();
