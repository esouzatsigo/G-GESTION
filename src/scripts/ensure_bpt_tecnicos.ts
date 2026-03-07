import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc, query, where } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
    storageBucket: "h-gestion-dev.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const toCamelCase = (str: string) => {
    return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
};

const normalizeStr = (str: string) => str.toLowerCase().replace(/[\s\W]+/g, '');

async function run() {
    try {
        console.log("=== Asegurando Técnicos BPT ===");

        // 1. Encontrar cliente BPT
        const clientesRef = collection(db, 'clientes');
        const clientesSnap = await getDocs(clientesRef);
        let bptId = '';
        clientesSnap.forEach(doc => {
            const data = doc.data();
            if (data.nombre.toLowerCase().includes('bpt')) {
                bptId = doc.id;
            }
        });

        if (!bptId) {
            console.error("No se encontró cliente BPT.");
            process.exit(1);
        }
        console.log("Cliente BPT ID:", bptId);

        // 2. Obtener usuarios actuales (de la colección root "usuarios" o "ur_hgestion" dependiendo de qué usamos)
        // Wait, looking at the code, `getDocs(tenantQuery('usuarios', currentUser))` gets from collection 'usuarios'.
        // Let's use 'usuarios'.
        const usersSnap = await getDocs(collection(db, 'usuarios'));
        const userDocs: Record<string, any> = {};
        usersSnap.forEach(doc => { userDocs[doc.id] = { id: doc.id, ...doc.data() }; });

        // El supervisor general:
        let supervisorId = Object.values(userDocs).find(u => u.rol === 'Supervisor' && (u.clienteId === bptId || u.clienteId === 'ADMIN'))?.id || '';
        // El coordinador BPT:
        let coordinadorId = Object.values(userDocs).find(u => u.rol === 'Coordinador' && (u.clienteId === bptId || u.clienteId === 'ADMIN'))?.id || '';

        if (!supervisorId) {
            console.log("Creando Supervisor General BPT...");
            const supRef = doc(collection(db, 'usuarios'));
            supervisorId = supRef.id;
            const password = 'supervisor.bpt@bpt.com';
            await setDoc(supRef, {
                nombre: 'Supervisor General BPT',
                email: 'supervisor.bpt@bpt.com',
                contrasena: password,
                rol: 'Supervisor',
                clienteId: bptId,
                sucursalesPermitidas: ['TODAS'],
                fechaCreacion: new Date().toISOString()
            });
            console.log("  - Creado:", 'supervisor.bpt@bpt.com', " / pass:", password);
        } else {
            console.log("Supervisor BPT existente ID:", supervisorId);
        }

        if (!coordinadorId) {
            console.log("Creando Coordinador BPT...");
            const coordRef = doc(collection(db, 'usuarios'));
            coordinadorId = coordRef.id;
            const password = 'coordinador.bpt@bpt.com';
            await setDoc(coordRef, {
                nombre: 'Coordinador BPT',
                email: 'coordinador.bpt@bpt.com',
                contrasena: password,
                rol: 'Coordinador',
                clienteId: bptId,
                sucursalesPermitidas: ['TODAS'],
                fechaCreacion: new Date().toISOString()
            });
            console.log("  - Creado:", 'coordinador.bpt@bpt.com', " / pass:", password);
        } else {
            console.log("Coordinador BPT existente ID:", coordinadorId);
        }

        // 3. Obtener sucursales del cliente
        const sucursalesSnap = await getDocs(query(collection(db, 'sucursales'), where('clienteId', '==', bptId)));
        const sucursales = sucursalesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        console.log(`Se encontraron ${sucursales.length} sucursales para BPT.`);

        // 4. Asegurarse de que cada sucursal tenga un técnico designado
        const tenantUsers = Object.values(userDocs).filter(u => u.clienteId === bptId);

        for (const sucursal of sucursales) {
            const sucId = sucursal.id;
            const franqId = sucursal.franquiciaId || '';

            const existingTecnico = tenantUsers.find(u =>
                u.rol === 'Tecnico' &&
                u.sucursalesPermitidas?.includes(sucId) &&
                u.sucursalesPermitidas?.length === 1
            );

            if (existingTecnico) {
                console.log(`La sucursal ${sucursal.nombre} ya tiene al técnico ${existingTecnico.email}`);
                existingTecnico._processed = true;
                // De pasadita le forzamos sucursal única, franquiciaId, supervisorId, coordinadorId y contrasena base en correo
                const ref = doc(db, 'usuarios', existingTecnico.id);
                const updates = {
                    supervisorId,
                    coordinadorId,
                    franquiciaId: franqId,
                    sucursalesPermitidas: [sucId],
                    contrasena: existingTecnico.email // contrasena igual a su correo
                };
                await setDoc(ref, updates, { merge: true });
            } else {
                console.log(`La sucursal ${sucursal.nombre} no tiene un técnico exclusivo.`);

                // Crearlo
                const email = 'tecnico.' + normalizeStr(sucursal.nombre) + '@bpt.com';
                const nombreTecnico = 'Tecnico Interno ' + sucursal.nombre;
                const password = email;

                const newRef = doc(collection(db, 'usuarios'));
                const newId = newRef.id;

                const newUser = {
                    nombre: nombreTecnico,
                    email: email,
                    contrasena: password,
                    rol: 'Tecnico',
                    clienteId: bptId,
                    franquiciaId: franqId,
                    sucursalesPermitidas: [sucId],
                    supervisorId,
                    coordinadorId,
                    fechaCreacion: new Date().toISOString()
                };

                await setDoc(newRef, newUser);

                console.log(`  - Creado Técnico: ${email} para la sucursal ${sucursal.nombre} (Franquicia: ${franqId})`);
                tenantUsers.push({ id: newId, ...newUser, _processed: true });
            }
        }

        console.log("Proceso completado.");
        process.exit(0);

    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

run();
