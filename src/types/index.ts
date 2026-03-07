export type UserRole = 'Admin' | 'Coordinador' | 'Gerente' | 'Supervisor' | 'Tecnico' | 'TecnicoExterno';

export interface User {
    id: string;
    clienteId: string;
    nombre: string;
    email: string; // Auth email
    rol: UserRole;
    sucursalesPermitidas: string[]; // IDs de sucursal
    especialidad?: 'Aires' | 'Coccion' | 'Refrigeracion' | 'Cocina' | 'Restaurante' | 'Local' | 'Agua' | 'Generadores';
    supervisorId?: string;
    coordinadorId?: string;
}

export interface Cliente {
    id: string;
    nombre: string;
    razonSocial: string;
}

export interface Franquicia {
    id: string;
    clienteId: string;
    nombre: string;
    sitioWeb?: string;
    logoUrl?: string;
    colorFondo?: string;
}

export interface Sucursal {
    id: string;
    clienteId: string;
    franquiciaId: string; // ID de la franquicia vinculada
    nombre: string;
    nomenclatura?: string; // Nueva nomenclatura de la unidad
    direccion: string;
    coordenadas: {
        lat: number;
        lng: number;
    };
}

export interface Equipo {
    id: string;
    clienteId: string;
    sucursalId: string;
    franquiciaId?: string; // ID de la franquicia vinculada
    familia: 'Aires' | 'Coccion' | 'Refrigeracion' | 'Cocina' | 'Restaurante' | 'Local' | 'Agua' | 'Generadores';
    nombre: string;
}

export type OTStatus = 'Asignada' | 'Llegada a Sitio' | 'Iniciada' | 'Concluida. Pendiente Firma Cliente' | 'Concluida' | 'Finalizada' | 'Pendiente' | 'CANCELADA';
export type OTPriority = 'ALTA' | 'MEDIA' | 'BAJA';

export interface WorkOrder {
    id: string; // Auto-generated Firestore ID
    numero: number; // Consecutivo único
    tipo: 'Correctivo' | 'Preventivo';
    preventivoPlanId?: string; // ID de la programación original que generó esta OT
    estatus: OTStatus;
    prioridad?: OTPriority;

    // Fechas y Horas
    fechas: {
        solicitada: string; // ISO String
        asignada?: string;
        llegada?: string;
        iniciada?: string;
        concluidaTecnico?: string; // New field for technician closure
        concluida?: string;
        concluidaFecha?: string; // dd/mm/yyyy o ISO date
        concluidaHora?: string;  // HH:mm
        finalizada?: string;
        finalizadaFecha?: string;
        finalizadaHora?: string;
        programada?: string;
    };

    // Participantes
    solicitanteId: string;
    tecnicoId?: string;
    supervisorId?: string;
    coordinadorId?: string;

    // Ubicación y Equipo
    clienteId: string;
    sucursalId: string;
    sucursalNombre?: string; // Nombre legible de la sucursal
    equipoId: string;

    // Detalles de Falla (Gerente)
    descripcionFalla: string;
    justificacion: string;
    fotosGerente: string[]; // URLs de Storage

    // Detalles de ejecución (Técnico)
    descripcionServicio?: string;
    fotoAntes?: string;
    fotoDespues?: string;
    fotoExtra?: string;
    coordsLlegada?: {
        lat: number;
        lng: number;
    };

    // Cierre
    firmaTecnico?: string; // URL de imagen base64 o Storage
    firmaCliente?: string;
    comentariosCliente?: string;
    repuestosUtilizados?: string;
}

export interface PreventivoProyectado {
    id: string;
    clienteId: string;
    sucursalId: string;
    equipoId: string;
    fechaProyectada: string;
    prioridad?: 'ALTA' | 'MEDIA' | 'BAJA';
    descripcionFalla: string;
    esProyeccion: boolean; // true si aun no tiene OT
}

// --- GENERACIÓN MASIVA DE OTs PREVENTIVAS v2.0 ---

/** Asignación individual: equipo → técnico → fecha programada */
export interface MassiveAssignment {
    equipoId: string;
    tecnicoId: string;
    fechaProgramada: string; // ISO date string
    familiaEquipo?: string; // Para tracking de distribución por familia
}

/** Registro maestro de una operación de generación/modificación masiva */
export interface MassiveBatchRecord {
    id?: string;
    preventivoPlanId: string;      // ID del evento del calendario que originó el batch
    sucursalId: string;
    fechaOperacion: string;        // ISO timestamp de cuándo se ejecutó el batch
    tipoOperacion: 'GENERACION' | 'MODIFICACION_MASIVA' | 'REVERSA';
    usuarioId: string;
    usuarioNombre: string;
    totalOTs: number;              // Cuántas OTs se afectaron
    asignaciones: MassiveAssignment[]; // Snapshot de la distribución al momento del batch
    otIdsAfectados: string[];      // IDs de las OTs creadas o modificadas
}

/** Cambio granular dentro de una operación masiva (para bitácora y reversas) */
export interface MassiveBatchChange {
    id?: string;
    batchRecordId: string;         // Referencia al MassiveBatchRecord padre
    otId: string;
    otNumero: number;
    equipoId: string;
    equipoNombre?: string;
    campo: 'tecnicoId' | 'fechas.programada';
    valorAnterior: string;
    valorNuevo: string;
    tecnicoAnteriorNombre?: string;
    tecnicoNuevoNombre?: string;
    fueModificadaIndividualmente: boolean; // TRUE si la OT fue tocada fuera del panel masivo
    fechaCambioIndividual?: string;        // Cuándo fue el cambio individual detectado
}
