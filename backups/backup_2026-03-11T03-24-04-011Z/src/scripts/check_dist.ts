import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const db = getFirestore(initializeApp({ apiKey: 'AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw', projectId: 'h-gestion-dev' }));

async function check() {
    const c = await getDocs(collection(db, 'clientes'));
    const s = await getDocs(collection(db, 'sucursales'));
    const u = await getDocs(collection(db, 'usuarios'));

    const clientes = c.docs.map(d => ({ id: d.id, nombre: d.data().nombre }));
    console.log("Clientes:", clientes);

    const sucursales = s.docs.map(d => d.data());
    for (const client of clientes) {
        if (client.nombre.includes('BPT') || client.nombre.includes('CORPORATIVO')) {
            const sucOfClient = sucursales.filter(suc => suc.clienteId === client.id);
            console.log(`Sucursales in ${client.nombre} (${client.id}):`, sucOfClient.length);

            const usersOfClient = u.docs.map(d => d.data()).filter(us => us.clienteId === client.id);
            console.log(`Users in ${client.nombre} (${client.id}):`, usersOfClient.length);
        }
    }
}
check().then(() => process.exit());
