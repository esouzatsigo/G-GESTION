import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";

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

const roles = ['Admin', 'Admin General', 'Coordinador', 'Gerente', 'Supervisor', 'Tecnico', 'TecnicoExterno'];
const especialidades = ['Aires', 'Coccion', 'Refrigeracion', 'Cocina', 'Restaurante', 'Local', 'Agua', 'Generadores'];

async function seedCatalogos() {
    console.log("Iniciando inyección de catálogos base...");
    const catalogosRef = collection(db, 'catalogos');

    const CLIENTE_ID_GLOBAL = 'ADMIN';

    // Seed Roles
    for (const r of roles) {
        const q = query(catalogosRef, where('categoria', '==', 'Rol'), where('nombre', '==', r));
        const snap = await getDocs(q);
        if (snap.empty) {
            await addDoc(catalogosRef, {
                clienteId: CLIENTE_ID_GLOBAL,
                categoria: 'Rol',
                nombre: r,
                descripcion: `Rol estandarizado del sistema: ${r}`,
                colorFondo: '#3b82f6' // Azul
            });
            console.log(`[R] Creado: ${r}`);
        } else {
            console.log(`[R] Ya existe: ${r}`);
        }
    }

    // Seed Especialidades
    for (const esp of especialidades) {
        const q = query(catalogosRef, where('categoria', '==', 'Especialidad'), where('nombre', '==', esp));
        const snap = await getDocs(q);
        if (snap.empty) {
            await addDoc(catalogosRef, {
                clienteId: CLIENTE_ID_GLOBAL,
                categoria: 'Especialidad',
                nombre: esp,
                descripcion: `Especialidad técnica base: ${esp}`,
                colorFondo: '#10b981' // Verde
            });
            console.log(`[E] Creado: ${esp}`);
        } else {
            console.log(`[E] Ya existe: ${esp}`);
        }
    }

    // Seed Familias (same strings as especialidades right now)
    for (const fam of especialidades) {
        const q = query(catalogosRef, where('categoria', '==', 'Familia'), where('nombre', '==', fam));
        const snap = await getDocs(q);
        if (snap.empty) {
            await addDoc(catalogosRef, {
                clienteId: CLIENTE_ID_GLOBAL,
                categoria: 'Familia',
                nombre: fam,
                descripcion: `Familia de equipo base: ${fam}`,
                colorFondo: '#f59e0b' // Naranja
            });
            console.log(`[F] Creado: ${fam}`);
        } else {
            console.log(`[F] Ya existe: ${fam}`);
        }
    }

    console.log("¡Inserción de catálogos completada exitosamente!");
}

seedCatalogos().then(() => process.exit(0)).catch(e => {
    console.error(e);
    process.exit(1);
});
