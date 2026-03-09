import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../src/services/firebase';

async function checkRoles() {
    const client = '3de6K2GeasZhN2GIQWXw';
    const q = query(collection(db, 'usuarios'), where('clienteId', '==', client));
    const snap = await getDocs(q);

    const roles: Record<string, string[]> = {};
    snap.forEach(d => {
        const data = d.data();
        const r = data.rol;
        if (!roles[r]) roles[r] = [];
        roles[r].push(data.nombre);
    });

    console.log('--- Roles en TEST BPT ---');
    for (const [rol, names] of Object.entries(roles)) {
        console.log(`Rol: "${rol}" (${names.length}): ${names.join(', ')}`);
    }
}
checkRoles().catch(console.error);
