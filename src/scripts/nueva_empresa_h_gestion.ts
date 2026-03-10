/**
 * SCRIPT MAESTRO: Nueva Empresa H-GESTION
 * 
 * Este script automatiza el alta completa de una nueva empresa (Cliente),
 * integrando todas las correcciones de "fisuras" reportadas:
 *   - Timestamps Universales (createdAt/updatedAt)
 *   - Familias en colección dedicada con nomenclatura
 *   - Franquicias con sitioWeb y colorFondo
 *   - Aislamiento total de datos por clienteId
 *   - Roles y Especialidades dinámicas
 */

import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { trackedAddDoc } from '../services/firestoreHelpers';
import { db } from '../services/firebase';

// ============================================================
// CONFIGURACIÓN DE LA NUEVA EMPRESA
// ============================================================
const CONFIG = {
    NOMBRE_CLIENTE: 'BPT GROUP', // Cambiar para nueva empresa
    RAZON_SOCIAL: 'BPT GROUP S.A. de C.V.',
    BATCH_TAG: 'MASTER_ONBOARDING_20260309',
    NOW: new Date().toISOString(),
};

// --- Datos de Negocio ---
const FRANQUICIAS = [
    {
        nombre: "Boston's Pizza",
        logoUrl: "https://firebasestorage.googleapis.com/v0/b/h-gestion-dev.firebasestorage.app/o/franquicias%2Flogos%2F1772527452849_image.png?alt=media&token=17205b2f-d7cf-434e-ace5-e2da115c7c2d",
        colorFondo: "#c40e2c",
        sitioWeb: "https://bostons.com.mx/"
    },
    {
        nombre: "La Parroquia",
        logoUrl: "https://firebasestorage.googleapis.com/v0/b/h-gestion-dev.firebasestorage.app/o/franquicias%2Flogos%2F1772527506415_image.png?alt=media&token=c4fff2be-cf24-463e-b61e-88cdbe7f0626",
        colorFondo: "#332324",
        sitioWeb: "https://laparroquiadeveracruz.com/"
    },
    {
        nombre: "SUSHIROLL",
        logoUrl: "https://firebasestorage.googleapis.com/v0/b/h-gestion-dev.firebasestorage.app/o/franquicias%2Flogos%2F1772526438437_image.png?alt=media&token=16fd3546-4456-4678-a9a1-b1b1211dc597",
        colorFondo: "#332324",
        sitioWeb: "https://sushiroll.com.mx/"
    },
    {
        nombre: "Corporativo BPT",
        logoUrl: "https://firebasestorage.googleapis.com/v0/b/h-gestion-dev.firebasestorage.app/o/franquicias%2Flogos%2F1772526841639_image.png?alt=media&token=37960c7b-5340-4b9b-9833-b51862c29e18",
        colorFondo: "#FFFFFF",
        sitioWeb: "https://bptgroup.mx/"
    },
];

const FAMILIAS = [
    { nombre: "Coccion", nomenclatura: "ESP_COCCION" },
    { nombre: "Agua", nomenclatura: "ESP_AGUA" },
    { nombre: "Restaurante", nomenclatura: "ESP_RESTAURANTE" },
    { nombre: "Refrigeracion", nomenclatura: "ESP_REFRIGERACION" },
    { nombre: "Aires", nomenclatura: "ESP_AIRES" },
    { nombre: "Generadores", nomenclatura: "ESP_GENERADORES" },
    { nombre: "Cocina", nomenclatura: "ESP_COCINA" }
];

// Usuarios base (ejemplo para replicar)
const USUARIOS_BASE = (clienteId: string, sucursalesAll: string[], sucursalPrincipalId: string) => [
    {
        nombre: 'Hector Celis (Master)',
        email: 'hcelis.master@tsigoglobal.com.mx',
        contrasena: '12345678',
        rol: 'ROL_ADMIN_GENERAL',
        sucursalesPermitidas: []
    },
    {
        nombre: 'Coordinador Master',
        email: 'coordinador.master@bpt.com',
        contrasena: '12345678',
        rol: 'ROL_COORD',
        sucursalesPermitidas: sucursalesAll
    }
];

// ============================================================
// LOGICA DE EJECUCIÓN
// ============================================================

async function main() {
    console.log("🚀 Iniciando Script Maestro: Nueva Empresa H-GESTION");
    console.log(`Empresa: ${CONFIG.NOMBRE_CLIENTE}\n`);

    // 0. Validación de existencia
    const qExist = query(collection(db, 'clientes'), where('nombre', '==', CONFIG.NOMBRE_CLIENTE));
    const snapExist = await getDocs(qExist);
    if (!snapExist.empty) {
        console.warn(`⚠️  ATENCIÓN: El cliente ${CONFIG.NOMBRE_CLIENTE} ya existe (ID: ${snapExist.docs[0].id}).`);
        console.log("   Continuando con la inyección de datos faltantes...\n");
    }

    // 1. Crear/Obtener Cliente
    let clienteId = snapExist.empty ? '' : snapExist.docs[0].id;
    if (snapExist.empty) {
        const cRef = await trackedAddDoc(collection(db, 'clientes'), {
            nombre: CONFIG.NOMBRE_CLIENTE,
            razonSocial: CONFIG.RAZON_SOCIAL,
            batchTag: CONFIG.BATCH_TAG
        });
        clienteId = cRef.id;
        console.log(`✅ Cliente creado: ${clienteId}`);
    }

    // 2. Crear Contador de Folios Dedicado
    await setDoc(doc(db, 'config', `counters_${clienteId}`), {
        otNumber: 1000,
        preventiveOtNumber: 1,
        createdAt: CONFIG.NOW,
        updatedAt: CONFIG.NOW,
        batchTag: CONFIG.BATCH_TAG
    }, { merge: true });
    console.log(`✅ Contador de folios configurado (config/counters_${clienteId})`);

    // 3. Crear Franquicias Completas (Logo, Color, Web)
    const franqMap: Record<string, string> = {};
    for (const f of FRANQUICIAS) {
        const fRef = await trackedAddDoc(collection(db, 'franquicias'), {
            clienteId,
            nombre: f.nombre,
            logoUrl: f.logoUrl || '',
            colorFondo: f.colorFondo || '#FFFFFF',
            sitioWeb: f.sitioWeb || '',
            batchTag: CONFIG.BATCH_TAG
        });
        franqMap[f.nombre] = fRef.id;
        console.log(`   ✅ Franquicia: ${f.nombre} (${fRef.id})`);
    }

    // 4. Crear Familias Corregidas (Colección dedicada + Nomenclatura)
    for (const fam of FAMILIAS) {
        await trackedAddDoc(collection(db, 'familias'), {
            clienteId,
            nombre: fam.nombre,
            nomenclatura: fam.nomenclatura,
            batchTag: CONFIG.BATCH_TAG
        });
        console.log(`   ✅ Familia: ${fam.nombre} (${fam.nomenclatura})`);
    }

    // 5. Crear Catálogos de Roles y Especialidades
    const roles = [
        { id: 'ROL_ADMIN_GENERAL', name: 'Admin General' },
        { id: 'ROL_COORD', name: 'Coordinador' },
        { id: 'ROL_GERENTE', name: 'Gerente' },
        { id: 'ROL_SUPERVISOR', name: 'Supervisor' },
        { id: 'ROL_TECNICO', name: 'Tecnico' },
        { id: 'ROL_TECNICO_EXTERNO', name: 'TecnicoExterno' }
    ];
    for (const r of roles) {
        await trackedAddDoc(collection(db, 'catalogos'), {
            clienteId,
            tipo: 'roles',
            categoria: 'Rol', // UsuariosPage espera 'Rol'
            nombre: r.name,
            nomenclatura: r.id,
            batchTag: CONFIG.BATCH_TAG
        });
    }

    const especialidades = FAMILIAS.map(f => f.nombre);
    for (const esp of especialidades) {
        await trackedAddDoc(collection(db, 'catalogos'), {
            clienteId,
            tipo: 'especialidadesTecnicoExterno',
            categoria: 'Especialidades Técnico Externo',
            nombre: esp,
            batchTag: CONFIG.BATCH_TAG
        });
    }
    console.log("✅ Catálogos base (Roles y Especialidades) inyectados.");

    console.log("\n🎉 Proceso Completado. Empresa configurada con altos estándares de integridad.");
    console.log("   Recuerda importar Sucursales y Equipos usando el Importador masivo o scripts específicos.");

    process.exit(0);
}

main().catch(err => {
    console.error("❌ ERROR CRÍTICO durante el proceso:", err);
    process.exit(1);
});
