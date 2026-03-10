import { collection, doc, getDocs, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const MAPPING: Record<string, string> = {
    'Admin General': 'ROL_ADMIN_GENERAL',
    'Admin': 'ROL_ADMIN',
    'Coordinador': 'ROL_COORD',
    'Gerente': 'ROL_GERENTE',
    'Supervisor': 'ROL_SUPERVISOR',
    'Tecnico': 'ROL_TECNICO',
    'TecnicoExterno': 'ROL_TECNICO_EXTERNO'
};

async function main() {
    console.log("🛠️ Iniciando Reparación de Roles (Iron Link) para BPT GROUP...");
    const clienteId = 'HXIjyDoFvWl00Qs29QPw';

    // 1. Corregir Usuarios
    const qUser = query(collection(db, 'usuarios'), where('clienteId', '==', clienteId));
    const snapUser = await getDocs(qUser);
    let userCount = 0;
    for (const d of snapUser.docs) {
        const u = d.data();
        const newRol = MAPPING[u.rol];
        if (newRol && newRol !== u.rol) {
            await updateDoc(d.ref, { rol: newRol });
            console.log(`   ✅ Usuario ${u.nombre}: "${u.rol}" -> "${newRol}"`);
            userCount++;
        }
    }

    // 2. Corregir Catálogos
    const qCat = query(collection(db, 'catalogos'), where('clienteId', '==', clienteId), where('tipo', '==', 'roles'));
    const snapCat = await getDocs(qCat);
    let catCount = 0;
    for (const d of snapCat.docs) {
        const c = d.data();
        const nomenclature = MAPPING[c.nombre];
        if (nomenclature) {
            await updateDoc(d.ref, {
                nomenclatura: nomenclature,
                categoria: 'Rol' // UsuariosPage espera 'Rol'
            });
            console.log(`   ✅ Catálogo ${c.nombre}: nomenclatura -> "${nomenclature}", categoria -> "Rol"`);
            catCount++;
        }
    }

    console.log(`\n🎉 Resumen: ${userCount} usuarios reparados, ${catCount} catálogos alineados.`);
    process.exit(0);
}
main().catch(console.error);
