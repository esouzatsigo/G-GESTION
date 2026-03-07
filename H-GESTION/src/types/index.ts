export type UserRole = 'Admin' | 'Coordinador' | 'Gerente' | 'Supervisor' | 'Tecnico' | 'TecnicoExterno';

export interface User {
    id: string;
    clientId: string;
    nombre: string;
    email: string; // Auth email
    rol: UserRole;
    sucursalesPermitidas: string[]; // IDs de sucursal
    especialidad?: 'Aires' | 'Coccion' | 'Refrigeracion' | 'Agua' | 'Generadores';
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

export type OTStatus = 'Asignada' | 'Llegada a Sitio' | 'Iniciada' | 'Concluida. Pendiente Firma Cliente' | 'Concluida' | 'Terminada' | 'Pendiente';
export type OTPriority = 'ALTA' | 'MEDIA' | 'BAJA';

export interface WorkOrder {
    id: string; // Auto-generated Firestore ID
    numero: number; // Consecutivo único
    tipo: 'Correctivo' | 'Preventivo';
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
        terminada?: string;
        terminadaFecha?: string;
        terminadaHora?: string;
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
