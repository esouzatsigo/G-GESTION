const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, serverTimestamp } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
    authDomain: "h-gestion-testbpt.firebaseapp.com",
    projectId: "h-gestion-testbpt",
    storageBucket: "h-gestion-testbpt.firebasestorage.app",
    messagingSenderId: "385439061540",
    appId: "1:385439061540:web:95c1461abd46400724eab1",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const EQUIPOS_DATA = [
    { "nombre": "BA-Congelador de tarros vertical (1)", "familia": "ESP_REFRIGERACION" },
    { "nombre": "BA-Bomba de lodos (1)", "familia": "ESP_SISTEMAS_AGUA" },
    { "nombre": "BA-Camara de congelación (1)", "familia": "ESP_REFRIGERACION" },
    { "nombre": "BA-Horno de microondas de pastas (1)", "familia": "ESP_COCCION" },
    { "nombre": "BA-Rayador de quesos (1)", "familia": "ESP_COCINA_EQUIPOS" },
    { "nombre": "BA-Calentador 220v 40 galones calorex dish (1)", "familia": "ESP_COCCION" },
    { "nombre": "BA-Nevera de pizza (1)", "familia": "ESP_REFRIGERACION" },
    { "nombre": "BA-Nevera vertical heineken palco (1)", "familia": "ESP_REFRIGERACION" },
    { "nombre": "BA-Grill /parrilla (1)", "familia": "ESP_COCCION" },
    { "nombre": "BA-Hobart (1)", "familia": "ESP_COCCION" },
    { "nombre": "BA-Fan and coil área de juegos(1)", "familia": "ESP_AIRES_ACONDICIONADOS" },
    { "nombre": "BA-Horno de microondas pizza (1)", "familia": "ESP_COCCION" },
    { "nombre": "BA-Bomba de pozo (1)", "familia": "ESP_SISTEMAS_AGUA" },
    { "nombre": "BA-Enfriador de jugos (1)", "familia": "ESP_REFRIGERACION" },
    { "nombre": "BA-Freidora (2)", "familia": "ESP_COCCION" },
    { "nombre": "BA-Horno de microondas de corte (1)", "familia": "ESP_COCCION" },
    { "nombre": "BA-Camara fría de cervezas (1)", "familia": "ESP_REFRIGERACION" },
    { "nombre": "BA-Freidora (3)", "familia": "ESP_COCCION" },
    { "nombre": "BA-Minisplit oficina (1)", "familia": "ESP_AIRES_ACONDICIONADOS" },
    { "nombre": "BA-Estufa de inducción pastas (3)", "familia": "ESP_COCCION" },
    { "nombre": "BA-Nevera de tarros horizontal barra (1)", "familia": "ESP_REFRIGERACION" },
    { "nombre": "BA-Máquina de hielo (2)", "familia": "ESP_REFRIGERACION" },
    { "nombre": "BA-Calentador de platos 110v expo (1)", "familia": "ESP_RESTAURANTE" },
    { "nombre": "BA-Paquete aire acondicionado Bar (1)", "familia": "ESP_AIRES_ACONDICIONADOS" },
    { "nombre": "BA-Minisplit palco (2)", "familia": "ESP_AIRES_ACONDICIONADOS" },
    { "nombre": "BA-Bomba de agua dura (1)", "familia": "ESP_SISTEMAS_AGUA" },
    { "nombre": "BA-Rebanadora (1)", "familia": "ESP_COCINA_EQUIPOS" },
    { "nombre": "BA-Refrigerador de postres (1)", "familia": "ESP_REFRIGERACION" },
    { "nombre": "BA-Horno de microondas pizza (2)", "familia": "ESP_COCCION" },
    { "nombre": "BA-Minisplit terraza nueva (2)", "familia": "ESP_AIRES_ACONDICIONADOS" },
    { "nombre": "BA-Horno de convección (1)", "familia": "ESP_COCCION" },
    { "nombre": "BA-Máquina de hielo (1)", "familia": "ESP_REFRIGERACION" },
    { "nombre": "BA-Suavizadores (1)", "familia": "ESP_SISTEMAS_AGUA" },
    { "nombre": "BA-Planta de emergencia (1)", "familia": "ESP_GENERADORES_ELECTRICOS" },
    { "nombre": "BA-Calentador 220v 40 galones reen bodega (1)", "familia": "ESP_COCCION" },
    { "nombre": "BA-Paquete aire acondicionado salón (1)", "familia": "ESP_AIRES_ACONDICIONADOS" },
    { "nombre": "BA-Nevera de parrilla (1)", "familia": "ESP_REFRIGERACION" },
    { "nombre": "BA-Nevera de cervezas barra (1)", "familia": "ESP_REFRIGERACION" },
    { "nombre": "BA-Mesa de pastas (1)", "familia": "ESP_RESTAURANTE" },
    { "nombre": "BA-Nevera de corte (1)", "familia": "ESP_REFRIGERACION" },
    { "nombre": "BA-Congelador de papas (1)", "familia": "ESP_REFRIGERACION" },
    { "nombre": "BA-Estufa de inducción pastas (1)", "familia": "ESP_COCCION" },
    { "nombre": "BA-Camara de conserva (1)", "familia": "ESP_REFRIGERACION" },
    { "nombre": "BA-Freidora (1)", "familia": "ESP_COCCION" },
    { "nombre": "BA-Estufa de induccion pastas (4)", "familia": "ESP_COCCION" },
    { "nombre": "BA-Paquete aire acondicionado cocina (1)", "familia": "ESP_AIRES_ACONDICIONADOS" },
    { "nombre": "BA-Cafetera Nescafé (1)", "familia": "ESP_RESTAURANTE" },
    { "nombre": "BA-Refrigerador de masas (1)", "familia": "ESP_REFRIGERACION" },
    { "nombre": "BA-Bomba de agua suave (1)", "familia": "ESP_SISTEMAS_AGUA" },
    { "nombre": "BA-Nevera de vinos (1)", "familia": "ESP_REFRIGERACION" },
    { "nombre": "BA-Estufa de inducción pastas (2)", "familia": "ESP_COCCION" },
    { "nombre": "BA-Osmosis de agua purificada (1)", "familia": "ESP_SISTEMAS_AGUA" },
    { "nombre": "BA-Máquina lavaloza de Bar (1)", "familia": "ESP_RESTAURANTE" },
    { "nombre": "BA-Horno de microondas pizza (3)", "familia": "ESP_COCCION" },
    { "nombre": "BA-Paneles (1)", "familia": "ESP_GENERADORES_ELECTRICOS" },
    { "nombre": "BA-Calentador de platos 110v expo (2)", "familia": "ESP_RESTAURANTE" },
    { "nombre": "BA-Baño María (1)", "familia": "ESP_COCCION" },
    { "nombre": "BA-Máquina lavaloza (1)", "familia": "ESP_RESTAURANTE" },
    { "nombre": "BA-Torre de cerveza (1)", "familia": "ESP_RESTAURANTE" },
    { "nombre": "BA-Máquina de margaritas (1)", "familia": "ESP_RESTAURANTE" },
    { "nombre": "BA-Congelador de helados (1)", "familia": "ESP_REFRIGERACION" },
    { "nombre": "BA-Minisplit palco (1)", "familia": "ESP_AIRES_ACONDICIONADOS" },
    { "nombre": "BA-Minisplit terraza nueva (1)", "familia": "ESP_AIRES_ACONDICIONADOS" }
];

async function restoreAltabrisa() {
    console.log("🚑 INICIANDO RESTAURACIÓN DE EMERGENCIA - BOSTON'S ALTABRISA 🛡️");
    const sucursalId = 'HuwoZsAHef5kCZwCFirU';
    const clienteId = '3de6K2GeasZhN2GIQWXw';

    let count = 0;
    for (const eq of EQUIPOS_DATA) {
        // Generar un ID determinístico basado en el nombre para evitar duplicados si se corre varias veces
        const deterministicId = eq.nombre.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-BPT';
        const eqRef = doc(db, 'equipos', deterministicId);

        await setDoc(eqRef, {
            nombre: eq.nombre,
            familia: eq.familia,
            sucursalId: sucursalId,
            clienteId: clienteId,
            idInterno: 'REC-' + count.toString().padStart(3, '0'),
            activo: true,
            lastUpdate: serverTimestamp()
        }, { merge: true });

        console.log(`[+] Restaurado: ${eq.nombre} (${eq.familia})`);
        count++;
    }

    // Restaurar manualmente el equipo oficial solicitado por Héctor
    const camaraId = 'Camara-Congelacion-Walk-in-BPT';
    await setDoc(doc(db, 'equipos', camaraId), {
        nombre: 'Camara Congelacion Walk-in',
        familia: 'ESP_REFRIGERACION',
        sucursalId: sucursalId,
        clienteId: clienteId,
        idInterno: 'EQ-BA-REF-001',
        activo: true,
        lastUpdate: serverTimestamp()
    }, { merge: true });
    console.log(`[+] Restaurado: Camara Congelacion Walk-in (ESP_REFRIGERACION)`);

    console.log(`\n✅ RESTAURACIÓN COMPLETADA: ${count + 1} equipos devueltos a la Empresa Modelo.`);
}

restoreAltabrisa().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
