/**
 * SCRIPT: Upload Preventivos BPT GROUP
 * Lee la programación extraída del PDF "BPT 2026 ICEMAS.pdf"
 * Busca los IDs reales de sucursal y franquicia del cliente "BPT GROUP"
 * E inserta los registros en 'planPreventivo2026'.
 * 
 * EJECUCIÓN: npx tsx src/scripts/upload_preventivos_bpt.ts
 */

import { collection, query, where, getDocs } from 'firebase/firestore';
import { trackedAddDoc } from '../services/firestoreHelpers';
import { db } from '../services/firebase';

const BATCH_TAG = 'BPT_GROUP_PREVENTIVOS_20260309';

// Mapeo crudo de la programación (mes base 0)
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

async function main() {
    console.log("Iniciando carga de Preventivos 2026 para BPT GROUP...");

    // 1. Obtener cliente BPT GROUP
    const qCliente = query(collection(db, 'clientes'), where('nombre', '==', 'BPT GROUP'));
    const snapCliente = await getDocs(qCliente);

    if (snapCliente.empty) {
        console.error("⛔ No se encontró la empresa BPT GROUP en Firestore.");
        process.exit(1);
    }
    const clienteId = snapCliente.docs[0].id;
    console.log(`✅ Cliente BPT GROUP encontrado: ${clienteId}`);

    // 2. Obtener franquicias para mapeo rápido
    const qFranq = query(collection(db, 'franquicias'), where('clienteId', '==', clienteId));
    const snapFranq = await getDocs(qFranq);
    const franquiciasList = snapFranq.docs.map(d => ({ id: d.id, ...d.data() as any }));

    // 3. Obtener sucursales
    const qSuc = query(collection(db, 'sucursales'), where('clienteId', '==', clienteId));
    const snapSuc = await getDocs(qSuc);

    const branchMap = new Map<string, { sucursalId: string, franquiciaId: string }>();

    for (const sDoc of snapSuc.docs) {
        const suc = sDoc.data();
        const franq = franquiciasList.find(f => f.id === suc.franquiciaId);
        if (franq) {
            const key = `${franq.nombre}|${suc.nombre}`;
            branchMap.set(key, { sucursalId: sDoc.id, franquiciaId: suc.franquiciaId });
        }
    }

    console.log(`✅ Se cargaron ${branchMap.size} sucursales mapeadas.`);

    // 4. Inyectar registros
    let creados = 0;
    for (const item of RAW_SCHEDULE) {
        const ids = branchMap.get(item.branchKey);
        if (!ids) {
            console.error(`⚠️  No se encontró la sucursal para la clave: ${item.branchKey}`);
            continue;
        }

        await trackedAddDoc(collection(db, 'planPreventivo2026'), {
            clienteId,
            mes: item.mes,
            fechas: item.fechas,
            sucursalId: ids.sucursalId,
            franquiciaId: ids.franquiciaId,
            txtPDF: item.txtPDF,
            batchTag: BATCH_TAG
        });
        creados++;
    }

    console.log(`\n🎉 ¡Carga completa! Se insertaron ${creados} registros de mantenimiento preventivo.`);
    process.exit(0);
}

main().catch(console.error);
