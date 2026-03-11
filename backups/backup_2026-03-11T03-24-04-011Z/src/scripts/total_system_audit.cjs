const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, orderBy, limit } = require("firebase/firestore");

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

async function runGlobalAudit() {
    console.log('\n🛡️ INICIANDO AUDITORÍA GLOBAL DE VÍNCULO DE HIERRO...');
    console.log('==================================================');

    const summary = {
        users: { total: 0, fissured: 0 },
        equipos: { total: 0, fissured: 0 },
        catalogs: { total: 0, fissured: 0 },
        ots: { total: 0, fissured: 0 }
    };

    // 1. AUDITORÍA DE USUARIOS
    const userSnap = await getDocs(collection(db, 'usuarios'));
    summary.users.total = userSnap.size;
    userSnap.forEach(doc => {
        const u = doc.data();
        const isFissuredRole = u.rol && !u.rol.startsWith('ROL_') && !['Admin General', 'Tecnico', 'Coordinador', 'TecnicoExterno'].includes(u.rol);
        const isFissuredSpec = u.especialidad && !u.especialidad.startsWith('ESP_') && !u.especialidad.startsWith('FAM_');

        if (isFissuredRole || isFissuredSpec) {
            summary.users.fissured++;
            console.log(`[USUARIO] ❌ ${u.nombre} (${doc.id}) - Rol: ${u.rol}, Esp: ${u.especialidad}`);
        }
    });

    // 2. AUDITORÍA DE EQUIPOS
    const eqSnap = await getDocs(collection(db, 'equipos'));
    summary.equipos.total = eqSnap.size;
    eqSnap.forEach(doc => {
        const e = doc.data();
        const isFissuredFam = e.familia && !e.familia.startsWith('ESP_') && !e.familia.startsWith('FAM_');

        if (isFissuredFam) {
            summary.equipos.fissured++;
            console.log(`[EQUIPO] ❌ ${e.nombre} (${doc.id}) - Familia: ${e.familia}`);
        }
    });

    // 3. AUDITORÍA DE CATÁLOGOS
    const catSnap = await getDocs(collection(db, 'catalogos'));
    summary.catalogs.total = catSnap.size;
    catSnap.forEach(doc => {
        const c = doc.data();
        if (!c.nomenclatura) {
            summary.catalogs.fissured++;
            console.log(`[CATÁLOGO] ❌ ${c.nombre} (${doc.id}) - FALTA NOMENCLATURA`);
        }
    });

    // 4. AUDITORÍA DE OTs
    try {
        const otQuery = query(collection(db, 'ordenesTrabajo'), orderBy('fechas.solicitada', 'desc'), limit(500));
        const otSnap = await getDocs(otQuery);
        summary.ots.total = otSnap.size;
        otSnap.forEach(doc => {
            const ot = doc.data();
            if (ot.familia && !ot.familia.startsWith('ESP_') && !ot.familia.startsWith('FAM_')) {
                summary.ots.fissured++;
                console.log(`[OT] ❌ #${ot.numero} (${doc.id}) - Familia en OT: ${ot.familia}`);
            }
        });
    } catch (e) {
        console.warn("[OT] No se pudieron auditar las OTs (posible falta de índice o permisos):", e.message);
    }

    console.log('\n==================================================');
    console.log('📊 RESUMEN DE LA AUDITORÍA:');
    console.log(`- Usuarios: ${summary.users.fissured} fisuras encontradas en ${summary.users.total} registros.`);
    console.log(`- Equipos: ${summary.equipos.fissured} fisuras encontradas en ${summary.equipos.total} registros.`);
    console.log(`- Catálogos: ${summary.catalogs.fissured} fisuras encontradas en ${summary.catalogs.total} registros.`);
    console.log(`- OTs (Muestra): ${summary.ots.fissured} fisuras encontradas en ${summary.ots.total || 0} registros.`);

    if (summary.users.fissured === 0 && summary.equipos.fissured === 0 && summary.catalogs.fissured === 0) {
        console.log('\n✅ ¡SISTEMA SELLADO! Vínculo de Hierro al 100%.');
    } else {
        console.log('\n⚠️ SE REQUIERE ACCIÓN QUIRÚRGICA ADICIONAL.');
    }
}

runGlobalAudit().catch(console.error);
