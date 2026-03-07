
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, addDoc, query, where, deleteDoc, writeBatch, serverTimestamp, orderBy, limit } from 'firebase/firestore';

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

const FAMILIAS = ['Aires', 'Coccion', 'Refrigeracion', 'Cocina', 'Restaurante', 'Local', 'Agua', 'Generadores'];

async function cleanup() {
    console.log("🧹 Limpiando datos de prueba previos...");
    // Podríamos limpiar colecciones específicas, pero por ahora confiaremos en los IDs únicos o nombres prefijados
}

async function runSimulation() {
    console.log("🚀 INICIANDO SIMULACIÓN COMPLETA DEL SISTEMA\n");

    // --- FASE 1: DATOS MAESTROS ---
    console.log("--- FASE 1: Preparación de Datos Maestros ---");

    // 1. Cliente
    const clienteId = "SIM-BPT-CORP";
    await setDoc(doc(db, "clientes", clienteId), {
        nombre: "BPT - CORPORATIVO NACIONAL",
        razonSocial: "GRUPO BOSPATEX S.A. DE C.V."
    });
    console.log("✅ Cliente 'BPT - CORPORATIVO NACIONAL' creado");

    // ... (sucursales y usuarios se mantienen igual, solo actualizamos la referencia al clienteId)
    // 2. Sucursales (10)
    const sucursalIds: string[] = [];
    for (let i = 1; i <= 10; i++) {
        const id = `SIM-SUC-${i.toString().padStart(2, '0')}`;
        await setDoc(doc(db, "sucursales", id), {
            id,
            clienteId,
            nombre: `Sucursal Premium ${i}`,
            direccion: `Avenida Principal 10${i}, Mérida, Yuc.`,
            coordenadas: { lat: 21.018 + (i * 0.005), lng: -89.624 - (i * 0.005) }
        });
        sucursalIds.push(id);
    }
    console.log("✅ 10 Sucursales Premium creadas");

    // 3. Usuarios (Se mantienen IDs pero se actualiza clienteId)
    const coordId = "SIM-COORD";
    await setDoc(doc(db, "usuarios", coordId), {
        id: coordId,
        nombre: "Alejandro Celis (Coordinador)",
        email: "ale.coordinador@bpt.com",
        rol: "Coordinador",
        clienteId,
        sucursalesPermitidas: ["TODAS"]
    });

    const gerenteIds: string[] = [];
    for (let i = 1; i <= 10; i++) {
        const id = `SIM-GER-${i.toString().padStart(2, '0')}`;
        await setDoc(doc(db, "usuarios", id), {
            id,
            nombre: `Gerente Operativo ${i}`,
            email: `gerente${i}@bpt.com`,
            rol: "Gerente",
            clienteId,
            sucursalesPermitidas: [sucursalIds[i - 1]]
        });
        gerenteIds.push(id);
    }

    const tecInternoIds: string[] = [];
    for (let i = 1; i <= 10; i++) {
        const id = `SIM-TEC-INT-${i.toString().padStart(2, '0')}`;
        await setDoc(doc(db, "usuarios", id), {
            id,
            nombre: `Técnico Staff ${i}`,
            email: `staff${i}@bpt.com`,
            rol: "Tecnico",
            clienteId,
            sucursalesPermitidas: [sucursalIds[i - 1]],
            coordinadorId: coordId
        });
        tecInternoIds.push(id);
    }

    const tecExternoIds: Record<string, string> = {};
    for (const familia of FAMILIAS) {
        const id = `SIM-TEC-EXT-${familia.toUpperCase()}`;
        await setDoc(doc(db, "usuarios", id), {
            id,
            nombre: `Especialista en ${familia}`,
            email: `especialista.${familia.toLowerCase()}@externo.com`,
            rol: "TecnicoExterno",
            clienteId,
            sucursalesPermitidas: ["TODAS"],
            especialidad: familia,
            coordinadorId: coordId
        });
        tecExternoIds[familia] = id;
    }

    const equiposPorSucursalYFamilia: Record<string, Record<string, string[]>> = {};
    for (const sucId of sucursalIds) {
        equiposPorSucursalYFamilia[sucId] = {};
        for (const familia of FAMILIAS) {
            equiposPorSucursalYFamilia[sucId][familia] = [];
            for (let j = 1; j <= 2; j++) {
                const eqId = `SIM-EQ-${sucId}-${familia}-${j}`;
                await setDoc(doc(db, "equipos", eqId), {
                    id: eqId,
                    clienteId,
                    sucursalId: sucId,
                    familia,
                    nombre: `${familia} High-End Mod.${j}`
                });
                equiposPorSucursalYFamilia[sucId][familia].push(eqId);
            }
        }
    }

    // --- FASE 2: FLUJO CORRECTIVO (20 OTs) ---
    console.log("\n--- FASE 2: Flujo Correctivo (20 OTs Mínimo) ---");

    const correctiveOTs: any[] = [];
    const now = new Date();

    for (let i = 0; i < 20; i++) {
        const sucIdx = i % 10;
        const sucId = sucursalIds[sucIdx];
        const gerId = gerenteIds[sucIdx];
        const familiaRandom = FAMILIAS[Math.floor(Math.random() * FAMILIAS.length)];
        const eqId = equiposPorSucursalYFamilia[sucId][familiaRandom][i < 10 ? 0 : 1];

        // 1. Generación por Gerente
        const otData = {
            tipo: 'Correctivo',
            estatus: 'Pendiente',
            solicitanteId: gerId,
            clienteId,
            sucursalId: sucId,
            equipoId: eqId,
            descripcionFalla: `Falla crítica en sistema de ${familiaRandom}. El equipo no enciende o presenta ruidos inusuales.`,
            prioridad: 'MEDIA',
            fechas: {
                solicitada: new Date(now.getTime() - (20 - i) * 1800000).toISOString()
            },
            numero: 2000 + i
        };
        const docRef = await addDoc(collection(db, "workOrders"), otData);
        const otId = docRef.id;
        correctiveOTs.push({ id: otId, ...otData, familia: familiaRandom });
        console.log(`   - OT ${otData.numero} [${sucId}] Creada por Gerente`);

        // 2. Modificaciones Gerente
        await setDoc(doc(db, "workOrders", otId), {
            justificacion: "Impacto directo en la producción del turno vespertino.",
            fotosGerente: ["https://placehold.co/600x400?text=Evidencia+Falla+Gerente"]
        }, { merge: true });

        // 3. Asignación por el Coordinador (Ejecutivo)
        // Determinamos técnico (Interno para pares, Externo para impares)
        const tecnicoAsignadoId = (i % 2 === 0) ? tecInternoIds[sucIdx] : tecExternoIds[familiaRandom];

        await setDoc(doc(db, "workOrders", otId), {
            estatus: 'Asignada',
            prioridad: i % 3 === 0 ? 'ALTA' : 'MEDIA', // Variedad de prioridades
            tecnicoId: tecnicoAsignadoId,
            coordinadorId: coordId,
            fechas: {
                ...otData.fechas,
                asignada: new Date().toISOString(),
                programada: new Date(now.getTime() + 86400000).toISOString() // Programada para mañana
            }
        }, { merge: true });
        console.log(`   - OT ${otData.numero} Asignada: Prioridad ${i % 3 === 0 ? 'ALTA' : 'MEDIA'}, Técnico ${tecnicoAsignadoId}`);

        // 4. Cambios Posteriores del Coordinador antes de Ejecución
        // Simular re-asignación o cambio de prioridad por saturación
        if (i === 5 || i === 15) {
            await setDoc(doc(db, "workOrders", otId), {
                prioridad: 'ALTA',
                comentariosCoordinador: "MODIFICACIÓN: Se eleva prioridad por reporte de Gerencia Regional."
            }, { merge: true });
            console.log(`     ⚠️ Cambio posterior aplicado a OT ${otData.numero}`);
        }
    }

    // 5. Ejecución del Servicio por parte de los Técnicos
    console.log("   --- Atendiendo OTs Correctivas ---");
    for (const ot of correctiveOTs) {
        const otId = ot.id;

        // Llegada a Sitio
        await setDoc(doc(db, "workOrders", otId), {
            estatus: 'Llegada a Sitio',
            fechas: { llegada: new Date().toISOString() },
            coordsLlegada: { lat: 21.01, lng: -89.61 }
        }, { merge: true });

        // Inicio
        await setDoc(doc(db, "workOrders", otId), {
            estatus: 'Iniciada',
            fechas: { iniciada: new Date().toISOString() }
        }, { merge: true });

        // Concluir (Simulación de fotos y comentarios)
        await setDoc(doc(db, "workOrders", otId), {
            estatus: 'Concluida. Pendiente Firma Cliente',
            descripcionServicio: "Se realizó limpieza de componentes y ajuste de conexiones eléctricas. El equipo quedó operando correctamente.",
            fotoAntes: "https://placehold.co/600x400?text=Foto+Antes+Correctivo",
            fotoDespues: "https://placehold.co/600x400?text=Foto+Despues+Correctivo",
            fotoExtra: "https://placehold.co/600x400?text=Foto+Extra+Correctivo",
            firmaTecnico: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
            fechas: { concluidaTecnico: new Date().toISOString() }
        }, { merge: true });

        // Firma Cliente (Cierre total)
        await setDoc(doc(db, "workOrders", otId), {
            estatus: 'Concluida',
            firmaCliente: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
            comentariosCliente: "Excelente servicio, muy profesional.",
            fechas: { concluida: new Date().toISOString() }
        }, { merge: true });

        console.log(`   - OT ${ot.numero} [FINALIZADA] con Fotos y Firmas`);
    }

    // --- FASE 3: FLUJO PREVENTIVO ---
    console.log("\n--- FASE 3: Flujo Preventivo (Marzo 2026) ---");

    // 1. Generar Calendario de Marzo
    const planPreventivo: any[] = [
        { mes: 2, fechas: '10', sucursalId: sucursalIds[0], txtPDF: `Sucursal ${sucursalIds[0]}` },
        { mes: 2, fechas: '11 - 12', sucursalId: sucursalIds[1], txtPDF: `Sucursal ${sucursalIds[1]}` },
        { mes: 2, fechas: '15', sucursalId: sucursalIds[2], txtPDF: `Sucursal ${sucursalIds[2]}` },
        { mes: 2, fechas: '16', sucursalId: sucursalIds[3], txtPDF: `Sucursal ${sucursalIds[3]}` },
        { mes: 2, fechas: '20 - 21', sucursalId: sucursalIds[4], txtPDF: `Sucursal ${sucursalIds[4]}` }
    ];

    const eventIds: string[] = [];
    for (const entry of planPreventivo) {
        const ref = await addDoc(collection(db, "planPreventivo2026"), entry);
        eventIds.push(ref.id);
    }
    console.log("✅ Calendario de Marzo con eventos de 1 y 2 días creado");

    // 2. Simulación de Generación Masiva con Distribución Automática
    // Vamos a simular la lógica de MassiveAssignment para un evento
    console.log("   --- Ejecutando Despacho Masivo Automático para Evento 1 ---");
    const event1Id = eventIds[0];
    const event1 = planPreventivo[0];
    const suc1Equipos = [];
    for (const fam of FAMILIAS) {
        suc1Equipos.push(...equiposPorSucursalYFamilia[sucursalIds[0]][fam]);
    }

    // Asignamos 1 equipo a cada técnico para simular distribución (simplificado para el script)
    const assignments: any[] = [];
    const otIdsAfectados: string[] = [];

    for (let j = 0; j < suc1Equipos.length; j++) {
        const eqId = suc1Equipos[j];
        const tecId = (j < tecInternoIds.length) ? tecInternoIds[j] : tecInternoIds[0]; // Round robin simple

        const otData = {
            tipo: 'Preventivo',
            preventivoPlanId: event1Id,
            estatus: 'Asignada',
            tecnicoId: tecId,
            clienteId,
            sucursalId: sucursalIds[0],
            equipoId: eqId,
            prioridad: 'MEDIA',
            fechas: {
                solicitada: new Date().toISOString(),
                programada: new Date(2026, 2, 10).toISOString()
            },
            numero: 5000 + j
        };
        const ref = await addDoc(collection(db, "workOrders"), otData);
        otIdsAfectados.push(ref.id);
        assignments.push({
            equipoId: eqId,
            tecnicoId: tecId,
            fechaProgramada: otData.fechas.programada,
            familiaEquipo: 'Refrigeracion' // simplificado
        });
    }

    // Registrar el batch record
    await addDoc(collection(db, 'massiveBatchRecords'), {
        preventivoPlanId: event1Id,
        sucursalId: sucursalIds[0],
        fechaOperacion: new Date().toISOString(),
        tipoOperacion: 'GENERACION',
        usuarioId: coordId,
        usuarioNombre: "Coordinador Maestro",
        totalOTs: otIdsAfectados.length,
        asignaciones: assignments,
        otIdsAfectados: otIdsAfectados
    });
    console.log(`✅ ${otIdsAfectados.length} OTs Preventivas generadas masivamente`);

    // 3. Atender una OT Preventiva con cada técnico
    console.log("   --- Atendiendo una OT Preventiva por Técnico ---");
    for (const tecId of tecInternoIds) {
        // Buscar una OT preventiva de este técnico
        const q = query(collection(db, "workOrders"), where("tecnicoId", "==", tecId), where("tipo", "==", "Preventivo"), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const otId = snap.docs[0].id;
            await setDoc(doc(db, "workOrders", otId), {
                estatus: 'Finalizada',
                descripcionServicio: "Mantenimiento preventivo semestral realizado.",
                fotoAntes: "https://placehold.co/600x400?text=Preventivo+Antes",
                fotoDespues: "https://placehold.co/600x400?text=Preventivo+Despues",
                fechas: { finalizada: new Date().toISOString() }
            }, { merge: true });
            console.log(`   - Preventiva tech ${tecId} finalizada`);
        }
    }

    console.log("\n🏁 SIMULACIÓN COMPLETADA EXITOSAMENTE");
}

cleanup().then(runSimulation).catch(console.error);

