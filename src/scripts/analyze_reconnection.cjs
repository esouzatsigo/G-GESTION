
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

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

async function inspectBitacora() {
    console.log("Iniciando cruce de OTs con Bitácora para recuperación de IDs...");

    const [otsSnap, bitSnap, usersSnap, sucsSnap] = await Promise.all([
        getDocs(collection(db, 'ordenesTrabajo')),
        getDocs(collection(db, 'bitacora')),
        getDocs(collection(db, 'usuarios')),
        getDocs(collection(db, 'sucursales'))
    ]);

    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Identificar al Gerente Altabrisa
    const gerenteAltabrisa = users.find(u => u.rol.includes('Gerente') && u.nombre.toLowerCase().includes('altabrisa'));
    console.log(`Gerente Identificado: ${gerenteAltabrisa ? gerenteAltabrisa.id : 'NO ENCONTRADO'}`);

    const bitEntries = bitSnap.docs.map(d => d.data());
    const ots = otsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const recoveryPlan = [];

    for (const ot of ots) {
        // Solo procesar si tiene anomalías (equipo "sin nombre" o falta solicitante)
        const isAnomalous = !ot.solicitanteId || ot.solicitanteId === 'SYSTEM_PLANNER';

        if (isAnomalous) {
            // Buscar en bitácora por mención del número de OT o ID en la descripción o campos
            const history = bitEntries.filter(b =>
                (b.entidadId === ot.id) ||
                (b.detalles && JSON.stringify(b.detalles).includes(ot.id)) ||
                (b.detalles && JSON.stringify(b.detalles).includes(ot.numero.toString()))
            );

            let recoveredEquipoId = null;
            // Intentar extraer equipoId de los detalles del historial
            history.forEach(ent => {
                const detStr = JSON.stringify(ent.detalles || {});
                const match = detStr.match(/[a-zA-Z0-9]{20}/); // Buscar hash común de Firebase
                if (match && !recoveredEquipoId) {
                    // Aquí podríamos ser más precisos si el log guarda "equipoId": "..."
                }
            });

            recoveryPlan.push({
                ot: ot.numero,
                id: ot.id,
                currentEquipo: ot.equipoId,
                currentSolicitante: ot.solicitanteId,
                recommededSolicitante: gerenteAltabrisa ? gerenteAltabrisa.id : ot.solicitanteId,
                historyFound: history.length,
                action: "UPDATE_REFS"
            });
        }
    }

    require('fs').writeFileSync('C:/Users/HACel/Documents/T-SIGO/Proyectos/H-GESTION/PLAN_RECONEXION_DETALLE.json', JSON.stringify(recoveryPlan, null, 2));
    console.log(`Plan generado con ${recoveryPlan.length} OTs candidatas.`);
}

inspectBitacora().catch(console.error);
