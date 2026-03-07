import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkDespistados() {
    console.log("Analyzing users structure...");

    // Obtener Clientes
    const bptSnap = await getDocs(collection(db, 'clientes'));
    const allClientes = bptSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const bptClient = allClientes.find((c: any) => c.nombre === 'BPT' || c.nombre.includes('CORPORATIVO'));

    if (!bptClient) return console.log("BPT client not found.");

    // Obtener Usuarios
    const userSnap = await getDocs(collection(db, 'usuarios'));
    const allUsers = userSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    console.log(`BPT Client ID: ${bptClient.id}`);
    console.log("------------------------------------------");

    const despistados = [];

    for (const u of allUsers) {
        // Excluimos Admins (ellos normalmente pueden ser globales o 'ADMIN')
        if (u.rol === 'Admin') continue;

        // Ver si este usuario tiene un cliente_id diferente a BPT pero debería serlo
        if (u.clienteId !== bptClient.id) {
            despistados.push({
                nombre: u.nombre,
                rol: u.rol,
                clienteActual: u.clienteId || 'NULO',
                email: u.email
            });
        }
    }

    if (despistados.length === 0) {
        console.log("No hay usuarios desalineados. Todos (excepto Admins) pertenecen a BPT.");
    } else {
        console.log(`Encontramos ${despistados.length} usuarios que no pertenecen a BPT (o tienen otro ID o nulo):\n`);
        console.table(despistados);
    }
    process.exit(0);
}

checkDespistados();
