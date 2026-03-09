import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";

const db = getFirestore(initializeApp({ apiKey: 'AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw', projectId: 'h-gestion-dev' }));

async function fix() {
    const s = await getDocs(collection(db, 'sucursales'));
    const sucursales = s.docs.map(d => ({ id: d.id, ...d.data() }));

    const f = await getDocs(collection(db, 'franquicias'));
    const franquicias = f.docs.map(d => ({ id: d.id, ...d.data() }));

    const u = await getDocs(collection(db, 'usuarios'));

    let count = 0;
    for (const docSnap of u.docs) {
        const user = docSnap.data();
        if (user.rol === 'Admin General') continue;

        let correctClienteId = null;

        if (user.sucursalesPermitidas && user.sucursalesPermitidas.length > 0 && user.sucursalesPermitidas[0] !== 'TODAS') {
            const suc = sucursales.find((suc: any) => user.sucursalesPermitidas.includes(suc.id));
            if (suc) correctClienteId = suc.clienteId;
        }

        if (!correctClienteId && user.franquiciaId) {
            const fran = franquicias.find((fran: any) => fran.id === user.franquiciaId);
            if (fran) correctClienteId = fran.clienteId;
        }

        // If still no correctClienteId, try to guess by name
        if (!correctClienteId) {
            if (user.nombre.includes('BPT') || user.email.includes('bpt')) {
                correctClienteId = '3de6K2GeasZhN2GIQWXw'; // BPT
            } else if (user.nombre.includes('BA') || user.email.includes('ba')) {
                correctClienteId = '3de6K2GeasZhN2GIQWXw'; // Assuming BA is BPT
            }
        }

        if (correctClienteId && user.clienteId !== correctClienteId) {
            console.log(`Fixing ${user.nombre} from ${user.clienteId} to ${correctClienteId}`);
            await updateDoc(doc(db, 'usuarios', docSnap.id), { clienteId: correctClienteId });
            count++;
        }
    }

    console.log(`Fixed ${count} users.`);
}
fix().then(() => process.exit(0));
