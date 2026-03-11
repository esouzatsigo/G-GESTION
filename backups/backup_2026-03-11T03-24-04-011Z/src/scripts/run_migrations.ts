import { initializeApp } from "firebase/app";
import { getFirestore, getDocs, collection, query, where, writeBatch, doc } from "firebase/firestore";
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "h-gestion-dev.firebaseapp.com",
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "h-gestion-dev",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "h-gestion-dev.firebasestorage.app",
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "198928689880",
    appId: process.env.VITE_FIREBASE_APP_ID || "1:198928689880:web:7f90dcd33e710fcc7505ad"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function runMigrations() {
    try {
        console.log("--- 1. Renombrar Rol 'Admin' a 'Admin General' ---");
        const usuariosRef = collection(db, 'usuarios');
        const qAdmin = query(usuariosRef, where('rol', '==', 'Admin'));
        const adminSnap = await getDocs(qAdmin);

        const batch = writeBatch(db);
        let countAdmins = 0;
        
        adminSnap.forEach((document) => {
            batch.update(doc(db, 'usuarios', document.id), { rol: 'Admin General' });
            countAdmins++;
        });

        console.log(`--- 2. Sembrar Catálogo Dinámico Inicial ---`);
        const rolesBase = [
            { nombre: 'Admin General', categoria: 'Rol', descripcion: 'Acceso Total', colorFondo: '#ef4444' },
            { nombre: 'Coordinador', categoria: 'Rol', descripcion: 'Coordinación de OTs', colorFondo: '#10b981' },
            { nombre: 'Gerente', categoria: 'Rol', descripcion: 'Gerente de Sucursal', colorFondo: '#3b82f6' },
            { nombre: 'Supervisor', categoria: 'Rol', descripcion: 'Supervisión de técnicos', colorFondo: '#8b5cf6' },
            { nombre: 'Tecnico', categoria: 'Rol', descripcion: 'Técnico Interno', colorFondo: '#F59E0B' },
            { nombre: 'TecnicoExterno', categoria: 'Rol', descripcion: 'Técnico Externo', colorFondo: '#06b6d4' }
        ];

        const especialidadesBase = [
            { nombre: 'Aires', categoria: 'Especialidad', descripcion: 'Aires Acondicionados', colorFondo: '#64748b' },
            { nombre: 'Coccion', categoria: 'Especialidad', descripcion: 'Equipos de Cocción', colorFondo: '#64748b' },
            { nombre: 'Refrigeracion', categoria: 'Especialidad', descripcion: 'Equipos de Refrigeración', colorFondo: '#64748b' },
            { nombre: 'Cocina', categoria: 'Especialidad', descripcion: 'Equipos de Cocina General', colorFondo: '#64748b' },
            { nombre: 'Restaurante', categoria: 'Especialidad', descripcion: 'Área de Restaurante', colorFondo: '#64748b' },
            { nombre: 'Local', categoria: 'Especialidad', descripcion: 'Infraestructura del Local', colorFondo: '#64748b' },
            { nombre: 'Agua', categoria: 'Especialidad', descripcion: 'Sistemas de Agua', colorFondo: '#64748b' },
            { nombre: 'Generadores', categoria: 'Especialidad', descripcion: 'Generadores Eléctricos', colorFondo: '#64748b' }
        ];

        const catalogosRef = collection(db, 'catalogos');
        const existingCat = await getDocs(catalogosRef);
        
        if (existingCat.empty) {
            let catCount = 0;
            [...rolesBase, ...especialidadesBase].forEach(item => {
                const newDoc = doc(catalogosRef);
                batch.set(newDoc, {
                    ...item,
                    clienteId: 'ADMIN' // Catálogos globales pertenecen al ADMIN
                });
                catCount++;
            });
            console.log(`Se prepararon ${catCount} registros de catálogo.`);
        } else {
            console.log("El catálogo ya contiene datos, saltando la siembra inicial.");
        }

        await batch.commit();
        console.log(`✅ Migración completada:\n - ${countAdmins} usuarios actualizados a 'Admin General'.\n - Catálogos sembrados.`);
    } catch (error) {
        console.error("Error durante las migraciones:", error);
    }
}

runMigrations();
