/**
 * ROUTER MULTI-PROYECTO (LOBBY)
 * 
 * Centraliza la lógica para determinar a qué proyecto Firebase debe
 * conectarse un usuario basándose en su email, de forma que el sistema
 * multi-cliente sea completamente transparente.
 */

// NOTA: Esta tabla define en qué proyecto reside físicamente el usuario.
// En un sistema automatizado, esto se buscaría en una "Cloud Function Global",
// pero dada la arquitectura actual (y que sabemos exactamente quién va a dónde),
// mantener un registry estático inicial es lo más seguro y rápido.

export const ROUTING_TABLE: Record<string, 'BPT_GROUP' | 'TEST_BPT'> = {
    // ════════════════════════════════════════════════
    // CORREOS DE TEST BPT (Nuevo Proyecto Clonado)
    // ════════════════════════════════════════════════
    'gerente@ba.com': 'TEST_BPT',
    'tec@ba.com': 'TEST_BPT',
    'tec.bpt@ba.com': 'TEST_BPT',
    'sup@ba.com': 'TEST_BPT',
    'gerente.ba@bpt.com': 'TEST_BPT',
    'tecnico.ba@bpt.com': 'TEST_BPT',
    'supervisor.ba@bpt.com': 'TEST_BPT',
    'gerente.altabrisa@bpt.com': 'TEST_BPT',
    'tecnico.altabrisa@bpt.com': 'TEST_BPT',

    'gerente.caucel@hgestion.com': 'TEST_BPT',
    'tecnico.caucel@bpt.com': 'TEST_BPT',
    'gerente.pensiones@hgestion.com': 'TEST_BPT',
    'tecnico.pensiones@bpt.com': 'TEST_BPT',
    'gerente.granplaza@hgestion.com': 'TEST_BPT',
    'tecnico.granplaza@bpt.com': 'TEST_BPT',
    'gerente.citycenter@hgestion.com': 'TEST_BPT',
    'tecnico.citycenter@bpt.com': 'TEST_BPT',
    'gerente.campeche@hgestion.com': 'TEST_BPT',
    'tecnico.campeche@bpt.com': 'TEST_BPT',
    'gerente.montejo@hgestion.com': 'TEST_BPT',
    'tecnico.montejo@bpt.com': 'TEST_BPT',

    'gerente.comisariatopanadera@hgestion.com': 'TEST_BPT',
    'tecnico.comisariatopanadera@bpt.com': 'TEST_BPT',
    'gerente.oficinacorporativambxcanatn@hgestion.com': 'TEST_BPT',
    'tecnico.oficinacorporativambxcanatn@bpt.com': 'TEST_BPT',
    'gerente.mbdzity@hgestion.com': 'TEST_BPT',
    'tecnico.mbdzity@bpt.com': 'TEST_BPT',

    'coord@bptgorup.com': 'TEST_BPT', // Note: Typo in original DB preserved for routing
    'supervisor@t-sigo.com': 'TEST_BPT',
    'tec.aires@esterno.com': 'TEST_BPT',
    'tec.ref@externo': 'TEST_BPT',
    'tec.ad@ba': 'TEST_BPT',
    'ivango@bpt.com': 'TEST_BPT',
    
    // ════════════════════════════════════════════════
    // CORREOS GLOBALES / ADMINS (PROYECTO ORIGINAL)
    // ════════════════════════════════════════════════
    'hhcelis@hgestion.com': 'BPT_GROUP',
    'hcelis@tsigoglobal.com.mx': 'BPT_GROUP'
};

/**
 * Función para resolver dinámicamente el proyecto de un email.
 * Si el dominio pertenece a BPT y aún no está en la tabla estática,
 * se puede aplicar heurística, pero por seguridad, si no se sabe,
 * se enruta al Lobby (BPT_GROUP) para que el login falle nativamente 
 * si no existe en absoluto.
 * 
 * @param email Correo electrónico ingresado en el login
 * @returns La clave del proyecto al cual redirigir
 */
export const resolveProjectForEmail = (email: string): 'BPT_GROUP' | 'TEST_BPT' => {
    const cleanEmail = email.trim().toLowerCase();
    
    // 1. Búsqueda exacta en la tabla estática
    // (Asegurar que todas las llaves de ROUTING_TABLE estén en lowercase)
    const exactMatch = Object.entries(ROUTING_TABLE).find(
        ([key]) => key.toLowerCase() === cleanEmail
    );
    
    if (exactMatch) {
        return exactMatch[1];
    }
    
    // 2. Heurística Corporativa (Opcional - actualmente todos al Lobby por defecto)
    // Usuarios de Comercializadora Nacional (BPT GROUP original)
    if (cleanEmail.includes('ger.altabrisa@bp.com') || cleanEmail.includes('tecnico.altabrisa@hgestion.com')) {
        return 'BPT_GROUP';
    }

    // 3. Fallback: Todos al Lobby base (el proyecto original)
    // El Auth nativo de Firebase rechazará el login si no existen,
    // que es exactamente el comportamiento deseado.
    return 'BPT_GROUP';
};
