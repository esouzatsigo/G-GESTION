import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, addDoc } from "firebase/firestore";

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

function cleanString(str: string) {
    return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function runMigration() {
    try {
        console.log("Fetching sucursales...");
        const sucSnap = await getDocs(collection(db, 'sucursales'));
        const sucursales = sucSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        console.log("Fetching usuarios...");
        const userSnap = await getDocs(collection(db, 'usuarios'));
        const usuarios = userSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

        const createdUsers: any[] = [];
        let updatedCount = 0;

        // 1. Crear Tecnicos y Gerentes faltantes
        // FILTRADO POR CLIENTE 'BPT - CORPORATIVO NACIONAL' (o su ID)
        // Para asegurar, encontraremos el Cliente con nombre 'BPT - CORPORATIVO NACIONAL'
        const clientSnap = await getDocs(collection(db, 'clientes'));
        const clientes = clientSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        const bptClient = clientes.find(c => c.nombre === 'BPT - CORPORATIVO NACIONAL');

        if (!bptClient) {
            console.error("No se encontró el cliente BPT - CORPORATIVO NACIONAL");
            return;
        }

        const sucursalesBPT = sucursales.filter(s => s.clienteId === bptClient.id || s.clienteId === 'BPT - CORPORATIVO NACIONAL' || bptClient.nombre.includes('BPT'));


        for (const suc of sucursalesBPT) {
            // Find if suc has a Gerente
            const hasGerente = usuarios.some(u => u.rol === 'Gerente' && u.sucursalesPermitidas && u.sucursalesPermitidas.includes(suc.id));
            if (!hasGerente) {
                const newGerente: any = {
                    nombre: `Gerente ${suc.nombre}`,
                    email: `gerente.${cleanString(suc.nombre)}@hgestion.com`,
                    rol: 'Gerente',
                    sucursalesPermitidas: [suc.id],
                    contrasena: `gerente.${cleanString(suc.nombre)}@hgestion.com`,
                };
                if (suc.clienteId) newGerente.clienteId = suc.clienteId;
                if (suc.franquiciaId) newGerente.franquiciaId = suc.franquiciaId;

                console.log(`Creating Gerente for ${suc.nombre}...`);
                const docRef = await addDoc(collection(db, 'usuarios'), newGerente);
                const completeUser = { id: docRef.id, ...newGerente };
                usuarios.push(completeUser);
                createdUsers.push(completeUser);
            }

            // Find if suc has a Tecnico
            const hasTecnico = usuarios.some(u => u.rol === 'Tecnico' && u.sucursalesPermitidas && u.sucursalesPermitidas.includes(suc.id));
            if (!hasTecnico) {
                const newTecnico: any = {
                    nombre: `Tecnico ${suc.nombre}`,
                    email: `tecnico.${cleanString(suc.nombre)}@hgestion.com`,
                    rol: 'Tecnico',
                    sucursalesPermitidas: [suc.id],
                    contrasena: `tecnico.${cleanString(suc.nombre)}@hgestion.com`,
                };
                if (suc.clienteId) newTecnico.clienteId = suc.clienteId;
                if (suc.franquiciaId) newTecnico.franquiciaId = suc.franquiciaId;

                console.log(`Creating Tecnico for ${suc.nombre}...`);
                const docRef = await addDoc(collection(db, 'usuarios'), newTecnico);
                const completeUser = { id: docRef.id, ...newTecnico };
                usuarios.push(completeUser);
                createdUsers.push(completeUser);
            }
        }

        // 2. Set contrasena and franquiciaId for ALL users of BPT
        console.log("Updating existing users...");
        for (const u of usuarios) {
            let needsUpdate = false;
            const updates: any = {};

            // Update contrasena
            if (!u.contrasena || u.contrasena !== u.email) {
                if (u.email) {
                    updates.contrasena = u.email;
                    u.contrasena = u.email;
                    needsUpdate = true;
                }
            }

            // Update franquiciaId
            if (u.rol !== 'TecnicoExterno' && !u.franquiciaId) {
                if (u.sucursalesPermitidas && u.sucursalesPermitidas.length > 0) {
                    const firstSucId = u.sucursalesPermitidas.find((sid: string) => sid !== 'TODAS');
                    if (firstSucId) {
                        const suc = sucursales.find(s => s.id === firstSucId);
                        if (suc && suc.franquiciaId) {
                            updates.franquiciaId = suc.franquiciaId;
                            u.franquiciaId = suc.franquiciaId;
                            needsUpdate = true;
                        }
                    }
                }
            }

            if (needsUpdate && !createdUsers.find(cu => cu.id === u.id)) {
                await updateDoc(doc(db, 'usuarios', u.id), updates);
                updatedCount++;
            }
        }

        console.log(`\n\n--- MIGRATION COMPLETE ---`);
        console.log(`Created ${createdUsers.length} new users.`);
        console.log(`Updated ${updatedCount} existing users.\n`);

        console.log(`--- RELACION DE TODOS LOS CORREOS Y CONTRASEÑAS ---`);
        console.log(`--- RELACION DE TODOS LOS CORREOS Y CONTRASEÑAS ---`);
        for (const u of usuarios) {
            const role = u.rol || 'SIN ROL';
            const name = u.nombre || 'SIN NOMBRE';
            const email = u.email || 'SIN EMAIL';
            const pass = u.contrasena || 'SIN CONTRASEÑA';
            console.log(`Rol: ${role.padEnd(15)} | Nombre: ${name.padEnd(30)} | Usuario (Email): ${email.padEnd(35)} | Contraseña: ${pass}`);
        }

    } catch (e) {
        console.error(e);
    }
}

runMigration();
