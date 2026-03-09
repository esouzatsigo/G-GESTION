import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../src/services/firebase';

// Mapeo autorizado por Héctor — nombre equipo → nomenclatura de familia
const FAMILIA_MAP: Record<string, string> = {
    'BA-Baño María (1)': 'ESP_COCCION',
    'BA-Bomba de agua dura (1)': 'ESP_AGUA',
    'BA-Bomba de agua suave (1)': 'ESP_AGUA',
    'BA-Bomba de lodos (1)': 'ESP_AGUA',
    'BA-Bomba de pozo (1)': 'ESP_AGUA',
    'BA-Cafetera Nescafé (1)': 'ESP_RESTAURANTE',
    'BA-Calentador 220v 40 galones calorex dish (1)': 'ESP_COCCION',
    'BA-Calentador 220v 40 galones reen bodega (1)': 'ESP_COCCION',
    'BA-Calentador de platos 110v expo (1)': 'ESP_RESTAURANTE',
    'BA-Calentador de platos 110v expo (2)': 'ESP_RESTAURANTE',
    'BA-Camara de congelación (1)': 'ESP_REFRIGERACION',
    'BA-Camara de conserva (1)': 'ESP_REFRIGERACION',
    'BA-Camara fría de cervezas (1)': 'ESP_REFRIGERACION',
    'BA-Congelador de helados (1)': 'ESP_REFRIGERACION',
    'BA-Congelador de papas (1)': 'ESP_REFRIGERACION',
    'BA-Congelador de tarros vertical (1)': 'ESP_REFRIGERACION',
    'BA-Enfriador de jugos (1)': 'ESP_REFRIGERACION',
    'BA-Estufa de inducción pastas (1)': 'ESP_COCCION',
    'BA-Estufa de inducción pastas (2)': 'ESP_COCCION',
    'BA-Estufa de inducción pastas (3)': 'ESP_COCCION',
    'BA-Estufa de induccion pastas (4)': 'ESP_COCCION',
    'BA-Fan and coil área de juegos(1)': 'ESP_AIRES',
    'BA-Freidora (1)': 'ESP_COCCION',
    'BA-Freidora (2)': 'ESP_COCCION',
    'BA-Freidora (3)': 'ESP_COCCION',
    'BA-Grill /parrilla (1)': 'ESP_COCCION',
    'BA-Hobart (1)': 'ESP_COCCION',
    'BA-Horno de convección (1)': 'ESP_COCCION',
    'BA-Horno de microondas de corte (1)': 'ESP_COCCION',
    'BA-Horno de microondas de pastas (1)': 'ESP_COCCION',
    'BA-Horno de microondas pizza (1)': 'ESP_COCCION',
    'BA-Horno de microondas pizza (2)': 'ESP_COCCION',
    'BA-Horno de microondas pizza (3)': 'ESP_COCCION',
    'BA-Máquina de hielo (1)': 'ESP_REFRIGERACION',
    'BA-Máquina de hielo (2)': 'ESP_REFRIGERACION',
    'BA-Máquina de margaritas (1)': 'ESP_RESTAURANTE',
    'BA-Máquina lavaloza (1)': 'ESP_RESTAURANTE',
    'BA-Máquina lavaloza de Bar (1)': 'ESP_RESTAURANTE',
    'BA-Mesa de pastas (1)': 'ESP_RESTAURANTE',
    'BA-Minisplit oficina (1)': 'ESP_AIRES',
    'BA-Minisplit palco (1)': 'ESP_AIRES',
    'BA-Minisplit palco (2)': 'ESP_AIRES',
    'BA-Minisplit terraza nueva (1)': 'ESP_AIRES',
    'BA-Minisplit terraza nueva (2)': 'ESP_AIRES',
    'BA-Nevera de cervezas barra (1)': 'ESP_REFRIGERACION',
    'BA-Nevera de corte (1)': 'ESP_REFRIGERACION',
    'BA-Nevera de parrilla (1)': 'ESP_REFRIGERACION',
    'BA-Nevera de pizza (1)': 'ESP_REFRIGERACION',
    'BA-Nevera de tarros horizontal barra (1)': 'ESP_REFRIGERACION',
    'BA-Nevera de vinos (1)': 'ESP_REFRIGERACION',
    'BA-Nevera vertical heineken palco (1)': 'ESP_REFRIGERACION',
    'BA-Osmosis de agua purificada (1)': 'ESP_AGUA',
    'BA-Paneles (1)': 'ESP_GENERADORES',
    'BA-Paquete aire acondicionado Bar (1)': 'ESP_AIRES',
    'BA-Paquete aire acondicionado cocina (1)': 'ESP_AIRES',
    'BA-Paquete aire acondicionado salón (1)': 'ESP_AIRES',
    'BA-Planta de emergencia (1)': 'ESP_GENERADORES',
    'BA-Rayador de quesos (1)': 'ESP_COCINA',
    'BA-Rebanadora (1)': 'ESP_COCINA',
    'BA-Refrigerador de masas (1)': 'ESP_REFRIGERACION',
    'BA-Refrigerador de postres (1)': 'ESP_REFRIGERACION',
    'BA-Suavizadores (1)': 'ESP_AGUA',
    'BA-Torre de cerveza (1)': 'ESP_RESTAURANTE',
};

async function fixFamilias() {
    const clienteId = '3de6K2GeasZhN2GIQWXw';
    const q = query(collection(db, 'equipos'), where('sucursalId', '==', 'BA'), where('clienteId', '==', clienteId));
    const snap = await getDocs(q);

    console.log(`--- Corrección de Familias: ${snap.size} equipos encontrados ---`);

    let updated = 0;
    let notFound = 0;
    let alreadyCorrect = 0;

    for (const d of snap.docs) {
        const data = d.data();
        const nombre = data.nombre;
        const correctFamily = FAMILIA_MAP[nombre];

        if (!correctFamily) {
            console.log(`⚠️  Sin mapeo: "${nombre}" (familia actual: ${data.familia})`);
            notFound++;
            continue;
        }

        if (data.familia === correctFamily) {
            alreadyCorrect++;
            continue;
        }

        console.log(`✏️  ${nombre}: ${data.familia} → ${correctFamily}`);
        await updateDoc(doc(db, 'equipos', d.id), { familia: correctFamily });
        updated++;
    }

    console.log(`\n--- RESUMEN ---`);
    console.log(`Actualizados: ${updated}`);
    console.log(`Ya correctos: ${alreadyCorrect}`);
    console.log(`Sin mapeo: ${notFound}`);
}

fixFamilias().catch(console.error);
