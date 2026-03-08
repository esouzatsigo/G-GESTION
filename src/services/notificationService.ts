/**
 * SERVICIO DE NOTIFICACIONES H-GESTIÓN
 * Sistema de alertas multi-rol con persistencia en Firestore.
 * 
 * Colección: notificaciones
 * Estructura:
 *   id, destinatarioId, destinatarioRol, clienteId,
 *   tipo (NUEVA_OT | ASIGNACION_OT | MASIVA_PREVENTIVA | CAMBIO_OT),
 *   titulo, mensaje, otId?, otNumero?, fecha, leida, leidaEn?
 */
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

export interface Notificacion {
    id?: string;
    destinatarioId: string;
    destinatarioRol: string;
    clienteId: string;
    tipo: 'NUEVA_OT' | 'ASIGNACION_OT' | 'MASIVA_PREVENTIVA' | 'CAMBIO_OT';
    titulo: string;
    mensaje: string;
    otId?: string;
    otNumero?: number;
    sucursalNombre?: string;
    fecha: string;
    leida: boolean;
    leidaEn?: string;
    usuarioOrigen?: string;
    usuarioOrigenNombre?: string;
    // Campos enriquecidos para Coordinador
    descripcionFalla?: string;
    justificacion?: string;
    fechaRegistro?: string;
    fotosUrls?: string[];
    equipoNombre?: string;
    familiaNombre?: string;
}

// ============================================================
// ESCRITURA: Crear notificaciones
// ============================================================

/**
 * Crea una notificación para un destinatario específico.
 */
export const crearNotificacion = async (notif: Omit<Notificacion, 'id' | 'leida' | 'fecha'>) => {
    const data: Omit<Notificacion, 'id'> = {
        ...notif,
        fecha: new Date().toISOString(),
        leida: false,
    };
    const docRef = await addDoc(collection(db, 'notificaciones'), data);
    return docRef.id;
};

/**
 * Notificar al Coordinador: Nueva OT creada por un Gerente.
 */
export const notificarNuevaOT = async (
    coordinadorId: string,
    clienteId: string,
    otNumero: number,
    otId: string,
    sucursalNombre: string,
    gerenteNombre: string,
    descripcionFalla: string,
    justificacion?: string,
    fotosUrls?: string[],
    equipoNombre?: string,
    familiaNombre?: string
) => {
    return crearNotificacion({
        destinatarioId: coordinadorId,
        destinatarioRol: 'Coordinador',
        clienteId,
        tipo: 'NUEVA_OT',
        titulo: `🆕 Nueva OT #${otNumero}`,
        mensaje: `${gerenteNombre} reportó una falla en ${sucursalNombre}: "${descripcionFalla.substring(0, 120)}${descripcionFalla.length > 120 ? '...' : ''}"`,
        otId,
        otNumero,
        sucursalNombre,
        usuarioOrigen: gerenteNombre,
        usuarioOrigenNombre: gerenteNombre,
        descripcionFalla,
        justificacion: justificacion || '',
        fechaRegistro: new Date().toISOString(),
        fotosUrls: fotosUrls || [],
        equipoNombre: equipoNombre || '',
        familiaNombre: familiaNombre || '',
    });
};

/**
 * Notificar al Gerente: OT asignada a técnico.
 */
export const notificarAsignacionOT = async (
    gerenteId: string,
    clienteId: string,
    otNumero: number,
    otId: string,
    sucursalNombre: string,
    tecnicoNombre: string,
    fechaProgramada: string,
    coordinadorNombre: string
) => {
    return crearNotificacion({
        destinatarioId: gerenteId,
        destinatarioRol: 'Gerente',
        clienteId,
        tipo: 'ASIGNACION_OT',
        titulo: `✅ OT #${otNumero} Asignada`,
        mensaje: `${coordinadorNombre} asignó al técnico ${tecnicoNombre} para la OT #${otNumero} en ${sucursalNombre}. Fecha programada: ${fechaProgramada}`,
        otId,
        otNumero,
        sucursalNombre,
        usuarioOrigen: coordinadorNombre,
        usuarioOrigenNombre: coordinadorNombre,
    });
};

/**
 * Notificar al Técnico: OT asignada a él.
 */
export const notificarTecnicoAsignacion = async (
    tecnicoId: string,
    clienteId: string,
    otNumero: number,
    otId: string,
    sucursalNombre: string,
    equipoNombre: string,
    familia: string,
    descripcionFalla: string,
    fechaProgramada: string,
    prioridad: string,
    coordinadorNombre: string
) => {
    return crearNotificacion({
        destinatarioId: tecnicoId,
        destinatarioRol: 'Tecnico',
        clienteId,
        tipo: 'ASIGNACION_OT',
        titulo: `🔧 OT #${otNumero} Asignada a ti`,
        mensaje: `Sucursal: ${sucursalNombre} | Equipo: ${equipoNombre} (${familia}) | Falla: "${descripcionFalla.substring(0, 60)}${descripcionFalla.length > 60 ? '...' : ''}" | Prioridad: ${prioridad} | Fecha: ${fechaProgramada}`,
        otId,
        otNumero,
        sucursalNombre,
        usuarioOrigen: coordinadorNombre,
        usuarioOrigenNombre: coordinadorNombre,
    });
};

/**
 * Notificar al Gerente: Generación masiva de OTs preventivas.
 */
export const notificarMasivaPreventiva = async (
    gerenteId: string,
    clienteId: string,
    sucursalNombre: string,
    totalOTs: number,
    tecnicosInvolucrados: string[],
    fechaInicio: string,
    coordinadorNombre: string
) => {
    const tecList = tecnicosInvolucrados.length <= 3
        ? tecnicosInvolucrados.join(', ')
        : `${tecnicosInvolucrados.slice(0, 3).join(', ')} y ${tecnicosInvolucrados.length - 3} más`;
    return crearNotificacion({
        destinatarioId: gerenteId,
        destinatarioRol: 'Gerente',
        clienteId,
        tipo: 'MASIVA_PREVENTIVA',
        titulo: `📋 ${totalOTs} OTs Preventivas Generadas`,
        mensaje: `Se generaron ${totalOTs} órdenes de mantenimiento preventivo para ${sucursalNombre}. Técnicos: ${tecList}. Fecha inicio: ${fechaInicio}`,
        sucursalNombre,
        usuarioOrigen: coordinadorNombre,
        usuarioOrigenNombre: coordinadorNombre,
    });
};

/**
 * Notificar al Coordinador: Cambio en OT Pendiente por un Gerente.
 */
export const notificarCambioOT = async (
    coordinadorId: string,
    clienteId: string,
    otNumero: number,
    otId: string,
    campo: string,
    valorAnterior: string,
    valorNuevo: string,
    gerenteNombre: string,
    sucursalNombre: string
) => {
    return crearNotificacion({
        destinatarioId: coordinadorId,
        destinatarioRol: 'Coordinador',
        clienteId,
        tipo: 'CAMBIO_OT',
        titulo: `📝 OT #${otNumero} Modificada`,
        mensaje: `${gerenteNombre} modificó "${campo}" en OT #${otNumero} (${sucursalNombre}): "${valorAnterior}" → "${valorNuevo}"`,
        otId,
        otNumero,
        sucursalNombre,
        usuarioOrigen: gerenteNombre,
        usuarioOrigenNombre: gerenteNombre,
    });
};

// ============================================================
// LECTURA: Obtener notificaciones
// ============================================================

/**
 * Obtiene las notificaciones no leídas de un usuario.
 * Usa una sola cláusula where para evitar índices compuestos.
 */
export const getNotificacionesNoLeidas = async (userId: string): Promise<Notificacion[]> => {
    const q = query(
        collection(db, 'notificaciones'),
        where('destinatarioId', '==', userId)
    );
    const snap = await getDocs(q);
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Notificacion))
        .filter(n => !n.leida)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
};

/**
 * Obtiene las notificaciones leídas de un usuario (últimos 15 días).
 */
export const getNotificacionesLeidas = async (userId: string): Promise<Notificacion[]> => {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
    const q = query(
        collection(db, 'notificaciones'),
        where('destinatarioId', '==', userId)
    );
    const snap = await getDocs(q);
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() } as Notificacion))
        .filter(n => n.leida && new Date(n.fecha) >= fifteenDaysAgo)
        .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
};

/**
 * Marca una notificación como leída.
 */
export const marcarComoLeida = async (notifId: string) => {
    await updateDoc(doc(db, 'notificaciones', notifId), {
        leida: true,
        leidaEn: new Date().toISOString(),
    });
};

/**
 * Marca todas las no leídas de un usuario como leídas.
 */
export const marcarTodasComoLeidas = async (userId: string) => {
    const noLeidas = await getNotificacionesNoLeidas(userId);
    const ahora = new Date().toISOString();
    await Promise.all(
        noLeidas.map(n => updateDoc(doc(db, 'notificaciones', n.id!), { leida: true, leidaEn: ahora }))
    );
};
