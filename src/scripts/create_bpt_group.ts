/**
 * SCRIPT: Creación de BPT GROUP
 * 
 * Genera la empresa BPT GROUP con:
 *   - 1 Cliente (BPT GROUP)
 *   - 4 Franquicias (Boston's Pizza, La Parroquia, SUSHIROLL, Corporativo BPT)
 *   - 12 Sucursales (de Excel)
 *   - 59 Equipos (de Excel, todos Altabrisa/Boston's)
 *   - 7 Familias (Coccion, Agua, Restaurante, Refrigeracion, Aires, Generadores, Cocina)
 *   - 6 Usuarios (Admin, Gerente, Coordinador, Tecnico, 2 TecnicoExterno)
 *   - Contador de folios dedicado
 *   - Catálogos dinámicos (Roles, Especialidades Técnicos Externos)
 * 
 * Cada registro contiene:
 *   - clienteId: ID del cliente BPT GROUP
 *   - createdAt: ISO timestamp
 *   - batchTag: "BPT_GROUP_INIT_20260309" (para rollback)
 * 
 * EJECUCIÓN:  npx tsx src/scripts/create_bpt_group.ts
 */

import { collection, doc, setDoc, getDocs, query, where } from 'firebase/firestore';
import { trackedAddDoc } from '../services/firestoreHelpers';
import { db } from '../services/firebase';

const BATCH_TAG = 'BPT_GROUP_INIT_20260309';
const NOW = new Date().toISOString();

// ============================================================
// DATA FROM EXCEL FILES
// ============================================================

const SUCURSALES_DATA = [
    { franquicia: "Boston's Pizza", nombre: "Altabrisa", nomenclatura: "BA", direccion: "Calle 7 #451 x 20 y 22 Fracc. Altabrisa, Mérida", lat: 21.0185, lng: -89.5841 },
    { franquicia: "Boston's Pizza", nombre: "Gran Plaza", nomenclatura: "BGP", direccion: "Calle 50 #460 Gran Plaza, Mérida", lat: 21.0315, lng: -89.6292 },
    { franquicia: "Boston's Pizza", nombre: "Pensiones", nomenclatura: ".", direccion: "Calle 7 #215 Residencial Pensiones, Mérida", lat: 21.0003, lng: -89.6548 },
    { franquicia: "Boston's Pizza", nombre: "Caucel", nomenclatura: "BCA", direccion: "Av. Cronista Deportivo s/n Fracc. Ciudad Caucel, Mérida", lat: 20.9995, lng: -89.7021 },
    { franquicia: "Boston's Pizza", nombre: "Campeche", nomenclatura: ".", direccion: "Av. Adolfo Ruiz Cortines #51 (Plaza Galerías), Campeche", lat: 19.8517, lng: -90.5283 },
    { franquicia: "La Parroquia", nombre: "City Center", nomenclatura: ".", direccion: "Calle 30 #185 (Plaza City Center), Mérida", lat: 21.0267, lng: -89.5954 },
    { franquicia: "La Parroquia", nombre: "Caucel", nomenclatura: ".", direccion: "Periférico Poniente (Plaza Gran Santa Fe), Mérida", lat: 21.0012, lng: -89.7045 },
    { franquicia: "La Parroquia", nombre: "Campeche", nomenclatura: ".", direccion: "Av. Resurgimiento x Calle 15 (Malecón), Campeche", lat: 19.8342, lng: -90.5511 },
    { franquicia: "SUSHIROLL", nombre: "City Center", nomenclatura: ".", direccion: "Calle 30 #185 (Plaza City Center), Mérida", lat: 21.0268, lng: -89.5951 },
    { franquicia: "Corporativo BPT", nombre: "Comisariato / Panadería", nomenclatura: ".", direccion: "Calle 19 #95 Fracc. Industrial, Mérida", lat: 21.0089, lng: -89.5642 },
    { franquicia: "Corporativo BPT", nombre: "Oficina Corporativa (MB Xcanatún)", nomenclatura: ".", direccion: "Carr. Mérida-Progreso Km 12 (Xcanatún), Mérida", lat: 21.0924, lng: -89.6278 },
    { franquicia: "Corporativo BPT", nombre: "MB Dzityá", nomenclatura: ".", direccion: "Tablaje Catastral 34421 (Carretera Dzityá), Mérida", lat: 21.0541, lng: -89.6812 },
];

const EQUIPOS_DATA = [
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Coccion", nombre: "BA-Baño María (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Agua", nombre: "BA-Bomba de agua dura (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Agua", nombre: "BA-Bomba de agua suave (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Agua", nombre: "BA-Bomba de lodos (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Agua", nombre: "BA-Bomba de pozo (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Restaurante", nombre: "BA-Cafetera Nescafé (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Coccion", nombre: "BA-Calentador 220v 40 galones calorex dish (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Coccion", nombre: "BA-Calentador 220v 40 galones reen bodega (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Restaurante", nombre: "BA-Calentador de platos 110v expo (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Restaurante", nombre: "BA-Calentador de platos 110v expo (2)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Refrigeracion", nombre: "BA-Camara de congelación (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Refrigeracion", nombre: "BA-Camara de conserva (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Refrigeracion", nombre: "BA-Camara fría de cervezas (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Refrigeracion", nombre: "BA-Congelador de helados (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Refrigeracion", nombre: "BA-Congelador de papas (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Refrigeracion", nombre: "BA-Congelador de tarros vertical (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Refrigeracion", nombre: "BA-Enfriador de jugos (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Coccion", nombre: "BA-Estufa de inducción pastas (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Coccion", nombre: "BA-Estufa de inducción pastas (2)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Coccion", nombre: "BA-Estufa de inducción pastas (3)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Coccion", nombre: "BA-Estufa de induccion pastas (4)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Aires", nombre: "BA-Fan and coil área de juegos(1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Coccion", nombre: "BA-Freidora (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Coccion", nombre: "BA-Freidora (2)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Coccion", nombre: "BA-Freidora (3)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Coccion", nombre: "BA-Grill /parrilla (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Coccion", nombre: "BA-Hobart (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Coccion", nombre: "BA-Horno de convección (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Coccion", nombre: "BA-Horno de microondas de corte (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Coccion", nombre: "BA-Horno de microondas de pastas (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Coccion", nombre: "BA-Horno de microondas pizza (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Coccion", nombre: "BA-Horno de microondas pizza (2)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Coccion", nombre: "BA-Horno de microondas pizza (3)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Refrigeracion", nombre: "BA-Máquina de hielo (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Refrigeracion", nombre: "BA-Máquina de hielo (2)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Restaurante", nombre: "BA-Máquina de margaritas (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Restaurante", nombre: "BA-Máquina lavaloza (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Restaurante", nombre: "BA-Máquina lavaloza de Bar (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Restaurante", nombre: "BA-Mesa de pastas (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Aires", nombre: "BA-Minisplit oficina (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Aires", nombre: "BA-Minisplit palco (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Aires", nombre: "BA-Minisplit palco (2)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Aires", nombre: "BA-Minisplit terraza nueva (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Aires", nombre: "BA-Minisplit terraza nueva (2)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Refrigeracion", nombre: "BA-Nevera de cervezas barra (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Refrigeracion", nombre: "BA-Nevera de corte (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Refrigeracion", nombre: "BA-Nevera de parrilla (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Refrigeracion", nombre: "BA-Nevera de pizza (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Refrigeracion", nombre: "BA-Nevera de tarros horizontal barra (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Refrigeracion", nombre: "BA-Nevera de vinos (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Refrigeracion", nombre: "BA-Nevera vertical heineken palco (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Agua", nombre: "BA-Osmosis de agua purificada (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Generadores", nombre: "BA-Paneles (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Aires", nombre: "BA-Paquete aire acondicionado Bar (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Aires", nombre: "BA-Paquete aire acondicionado cocina (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Aires", nombre: "BA-Paquete aire acondicionado salón (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Generadores", nombre: "BA-Planta de emergencia (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Cocina", nombre: "BA-Rayador de quesos (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Cocina", nombre: "BA-Rebanadora (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Refrigeracion", nombre: "BA-Refrigerador de masas (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Refrigeracion", nombre: "BA-Refrigerador de postres (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Agua", nombre: "BA-Suavizadores (1)" },
    { sucursal: "Altabrisa", franquicia: "Boston's Pizza", familia: "Restaurante", nombre: "BA-Torre de cerveza (1)" },
];

const FAMILIAS = ["Coccion", "Agua", "Restaurante", "Refrigeracion", "Aires", "Generadores", "Cocina"];

const FRANQUICIAS = [
    {
        nombre: "Boston's Pizza",
        logoUrl: "https://firebasestorage.googleapis.com/v0/b/h-gestion-dev.firebasestorage.app/o/franquicias%2Flogos%2F1772527452849_image.png?alt=media&token=17205b2f-d7cf-434e-ace5-e2da115c7c2d",
        colorFondo: "#c40e2c"
    },
    {
        nombre: "La Parroquia",
        logoUrl: "https://firebasestorage.googleapis.com/v0/b/h-gestion-dev.firebasestorage.app/o/franquicias%2Flogos%2F1772527506415_image.png?alt=media&token=c4fff2be-cf24-463e-b61e-88cdbe7f0626",
        colorFondo: "#332324"
    },
    {
        nombre: "SUSHIROLL",
        logoUrl: "https://firebasestorage.googleapis.com/v0/b/h-gestion-dev.firebasestorage.app/o/franquicias%2Flogos%2F1772526438437_image.png?alt=media&token=16fd3546-4456-4678-a9a1-b1b1211dc597",
        colorFondo: "#332324"
    },
    {
        nombre: "Corporativo BPT",
        logoUrl: "https://firebasestorage.googleapis.com/v0/b/h-gestion-dev.firebasestorage.app/o/franquicias%2Flogos%2F1772526841639_image.png?alt=media&token=37960c7b-5340-4b9b-9833-b51862c29e18",
        colorFondo: "#FFFFFF"
    },
];

const RAW_SCHEDULE = [
    // ENERO (0)
    { mes: 0, fechas: '12', txtPDF: 'MB Dzityá', branchKey: 'Corporativo BPT|MB Dzityá' },
    { mes: 0, fechas: '20', txtPDF: 'Camp Bostons', branchKey: "Boston's Pizza|Campeche" },
    // FEBRERO (1)
    { mes: 1, fechas: '3', txtPDF: 'B Gran Plaza', branchKey: "Boston's Pizza|Gran Plaza" },
    { mes: 1, fechas: '5 - 6', txtPDF: 'Parr. City', branchKey: "La Parroquia|City Center" },
    { mes: 1, fechas: '12', txtPDF: 'B Altabrisa', branchKey: "Boston's Pizza|Altabrisa" },
    { mes: 1, fechas: '18', txtPDF: 'Panadería', branchKey: "Corporativo BPT|Comisariato / Panadería" },
    { mes: 1, fechas: '19', txtPDF: 'Camp Parroquia', branchKey: "La Parroquia|Campeche" },
    // MARZO (2)
    { mes: 2, fechas: '3', txtPDF: 'B Pens', branchKey: "Boston's Pizza|Pensiones" },
    { mes: 2, fechas: '5', txtPDF: 'Comisariato', branchKey: "Corporativo BPT|Comisariato / Panadería" },
    { mes: 2, fechas: '11', txtPDF: 'B Caucel', branchKey: "Boston's Pizza|Caucel" },
    { mes: 2, fechas: '18 - 19', txtPDF: 'Parr. Caucel', branchKey: "La Parroquia|Caucel" },
    { mes: 2, fechas: '23', txtPDF: 'MB Xcanatun', branchKey: "Corporativo BPT|Oficina Corporativa (MB Xcanatún)" },
    // ABRIL (3)
    { mes: 3, fechas: '7', txtPDF: 'Camp Sushi', branchKey: "SUSHIROLL|City Center" },
    { mes: 3, fechas: '20', txtPDF: 'MB Dzityá', branchKey: "Corporativo BPT|MB Dzityá" },
    // MAYO (4)
    { mes: 4, fechas: '5', txtPDF: 'B Gran Plaza', branchKey: "Boston's Pizza|Gran Plaza" },
    { mes: 4, fechas: '14', txtPDF: 'B. Altabrisa', branchKey: "Boston's Pizza|Altabrisa" },
    { mes: 4, fechas: '19', txtPDF: 'Panadería', branchKey: "Corporativo BPT|Comisariato / Panadería" },
    { mes: 4, fechas: '20', txtPDF: 'Camp Parroq', branchKey: "La Parroquia|Campeche" },
    { mes: 4, fechas: '21', txtPDF: 'Camp Bostons', branchKey: "Boston's Pizza|Campeche" },
    // JUNIO (5)
    { mes: 5, fechas: '2', txtPDF: 'B Pens', branchKey: "Boston's Pizza|Pensiones" },
    { mes: 5, fechas: '8', txtPDF: 'Comisariato', branchKey: "Corporativo BPT|Comisariato / Panadería" },
    { mes: 5, fechas: '10', txtPDF: 'B Caucel', branchKey: "Boston's Pizza|Caucel" },
    { mes: 5, fechas: '22', txtPDF: 'MB Xcanatun', branchKey: "Corporativo BPT|Oficina Corporativa (MB Xcanatún)" },
    // JULIO (6)
    { mes: 6, fechas: '7', txtPDF: 'Camp Sushi', branchKey: "SUSHIROLL|City Center" },
    { mes: 6, fechas: '13', txtPDF: 'MB Dzityá', branchKey: "Corporativo BPT|MB Dzityá" },
    { mes: 6, fechas: '20', txtPDF: 'Camp Bostons', branchKey: "Boston's Pizza|Campeche" },
    // AGOSTO (7)
    { mes: 7, fechas: '4', txtPDF: 'B Gran Plaza', branchKey: "Boston's Pizza|Gran Plaza" },
    { mes: 7, fechas: '10 - 11', txtPDF: 'Parr. City', branchKey: "La Parroquia|City Center" },
    { mes: 7, fechas: '13', txtPDF: 'B Altabrisa', branchKey: "Boston's Pizza|Altabrisa" },
    { mes: 7, fechas: '18', txtPDF: 'Panadería', branchKey: "Corporativo BPT|Comisariato / Panadería" },
    { mes: 7, fechas: '19', txtPDF: 'Camp Parroq', branchKey: "La Parroquia|Campeche" },
    // SEPTIEMBRE (8)
    { mes: 8, fechas: '1', txtPDF: 'B Pens', branchKey: "Boston's Pizza|Pensiones" },
    { mes: 8, fechas: '7', txtPDF: 'Comisariato', branchKey: "Corporativo BPT|Comisariato / Panadería" },
    { mes: 8, fechas: '9', txtPDF: 'B Caucel', branchKey: "Boston's Pizza|Caucel" },
    { mes: 8, fechas: '17 - 18', txtPDF: 'Parr. Caucel', branchKey: "La Parroquia|Caucel" },
    { mes: 8, fechas: '21', txtPDF: 'MB Xcanatun', branchKey: "Corporativo BPT|Oficina Corporativa (MB Xcanatún)" },
    // OCTUBRE (9)
    { mes: 9, fechas: '7', txtPDF: 'Camp Sushi', branchKey: "SUSHIROLL|City Center" },
    { mes: 9, fechas: '12', txtPDF: 'MB Dzityá', branchKey: "Corporativo BPT|MB Dzityá" },
    { mes: 9, fechas: '19', txtPDF: 'Camp Bostons', branchKey: "Boston's Pizza|Campeche" },
    // NOVIEMBRE (10)
    { mes: 10, fechas: '3', txtPDF: 'B Gran Plaza', branchKey: "Boston's Pizza|Gran Plaza" },
    { mes: 10, fechas: '9 - 10', txtPDF: 'Parr. City', branchKey: "La Parroquia|City Center" },
    { mes: 10, fechas: '12', txtPDF: 'B Altabrisa', branchKey: "Boston's Pizza|Altabrisa" },
    { mes: 10, fechas: '18', txtPDF: 'Panadería', branchKey: "Corporativo BPT|Comisariato / Panadería" },
    { mes: 10, fechas: '19', txtPDF: 'Camp Parroq', branchKey: "La Parroquia|Campeche" },
    // DICIEMBRE (11)
    { mes: 11, fechas: '1', txtPDF: 'B Pens', branchKey: "Boston's Pizza|Pensiones" },
    { mes: 11, fechas: '7', txtPDF: 'Comisariato', branchKey: "Corporativo BPT|Comisariato / Panadería" },
    { mes: 11, fechas: '9', txtPDF: 'B Caucel', branchKey: "Boston's Pizza|Caucel" },
    { mes: 11, fechas: '17 - 18', txtPDF: 'Parr. Caucel', branchKey: "La Parroquia|Caucel" },
    { mes: 11, fechas: '21', txtPDF: 'MB Xcanatun', branchKey: "Corporativo BPT|Oficina Corporativa (MB Xcanatún)" },
];

// ============================================================
// MAIN EXECUTION
// ============================================================

async function main() {
    console.log("╔══════════════════════════════════════════╗");
    console.log("║  CREACIÓN DE BPT GROUP — H-GESTIÓN       ║");
    console.log("╚══════════════════════════════════════════╝\n");

    // 0. Check if BPT GROUP already exists
    const existingQ = query(collection(db, 'clientes'), where('nombre', '==', 'BPT GROUP'));
    const existingSnap = await getDocs(existingQ);
    if (existingSnap.docs.length > 0) {
        console.error("⛔ BPT GROUP ya existe en la BD. Abortando.");
        process.exit(1);
    }

    // ───────────────────────────────────────
    // 1. CREAR CLIENTE
    // ───────────────────────────────────────
    console.log("1/8 Creando cliente BPT GROUP...");
    const clienteRef = await trackedAddDoc(collection(db, 'clientes'), {
        nombre: 'BPT GROUP',
        razonSocial: 'BPT GROUP S.A. de C.V.',
        batchTag: BATCH_TAG,
    });
    const clienteId = clienteRef.id;
    console.log(`   ✅ Cliente creado: ${clienteId}\n`);

    // ───────────────────────────────────────
    // 2. CREAR CONTADOR DE FOLIOS
    // ───────────────────────────────────────
    console.log("2/8 Creando contador de folios...");
    await setDoc(doc(db, 'config', `counters_${clienteId}`), {
        otNumber: 1000,
        preventiveOtNumber: 1,
        createdAt: NOW,
        batchTag: BATCH_TAG,
    });
    console.log(`   ✅ Contador: config/counters_${clienteId}\n`);

    // ───────────────────────────────────────
    // 3. CREAR FRANQUICIAS
    // ───────────────────────────────────────
    console.log("3/8 Creando franquicias...");
    const franquiciaMap: Record<string, string> = {}; // nombre → id
    for (const f of FRANQUICIAS) {
        const fRef = await trackedAddDoc(collection(db, 'franquicias'), {
            clienteId,
            nombre: f.nombre,
            logoUrl: f.logoUrl,
            colorFondo: f.colorFondo,
            batchTag: BATCH_TAG,
        });
        franquiciaMap[f.nombre] = fRef.id;
        console.log(`   ✅ ${f.nombre} → ${fRef.id}`);
    }
    console.log();

    // ───────────────────────────────────────
    // 4. CREAR SUCURSALES
    // ───────────────────────────────────────
    console.log("4/8 Creando sucursales...");
    const sucursalMap: Record<string, string> = {}; // nombre → id
    const allSucursalIds: string[] = [];
    for (const s of SUCURSALES_DATA) {
        const franquiciaId = franquiciaMap[s.franquicia];
        if (!franquiciaId) {
            console.error(`   ⛔ Franquicia "${s.franquicia}" no encontrada para sucursal "${s.nombre}". Abortando.`);
            process.exit(1);
        }
        const sRef = await trackedAddDoc(collection(db, 'sucursales'), {
            clienteId,
            franquiciaId,
            nombre: s.nombre,
            nomenclatura: s.nomenclatura,
            direccion: s.direccion,
            coordenadas: { lat: s.lat, lng: s.lng },
            batchTag: BATCH_TAG,
        });
        // Use franquicia+nombre as key for disambiguation (e.g. two "Caucel" sucursales)
        const key = `${s.franquicia}|${s.nombre}`;
        sucursalMap[key] = sRef.id;
        allSucursalIds.push(sRef.id);
        console.log(`   ✅ ${s.franquicia} > ${s.nombre} → ${sRef.id}`);
    }
    console.log();

    // ───────────────────────────────────────
    // 5. CREAR FAMILIAS
    // ───────────────────────────────────────
    console.log("5/8 Creando familias...");
    for (const fam of FAMILIAS) {
        await trackedAddDoc(collection(db, 'familias'), {
            clienteId,
            nombre: fam,
            batchTag: BATCH_TAG,
        });
        console.log(`   ✅ Familia: ${fam}`);
    }
    console.log();

    // ───────────────────────────────────────
    // 6. CREAR EQUIPOS
    // ───────────────────────────────────────
    console.log("6/8 Creando equipos...");
    let eqCount = 0;
    for (const eq of EQUIPOS_DATA) {
        const franquiciaId = franquiciaMap[eq.franquicia === "Boston's" ? "Boston's Pizza" : eq.franquicia];
        const sucKey = `${eq.franquicia === "Boston's" ? "Boston's Pizza" : eq.franquicia}|${eq.sucursal}`;
        const sucursalId = sucursalMap[sucKey];

        if (!franquiciaId || !sucursalId) {
            console.error(`   ⚠️  No se pudo resolver ${eq.nombre}: franq=${eq.franquicia}, suc=${eq.sucursal}`);
            continue;
        }

        await trackedAddDoc(collection(db, 'equipos'), {
            clienteId,
            sucursalId,
            franquiciaId,
            familia: eq.familia,
            nombre: eq.nombre,
            batchTag: BATCH_TAG,
        });
        eqCount++;
    }
    console.log(`   ✅ ${eqCount} equipos creados\n`);

    // ───────────────────────────────────────
    // 7. CREAR CATÁLOGOS DINÁMICOS
    // ───────────────────────────────────────
    console.log("7/8 Creando catálogos dinámicos...");

    // Roles de usuario
    const roles = ['Admin', 'Coordinador', 'Gerente', 'Supervisor', 'Tecnico', 'TecnicoExterno'];
    for (const rol of roles) {
        await trackedAddDoc(collection(db, 'catalogos'), {
            clienteId,
            tipo: 'roles',
            categoria: 'Roles de Usuario',
            nombre: rol,
            batchTag: BATCH_TAG,
        });
        console.log(`   ✅ Rol: ${rol}`);
    }

    // Especialidades de Técnicos Externos
    const especialidades = ['Refrigeracion', 'Aires', 'Coccion', 'Agua', 'Generadores', 'Cocina', 'Restaurante'];
    for (const esp of especialidades) {
        await trackedAddDoc(collection(db, 'catalogos'), {
            clienteId,
            tipo: 'especialidadesTecnicoExterno',
            categoria: 'Especialidades Técnico Externo',
            nombre: esp,
            batchTag: BATCH_TAG,
        });
        console.log(`   ✅ Especialidad: ${esp}`);
    }
    console.log();

    // ───────────────────────────────────────
    // 8. CREAR USUARIOS
    // ───────────────────────────────────────
    console.log("8/8 Creando usuarios...");

    // Buscar la sucursal Altabrisa (Boston's Pizza)
    const altabrisaId = sucursalMap["Boston's Pizza|Altabrisa"];

    const usuarios = [
        {
            nombre: 'Hector Celis',
            email: 'hcelis@tsigoglobal.com.mx',
            contrasena: '12345678',
            rol: 'Admin General',
            sucursalesPermitidas: [] as string[], // Admin General ve todo
        },
        {
            nombre: "Gerente Boston's Altabrisa",
            email: 'Gerente@BA.com',
            contrasena: '12345678',
            rol: 'Gerente',
            sucursalesPermitidas: [altabrisaId],
        },
        {
            nombre: 'Coordinador Corporativo',
            email: 'Coord@bptgroup.com',
            contrasena: '12345678',
            rol: 'Coordinador',
            sucursalesPermitidas: allSucursalIds, // Acceso a todas
        },
        {
            nombre: 'Tecnico Interno BA',
            email: 'Tec@BA.com',
            contrasena: '12345678',
            rol: 'Tecnico',
            sucursalesPermitidas: [altabrisaId],
        },
        {
            nombre: 'Especialista Refrigeracion',
            email: 'Especialista@Refri.com',
            contrasena: '12345678',
            rol: 'TecnicoExterno',
            especialidad: 'Refrigeracion',
            sucursalesPermitidas: allSucursalIds, // Acceso a todas
        },
        {
            nombre: 'Especialista Aires',
            email: 'Especialista@Aires.com',
            contrasena: '12345678',
            rol: 'TecnicoExterno',
            especialidad: 'Aires',
            sucursalesPermitidas: allSucursalIds, // Acceso a todas
        },
    ];

    for (const u of usuarios) {
        const uRef = await trackedAddDoc(collection(db, 'usuarios'), {
            clienteId,
            nombre: u.nombre,
            email: u.email,
            contrasena: u.contrasena,
            rol: u.rol,
            sucursalesPermitidas: u.sucursalesPermitidas,
            especialidad: (u as any).especialidad || '',
            batchTag: BATCH_TAG,
        });
        console.log(`   ✅ ${u.rol}: ${u.nombre} (${u.email}) → ${uRef.id}`);
    }

    // ───────────────────────────────────────
    // 9. CREAR PLAN PREVENTIVO 2026
    // ───────────────────────────────────────
    console.log("9/9 Creando plan preventivo 2026...");
    let prevCount = 0;
    for (const item of RAW_SCHEDULE) {
        // Resolve dynamic branchId and franchiseId
        // branchKey format: "Franquicia|NombreSucursal"
        const sucursalId = sucursalMap[item.branchKey];
        if (!sucursalId) {
            console.error(`   ⚠️  No se encontró la sucursal para el preventivo: ${item.branchKey}`);
            continue;
        }

        // We can get the franquiciaId dynamically since we know exactly which one it is
        const franquiciaName = item.branchKey.split('|')[0];
        const franquiciaId = franquiciaMap[franquiciaName];

        await trackedAddDoc(collection(db, 'planPreventivo2026'), {
            clienteId,
            mes: item.mes,
            fechas: item.fechas,
            sucursalId,
            franquiciaId,
            txtPDF: item.txtPDF,
            batchTag: BATCH_TAG
        });
        prevCount++;
    }
    console.log(`   ✅ ${prevCount} registros en planPreventivo2026\n`);

    // ───────────────────────────────────────
    // RESUMEN
    // ───────────────────────────────────────
    console.log("\n╔══════════════════════════════════════════╗");
    console.log("║  ✅ BPT GROUP CREADA EXITOSAMENTE        ║");
    console.log("╠══════════════════════════════════════════╣");
    console.log(`║  Cliente ID:   ${clienteId}`);
    console.log(`║  Franquicias:  ${Object.keys(franquiciaMap).length}`);
    console.log(`║  Sucursales:   ${allSucursalIds.length}`);
    console.log(`║  Equipos:      ${eqCount}`);
    console.log(`║  Familias:     ${FAMILIAS.length}`);
    console.log(`║  Usuarios:     ${usuarios.length}`);
    console.log(`║  Preventivos:  ${prevCount}`);
    console.log(`║  Batch Tag:    ${BATCH_TAG}`);
    console.log("╚══════════════════════════════════════════╝");

    process.exit(0);
}

main().catch(err => {
    console.error("⛔ ERROR FATAL:", err);
    process.exit(1);
});
