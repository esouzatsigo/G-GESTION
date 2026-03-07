import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
    collection,
    getDocs,
    addDoc,
    where
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { tenantQuery } from '../services/tenantContext';
import { cleanString } from '../utils/cleaners';
import {
    Calendar,
    MapPin,
    Coffee,
    Pizza,
    Download,
    Info,
    LayoutDashboard,
    ArrowRight,
    Loader2,
    Drumstick,
    Fish,
    Edit3,
    History,
    RotateCcw,
    Save,
    Upload,
    FileText,
    AlertCircle,
    CheckCircle,
    Settings,
    X,
    Users,
    Lock,
    Clock,
    Plus
} from 'lucide-react';
import {
    updatePreventivoPlan,
    getBitacoraPreventivos,
    undoPreventivoChange,
    importPreventivoPlan,
    getCounterConfig,
    updateCounterConfig,
    updateWorkOrder,
    addBitacoraEntry,
    type PreventivoPlanEntry,
    type BitacoraPreventivo
} from '../services/dataService';
import type { Sucursal, Equipo, WorkOrder, Franquicia, User } from '../types';
import { useNotification } from '../context/NotificationContext';
import { MassiveOTWizard } from '../components/MassiveOTWizard';
import { MassiveOTDashboard } from '../components/MassiveOTDashboard';
import { useAuth } from '../hooks/useAuth';
import { downloadCSV } from '../utils/fileDownload';

// Chart.js imports
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

// Datos Estáticos del Plan BPT 2026 (Proporcionados por el Usuario)
const PLAN_2026 = [
    // ENERO
    { mes: 0, fechas: '12', sucursalId: 'tmQHKne6BlMFqdICP3DI', txtPDF: 'MB Dzityá' },
    { mes: 0, fechas: '20', sucursalId: 'MBIpcrIvTAbPHNvyypTN', txtPDF: 'Camp Bostons' },
    // FEBRERO
    { mes: 1, fechas: '3', sucursalId: 'X8Mb8ee1zg3HmobPeUOt', txtPDF: 'B Gran Plaza' },
    { mes: 1, fechas: '5 - 6', sucursalId: 'QasVH9RAZKlSuaCYZw6N', txtPDF: 'Parr. City' },
    { mes: 1, fechas: '12', sucursalId: 'HocVkOhJBlw3JAulA0Gb', txtPDF: 'B Altabrisa' },
    { mes: 1, fechas: '18', sucursalId: 'Y9Cu0FxR5NA8deNTm0D3', txtPDF: 'Panadería' },
    { mes: 1, fechas: '19', sucursalId: 'TpJoq0yMVvsrPNfKSBBr', txtPDF: 'Camp Parroquia' },
    // MARZO
    { mes: 2, fechas: '3', sucursalId: '4GipsUh9rTx391J6RM6A', txtPDF: 'B Pens' },
    { mes: 2, fechas: '5', sucursalId: 'Y9Cu0FxR5NA8deNTm0D3', txtPDF: 'Comisariato' },
    { mes: 2, fechas: '6', sucursalId: 'BA', txtPDF: 'B Altabrisa' },
    { mes: 2, fechas: '11', sucursalId: 'G8uSICvhYBN5e7C5aXvj', txtPDF: 'B Caucel' },
    { mes: 2, fechas: '18 - 19', sucursalId: 'MHe8zggUNx0ByyURbG71', txtPDF: 'Parr. Caucel' },
    { mes: 2, fechas: '23', sucursalId: 'VRJSUXdXepBLyi6PjD1n', txtPDF: 'MB Xcanatún' },
    // ABRIL
    { mes: 3, fechas: '7', sucursalId: 'qnj7AHjSOkpTYq73KX5t', txtPDF: 'Camp Sushi' },
    { mes: 3, fechas: '20', sucursalId: 'tmQHKne6BlMFqdICP3DI', txtPDF: 'MB Dzityá' },
    { mes: 3, fechas: '21', sucursalId: 'MBIpcrIvTAbPHNvyypTN', txtPDF: 'Camp Bostons' },
    // MAYO
    { mes: 4, fechas: '5', sucursalId: 'X8Mb8ee1zg3HmobPeUOt', txtPDF: 'B Gran Plaza' },
    { mes: 4, fechas: '11', sucursalId: 'QasVH9RAZKlSuaCYZw6N', txtPDF: 'P. City' },
    { mes: 4, fechas: '14', sucursalId: 'HocVkOhJBlw3JAulA0Gb', txtPDF: 'B Altabrisa' },
    { mes: 4, fechas: '19', sucursalId: 'Y9Cu0FxR5NA8deNTm0D3', txtPDF: 'Panadería' },
    { mes: 4, fechas: '20', sucursalId: 'TpJoq0yMVvsrPNfKSBBr', txtPDF: 'Camp Parroquia' },
    // JUNIO
    { mes: 5, fechas: '2', sucursalId: '4GipsUh9rTx391J6RM6A', txtPDF: 'B Pens' },
    { mes: 5, fechas: '8', sucursalId: 'Y9Cu0FxR5NA8deNTm0D3', txtPDF: 'Comisariato' },
    { mes: 5, fechas: '10', sucursalId: 'G8uSICvhYBN5e7C5aXvj', txtPDF: 'B Caucel' },
    { mes: 5, fechas: '17', sucursalId: 'MHe8zggUNx0ByyURbG71', txtPDF: 'Parr. Caucel' },
    { mes: 5, fechas: '22', sucursalId: 'VRJSUXdXepBLyi6PjD1n', txtPDF: 'MB Xcanatún' },
    // JULIO
    { mes: 6, fechas: '7', sucursalId: 'qnj7AHjSOkpTYq73KX5t', txtPDF: 'Camp Sushi' },
    { mes: 6, fechas: '13', sucursalId: 'tmQHKne6BlMFqdICP3DI', txtPDF: 'MB Dzityá' },
    { mes: 6, fechas: '20', sucursalId: 'MBIpcrIvTAbPHNvyypTN', txtPDF: 'Camp Bostons' },
    // AGOSTO
    { mes: 7, fechas: '4', sucursalId: 'X8Mb8ee1zg3HmobPeUOt', txtPDF: 'B Gran Plaza' },
    { mes: 7, fechas: '10 - 11', sucursalId: 'QasVH9RAZKlSuaCYZw6N', txtPDF: 'Parr. City' },
    { mes: 7, fechas: '13', sucursalId: 'HocVkOhJBlw3JAulA0Gb', txtPDF: 'B Altabrisa' },
    { mes: 7, fechas: '18', sucursalId: 'Y9Cu0FxR5NA8deNTm0D3', txtPDF: 'Panadería' },
    { mes: 7, fechas: '19', sucursalId: 'TpJoq0yMVvsrPNfKSBBr', txtPDF: 'Camp Parroquia' },
    // SEPTIEMBRE
    { mes: 8, fechas: '1', sucursalId: '4GipsUh9rTx391J6RM6A', txtPDF: 'B Pens' },
    { mes: 8, fechas: '7', sucursalId: 'Y9Cu0FxR5NA8deNTm0D3', txtPDF: 'Comisariato' },
    { mes: 8, fechas: '9', sucursalId: 'G8uSICvhYBN5e7C5aXvj', txtPDF: 'B Caucel' },
    { mes: 8, fechas: '17 - 18', sucursalId: 'MHe8zggUNx0ByyURbG71', txtPDF: 'Parr. Caucel' },
    { mes: 8, fechas: '21', sucursalId: 'VRJSUXdXepBLyi6PjD1n', txtPDF: 'MB Xcanatún' },
    // OCTUBRE
    { mes: 9, fechas: '7', sucursalId: 'qnj7AHjSOkpTYq73KX5t', txtPDF: 'Camp Sushi' },
    { mes: 9, fechas: '12', sucursalId: 'tmQHKne6BlMFqdICP3DI', txtPDF: 'MB Dzityá' },
    { mes: 9, fechas: '19', sucursalId: 'MBIpcrIvTAbPHNvyypTN', txtPDF: 'Camp Bostons' },
    // NOVIEMBRE
    { mes: 10, fechas: '3', sucursalId: 'X8Mb8ee1zg3HmobPeUOt', txtPDF: 'B Gran Plaza' },
    { mes: 10, fechas: '9 - 10', sucursalId: 'QasVH9RAZKlSuaCYZw6N', txtPDF: 'Parr. City' },
    { mes: 10, fechas: '12', sucursalId: 'HocVkOhJBlw3JAulA0Gb', txtPDF: 'B Altabrisa' },
    { mes: 10, fechas: '18', sucursalId: 'Y9Cu0FxR5NA8deNTm0D3', txtPDF: 'Panadería' },
    { mes: 10, fechas: '19', sucursalId: 'TpJoq0yMVvsrPNfKSBBr', txtPDF: 'Camp Parroquia' },
    // DICIEMBRE
    { mes: 11, fechas: '1', sucursalId: '4GipsUh9rTx391J6RM6A', txtPDF: 'B Pens' },
    { mes: 11, fechas: '7', sucursalId: 'Y9Cu0FxR5NA8deNTm0D3', txtPDF: 'Comisariato' },
    { mes: 11, fechas: '9', sucursalId: 'G8uSICvhYBN5e7C5aXvj', txtPDF: 'B Caucel' },
    { mes: 11, fechas: '17 - 18', sucursalId: 'MHe8zggUNx0ByyURbG71', txtPDF: 'Parr. Caucel' },
    { mes: 11, fechas: '21', sucursalId: 'VRJSUXdXepBLyi6PjD1n', txtPDF: 'MB Xcanatún' }
];

const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export const PreventivosPage: React.FC = () => {
    const { user, isSuperAdmin } = useAuth();
    const isAdmin = user?.rol === 'Admin';
    const [activeTab, setActiveTab] = useState<'resumen' | 'calendario' | 'directorio'>('resumen');
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [franquicias, setFranquicias] = useState<Franquicia[]>([]);
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterSucursal, setFilterSucursal] = useState<string | 'todas'>('todas');
    const [filterFranquicia, setFilterFranquicia] = useState<string | 'todas'>('todas');
    const [rangeStart, setRangeStart] = useState(0);
    const [rangeEnd, setRangeEnd] = useState(11);
    const [showUnitsModal, setShowUnitsModal] = useState(false);
    const { showNotification } = useNotification();

    const [planEvents, setPlanEvents] = useState<PreventivoPlanEntry[]>([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<PreventivoPlanEntry | null>(null);
    const [showAuditModal, setShowAuditModal] = useState(false);
    const [auditEntries, setAuditEntries] = useState<BitacoraPreventivo[]>([]);

    // Import State
    const [showImportModal, setShowImportModal] = useState(false);
    const [importData, setImportData] = useState<any[]>([]);
    const [importErrors, setImportErrors] = useState<string[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    // State for Coordinator Assignment Panel
    const [draggedOT, setDraggedOT] = useState<{ otId: string, fromTecnicoId: string } | null>(null);
    const [isReassigning, setIsReassigning] = useState(false);
    // @ts-ignore
    console.log(isReassigning);
    // Drag & Drop de Eventos del Calendario al Panel de Técnicos
    const [draggedEvent, setDraggedEvent] = useState<PreventivoPlanEntry | null>(null);
    const [preSelectedTecnicoForGen, setPreSelectedTecnicoForGen] = useState<string | undefined>(undefined);
    const [filterTecnicoPanel, setFilterTecnicoPanel] = useState('todos');
    const [isMigrating, setIsMigrating] = useState(false);
    const [calendarView, setCalendarView] = useState<'lista' | 'semana' | 'mes' | 'año'>('lista');
    const [viewDate, setViewDate] = useState(new Date(2026, rangeStart, 1));
    const [selectedSemester, setSelectedSemester] = useState<0 | 1>(0); // 0: Ene-Jun, 1: Jul-Dic

    // --- Estados para Generación Masiva v2.0 ---
    const [showGenModal, setShowGenModal] = useState(false);
    const [showDashboardModal, setShowDashboardModal] = useState(false);
    const [genEvent, setGenEvent] = useState<PreventivoPlanEntry | null>(null);
    const [allTecnicos, setAllTecnicos] = useState<User[]>([]);

    // --- Estados para Configuración de Folios ---
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [configFolios, setConfigFolios] = useState({ otNumber: 1000, preventiveOtNumber: 1 });
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const eventsWithOts = useMemo(() => {
        return new Set(workOrders.filter(ot => ot.preventivoPlanId).map(ot => ot.preventivoPlanId));
    }, [workOrders]);

    // --- AUTO-SCROLL DURANTE DRAG & DROP ---
    const listScrollRef = useRef<HTMLDivElement>(null);
    const [dragMouseY, setDragMouseY] = useState<number | null>(null);

    useEffect(() => {
        if (!draggedEvent && !draggedOT) {
            setDragMouseY(null);
            return;
        }

        const scrollIncrement = 15;
        const threshold = 100; // Píxeles desde el borde de la ventana

        const interval = setInterval(() => {
            if (dragMouseY === null) return;

            // 1. Scroll de la Ventana (Viewport)
            if (dragMouseY < threshold) {
                window.scrollBy(0, -scrollIncrement);
            } else if (dragMouseY > window.innerHeight - threshold) {
                window.scrollBy(0, scrollIncrement);
            }

            // 2. Scroll de la Lista Interna (si el mouse está sobre ella)
            if (listScrollRef.current) {
                const rect = listScrollRef.current.getBoundingClientRect();
                if (dragMouseY > rect.top && dragMouseY < rect.bottom) {
                    const relativeY = dragMouseY - rect.top;
                    const listHeight = rect.height;
                    const listThreshold = 50;

                    if (relativeY < listThreshold) {
                        listScrollRef.current.scrollTop -= scrollIncrement;
                    } else if (relativeY > listHeight - listThreshold) {
                        listScrollRef.current.scrollTop += scrollIncrement;
                    }
                }
            }
        }, 50);

        return () => clearInterval(interval);
    }, [draggedEvent, draggedOT, dragMouseY]);

    useEffect(() => {
        // Sincronizar viewDate cuando cambia el rango si la vista no es Lista
        if (calendarView !== 'lista') {
            setViewDate(new Date(2026, rangeStart, 1));
        }
    }, [rangeStart]);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const [sucSnap, fSnap, eqSnap, uSnap, planSnap, config, otSnapRaw] = await Promise.all([
                getDocs(tenantQuery('sucursales', user)),
                getDocs(tenantQuery('franquicias', user)),
                getDocs(tenantQuery('equipos', user)),
                getDocs(tenantQuery('usuarios', user, where('rol', 'in', ['Tecnico', 'TecnicoExterno']))),
                getDocs(tenantQuery('planPreventivo2026', user)),
                getCounterConfig(user.clienteId),
                getDocs(tenantQuery('ordenesTrabajo', user))
            ]);

            const planData = planSnap.docs.map(d => ({ id: d.id, ...d.data() } as PreventivoPlanEntry));
            const otData = otSnapRaw.docs.map(d => ({ id: d.id, ...d.data() } as WorkOrder));

            setSucursales(sucSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sucursal)));
            setFranquicias(fSnap.docs.map(d => ({ id: d.id, ...d.data() } as Franquicia)));
            setEquipos(eqSnap.docs.map(d => ({ id: d.id, ...d.data() } as Equipo)));
            setAllTecnicos(uSnap.docs.map(d => ({ id: d.id, ...d.data() } as User)));
            setConfigFolios(config as { otNumber: number; preventiveOtNumber: number; });
            setWorkOrders(otData);

            if (planData.length === 0 && PLAN_2026.length > 0) {
                // Auto-migración si la DB está vacía
                setIsMigrating(true);
                const batchPromises = PLAN_2026.map(item => {
                    // Inject clienteId automatically to default seeded entries
                    return addDoc(collection(db, 'planPreventivo2026'), { ...item, clienteId: user.clienteId });
                });
                await Promise.all(batchPromises);
                const freshSnap = await getDocs(tenantQuery('planPreventivo2026', user));
                setPlanEvents(freshSnap.docs.map(d => ({ id: d.id, ...d.data() } as PreventivoPlanEntry)));
                setIsMigrating(false);
            } else {
                setPlanEvents(planData);
            }
        } catch (e) {
            console.error(e);
            showNotification("Error al cargar datos operativos.", "error");
        }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Estilos para el Range Slider Elegante (Premium)
    const sliderStyles = `
        .custom-range-slider {
            -webkit-appearance: none;
            width: 100%;
            height: 6px;
            background: transparent;
            outline: none;
            margin: 0;
            padding: 0;
        }
        .custom-range-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 18px;
            height: 18px;
            background: var(--primary);
            border: 3px solid rgba(255,255,255,0.9);
            border-radius: 50%;
            cursor: pointer;
            box-shadow: 0 0 10px var(--primary-shadow);
            transition: all 0.2s;
            position: relative;
            z-index: 2;
        }
        .custom-range-slider::-webkit-slider-thumb:hover {
            transform: scale(1.2);
            box-shadow: 0 0 15px var(--primary-shadow);
        }
    `;



    // Helper para identificar franquicia desde el catálogo real
    const getFranchiseData = (evento: { sucursalId: string; txtPDF: string }) => {
        const s = sucursales.find(suc => suc.id === evento.sucursalId);
        if (s?.franquiciaId) {
            const f = franquicias.find(fran => fran.id === s.franquiciaId);
            if (f) return f;
        }
        return null;
    };

    const getFranchiseInitials = (name: string) => {
        if (!name) return "";
        const words = name.split(' ');
        if (words.length === 1) return name.substring(0, 1).toUpperCase();
        return (words[0][0] + (words[1] ? words[1][0] : "")).toUpperCase();
    };

    const getEventColor = (evento: PreventivoPlanEntry) => {
        const f = getFranchiseData(evento);
        if (f?.colorFondo) return f.colorFondo;

        // Fallback hardcoded logic as backup
        const name = (evento.txtPDF || '').toLowerCase();
        if (name.includes('bostons') || name.includes('parroq') || name.includes('sushi')) return '#22c55e';
        if (name.includes('city') || name.includes('comisariato') || name.includes('panaderia') || name.includes('caucel') || name.includes('parr.')) return '#F59E0B';
        if (name.includes('dzytia') || name.includes('xcanatun') || name.includes('altabrisa') || name.includes('pens') || name.includes('plaza')) return '#fb7185';

        return '#64748b';
    };

    const calculateDuration = (fechas: string) => {
        if (!fechas) return 0;
        if (fechas.includes('-')) {
            const [start, end] = fechas.split('-').map(s => parseInt(s.trim()));
            if (isNaN(start) || isNaN(end)) return 1;
            return (end - start) + 1;
        }
        return 1;
    };

    const validateDateInput = (fechas: string, mesIndex: number) => {
        if (!fechas) return "El campo de fechas es obligatorio.";

        // Días por mes para 2026 (no bisiesto)
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        const maxDay = daysInMonth[mesIndex];

        const parts = fechas.split('-').map(s => s.trim());
        if (parts.length > 2) return "Formato inválido. Use 'Día' o 'DíaInicio - DíaFin'.";

        for (const p of parts) {
            const d = parseInt(p);
            if (isNaN(d) || p === "") return `"${p}" no es un número válido.`;
            if (d < 1 || d > maxDay) return `El día ${d} no es válido para ${MESES[mesIndex]} (max: ${maxDay}).`;
        }

        if (parts.length === 2) {
            const start = parseInt(parts[0]);
            const end = parseInt(parts[1]);
            if (start >= end) return "El día de inicio debe ser estrictamente menor al día de fin en un rango.";
        }

        return null;
    };

    const filteredEvents = useMemo(() => {
        return planEvents.filter(e => {
            const matchMes = e.mes >= rangeStart && e.mes <= rangeEnd;
            const suc = sucursales.find(s => s.id === e.sucursalId || (s.nombre && e.txtPDF && s.nombre.includes(e.txtPDF)));
            const matchSuc = filterSucursal === 'todas' || suc?.id === filterSucursal;
            const matchFranquicia = filterFranquicia === 'todas' || suc?.franquiciaId === filterFranquicia;

            return matchMes && matchSuc && matchFranquicia;
        });
    }, [rangeStart, rangeEnd, filterSucursal, filterFranquicia, sucursales, planEvents]);

    const sortedEvents = useMemo(() => {
        return [...filteredEvents].sort((a, b) => {
            if (a.mes !== b.mes) {
                return sortOrder === 'asc' ? a.mes - b.mes : b.mes - a.mes;
            }
            // Si el mes es el mismo, ordenar por el primer día del rango
            const dayA = parseInt(a.fechas.split('-')[0]) || 0;
            const dayB = parseInt(b.fechas.split('-')[0]) || 0;
            return sortOrder === 'asc' ? dayA - dayB : dayB - dayA;
        });
    }, [filteredEvents, sortOrder]);

    // Distribución por mes para el gráfico (Ignora el filtro de meses para ser un navegador anual)
    const eventsForMonthDist = useMemo(() => {
        return planEvents.filter(e => {
            const suc = sucursales.find(s => s.id === e.sucursalId || (s.nombre && e.txtPDF && s.nombre.includes(e.txtPDF)));
            const matchSuc = filterSucursal === 'todas' || suc?.id === filterSucursal;
            const matchFranquicia = filterFranquicia === 'todas' || suc?.franquiciaId === filterFranquicia;

            return matchSuc && matchFranquicia;
        });
    }, [filterSucursal, filterFranquicia, sucursales, planEvents]);

    // Estadísticas
    const stats = useMemo(() => {
        const total = filteredEvents.length;
        const uniqueSucsInPlan = new Set(filteredEvents.map(e => e.sucursalId)).size;

        const counts = filteredEvents.reduce((acc: { [key: string]: number }, e) => {
            const f = getFranchiseData(e);
            const fName = f?.nombre || "Independiente";
            acc[fName] = (acc[fName] || 0) + 1;
            return acc;
        }, {});

        // Generar lista de franquicias dinámica basada en el catálogo y colores consistentes
        const franchiseStats = franquicias.map(f => {
            const name = f.nombre || "";
            let icon = Info;
            const color = f.colorFondo || "#94a3b8";

            const upperName = name.toUpperCase();
            if (upperName.includes("BOSTON")) icon = Pizza;
            else if (upperName.includes("PARROQUIA")) icon = Coffee;
            else if (upperName.includes("CHICKEN") || upperName.includes("BPT")) icon = Drumstick;
            else if (upperName.includes("ROLL") || upperName.includes("SUSHI")) icon = Fish;
            else if (upperName.includes("INTERN") || upperName.includes("COMISARIATO")) icon = Info;

            return {
                id: f.id,
                name,
                color,
                icon,
                count: counts[name] || 0
            };
        }).filter(f => f.count > 0 || filterFranquicia === 'todas');

        // Verificación de integridad para el usuario (si hay eventos Independientes o no catalogados)
        const sumFranchises = franchiseStats.reduce((acc, curr) => acc + curr.count, 0);
        if (sumFranchises < total) {
            franchiseStats.push({
                id: 'independiente',
                name: "Independiente",
                color: "#94a3b8",
                icon: Info,
                count: total - sumFranchises
            });
        }

        return {
            total,
            sucs: uniqueSucsInPlan,
            franchises: franchiseStats
        };
    }, [sucursales, filteredEvents, franquicias, filterFranquicia]);

    // Datos para Gráfico de Barras (Meses) - Usando eventsForMonthDist para navegación anual
    const barData = {
        labels: MESES.map(m => m.substring(0, 3)),
        datasets: [{
            label: 'Intervenciones',
            data: MESES.map((_, i) => eventsForMonthDist.filter(e => e.mes === i).length),
            backgroundColor: '#d97706',
            borderRadius: 6,
        }]
    };

    // Datos para Gráfico de Dona (Franquicias)
    const doughnutData = useMemo(() => {
        return {
            labels: stats.franchises.map(f => f.name),
            datasets: [{
                data: stats.franchises.map(f => f.count),
                backgroundColor: stats.franchises.map(f => f.color),
            }]
        };
    }, [stats]);

    const handleReassignTecnico = async (otId: string, newTecnicoId: string, oldTecnicoId: string) => {
        if (newTecnicoId === oldTecnicoId) return;

        const ot = workOrders.find(o => o.id === otId);
        if (!ot) return;

        const equipo = equipos.find(e => e.id === ot.equipoId);
        const newTecnico = allTecnicos.find(t => t.id === newTecnicoId);

        const normalize = (s: string | undefined) => s?.trim().toLowerCase() || '';
        const tecSpec = normalize(newTecnico?.especialidad);
        const eqFam = normalize(equipo?.familia);

        // --- REGLA DE NEGOCIO: Especialidad de Técnico ---
        if (tecSpec && tecSpec !== eqFam) {
            showNotification(
                `❌ Regla de Negocio: ${newTecnico?.nombre} tiene especialidad en ${newTecnico?.especialidad}. NO puede atender este equipo de familia ${equipo?.familia}.`,
                "error"
            );
            return;
        }


        // Regla de Negocio: Solo se puede reasignar si la OT está en estado "Asignada" (antes de llegada)
        if (ot.estatus !== 'Asignada') {
            showNotification("No se puede reasignar una OT que ya inició o finalizó.", "error");
            return;
        }

        setIsReassigning(true);
        try {
            const tecName = allTecnicos.find(t => t.id === newTecnicoId)?.nombre || 'Desconocido';
            await updateWorkOrder(otId, { tecnicoId: newTecnicoId });

            // Log in bitacora
            await addBitacoraEntry({
                otId,
                usuarioId: user?.id || 'System',
                accion: `Reasignación de Técnico: de ${allTecnicos.find(t => t.id === oldTecnicoId)?.nombre} a ${tecName}`,
                fecha: new Date().toISOString(),
                detalles: `Reasignado por Coordinador: ${user?.nombre}`
            });

            showNotification(`OT ${ot.numero} reasignada a ${tecName}`, "success");
            fetchData();
        } catch (e) {
            showNotification("Error al reasignar técnico.", "error");
        } finally {
            setIsReassigning(false);
            setDraggedOT(null);
        }
    };

    const handleGenerarOT = async (evento: PreventivoPlanEntry, tecnicoId?: string) => {
        if (!user) return;
        setGenEvent(evento);
        if (tecnicoId) {
            setPreSelectedTecnicoForGen(tecnicoId);
        } else {
            setPreSelectedTecnicoForGen(undefined);
        }
        if (eventsWithOts.has(evento.id)) {
            setShowDashboardModal(true);
        } else {
            setShowGenModal(true);
        }
    };

    // Handler para cuando se suelta un evento del calendario en un cajón de técnico
    const handleDropEventOnTecnico = (tecnicoId: string) => {
        if (!draggedEvent) return;
        // Si ya tiene OTs, no permitir drag & drop (debe gestionar desde el dashboard)
        if (eventsWithOts.has(draggedEvent.id)) {
            showNotification("Este evento ya tiene OTs generadas. Usa 'Gestionar OTs' para modificar.", "warning");
            setDraggedEvent(null);
            return;
        }
        handleGenerarOT(draggedEvent, tecnicoId);
        setDraggedEvent(null);
    };

    const exportToCSV = () => {
        const rows = [
            ["Mes", "Dias", "Sucursal", "Franquicia", "Referencia PDF"]
        ];

        planEvents.forEach(e => {
            const suc = sucursales.find(s => s.id === e.sucursalId || (s.nombre && e.txtPDF && s.nombre.includes(e.txtPDF)));
            const fName = suc?.franquiciaId ? (franquicias.find(f => f.id === suc.franquiciaId)?.nombre || 'N/A') : 'N/A';
            rows.push([
                MESES[e.mes],
                `"${e.fechas}"`,
                `"${suc?.nombre || e.txtPDF}"`,
                `"${fName}"`,
                `"${e.txtPDF}"`
            ]);
        });

        const csvString = rows.map(r => r.join(",")).join("\n");
        downloadCSV(csvString, "ICEMAS_Preventivos_2026.csv");
    };

    const handleUpdateEvent = async (e: any) => {
        e.preventDefault();
        if (!editingEvent || !user) return;

        try {
            // Validación de fechas
            const dateError = validateDateInput(editingEvent.fechas, editingEvent.mes);
            if (dateError) {
                showNotification(dateError, "error");
                return;
            }

            // Asegurar tipos correctos para Firestore
            const finalData = {
                ...editingEvent,
                mes: Number(editingEvent.mes),
                clienteId: user.clienteId
            };

            if (editingEvent.id) {
                // Recuperar los datos originales antes de la edición para la comparación
                const originalData = planEvents.find(ev => ev.id === editingEvent.id);
                if (!originalData) {
                    showNotification("No se encontró el registro original.", "error");
                    return;
                }
                // Llamada al servicio con datos originales y nuevos
                await updatePreventivoPlan(editingEvent.id, originalData, finalData, user);
                showNotification("Programación actualizada correctamente.", "success");
            } else {
                // Creación de nuevo registro
                await addDoc(collection(db, 'planPreventivo2026'), finalData);
                showNotification("Nueva programación creada con éxito.", "success");
            }

            setShowEditModal(false);
            setEditingEvent(null);
            fetchData();
        } catch (error) {
            console.error("Error en update/create:", error);
            showNotification("Error al procesar la programación.", "error");
        }
    };

    const handleUndoLastChange = async () => {
        try {
            const history = await getBitacoraPreventivos();
            if (history.length === 0) {
                showNotification("No hay cambios para deshacer.", "info");
                return;
            }
            await undoPreventivoChange(history[0]);
            showNotification("Último cambio revertido con éxito.", "success");
            const newHistory = await getBitacoraPreventivos();
            setAuditEntries(newHistory);
            fetchData();
        } catch (error) {
            showNotification("Error al revertir el cambio.", "error");
        }
    };

    const openAuditModal = async () => {
        const history = await getBitacoraPreventivos();
        setAuditEntries(history);
        setShowAuditModal(true);
    };

    const downloadTemplate = () => {
        const headers = ["mes_0_a_11", "fechas", "franquiciaId", "sucursalId", "referencia_texto_pdf"];
        const example = ["2", "15-18", "ID_DE_FRANQUICIA", "ID_DE_SUCURSAL", "Nombre Corto PDF"];
        const csvContent = [headers, example].map(r => r.join(",")).join("\n");
        downloadCSV(csvContent, "Plantilla_Importacion_Preventivos.csv");
    };

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
            if (lines.length < 2) {
                setImportErrors(["El archivo está vacío o solo contiene encabezados."]);
                return;
            }
            const rows = lines.slice(1);
            const validData: any[] = [];
            const errors: string[] = [];
            const uniqueKeys = new Set<string>(); // Para detectar duplicados en el mismo archivo

            rows.forEach((row, index) => {
                const columns = row.split(",").map(c => cleanString(c.replace(/^"|"$/g, '')));
                if (columns.length < 5 || columns.some(c => c === "")) {
                    errors.push(`Fila ${index + 2}: Datos incompletos. Todos los campos (Mes, Fechas, Franquicia, Sucursal, Referencia) son obligatorios.`);
                    return;
                }

                const [mesStr, fechas, franId, sucId, txtPDF] = columns;
                const mes = parseInt(mesStr);
                const rowKey = `${mes}-${sucId}-${fechas}`;

                // 1. VALIDACIÓN COMÚN
                if (isNaN(mes) || mes < 0 || mes > 11) {
                    errors.push(`Fila ${index + 2}: Mes inválido (${mesStr}). Debe ser 0-11.`);
                }
                // (Ya no necesitamos ifs individuales para fechas, franId, etc, porque el some(c=="" arriba los cubre)

                // VALIDACIÓN DE DÍAS SEGÚN EL MES
                if (!isNaN(mes) && mes >= 0 && mes <= 11 && fechas) {
                    const dateError = validateDateInput(fechas, mes);
                    if (dateError) {
                        errors.push(`Fila ${index + 2}: Error en fechas: ${dateError}`);
                    }
                }

                // 2. DETECCIÓN DE DUPLICADOS (MISMA SUCURSAL, MISMO MES, MISMA FECHA)
                if (uniqueKeys.has(rowKey)) {
                    errors.push(`Fila ${index + 2}: Registro DUPLICADO detectado para esta sucursal en la misma fecha.`);
                } else {
                    uniqueKeys.add(rowKey);
                }

                // 3. VALIDACIÓN DE INTEGRIDAD REFERENCIAL (CATÁLOGOS)
                const franFound = franquicias.find(f => f.id === franId);
                const sucFound = sucursales.find(s => s.id === sucId);

                if (!franFound) {
                    errors.push(`Fila ${index + 2}: CONFLICTO - El ID de franquicia "${franId}" no existe en el catálogo.`);
                }

                if (!sucFound) {
                    errors.push(`Fila ${index + 2}: CONFLICTO - El ID de sucursal "${sucId}" no existe en el catálogo.`);
                } else if (franFound && sucFound.franquiciaId !== franId) {
                    errors.push(`Fila ${index + 2}: RELACIÓN INVÁLIDA - La sucursal "${sucFound.nombre}" no pertenece a la franquicia "${franFound.nombre}".`);
                }

                // Solo agregar si no hay errores previos en esta fila
                const hasErrors = errors.some(err => err.startsWith(`Fila ${index + 2}:`));
                if (!hasErrors) {
                    validData.push({
                        mes,
                        fechas,
                        franquiciaId: franId,
                        sucursalId: sucId,
                        txtPDF: txtPDF || sucFound?.nombre || "Sin Referencia"
                    });
                }
            });

            setImportData(validData);
            setImportErrors(errors);
        };
        reader.readAsText(file);
    };

    const executeImport = async () => {
        if (importData.length === 0) return;
        if (!window.confirm(`¿Estás seguro de importar ${importData.length} registros? Esto reemplazará el calendario actual.`)) return;

        setIsImporting(true);
        try {
            if (user) {
                await importPreventivoPlan(importData, user);
            }
            showNotification("Calendario importado y actualizado con éxito.", "success");
            setShowImportModal(false);
            setImportData([]);
            setImportErrors([]);
            fetchData();
        } catch (error) {
            console.error(error);
            showNotification("Error al procesar la importación masiva.", "error");
        } finally {
            setIsImporting(false);
        }
    };



    if (loading || isMigrating) {
        return (
            <div style={{ height: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                <Loader2 className="animate-spin" size={48} color="var(--primary)" />
                <p style={{ fontWeight: '700', fontSize: '1.2rem' }}>{isMigrating ? "Migrando Plan a la Nube..." : "Cargando Panel Operativo..."}</p>
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: '2rem' }}>
            {/* Header / Tabs */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem'
            }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-main)' }}>Mantenimientos Preventivos</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Dashboard Operativo Proyectado 2026 • Grupo BPT</p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {isSuperAdmin && (
                        <button
                            onClick={() => setShowConfigModal(true)}
                            className="btn"
                            style={{
                                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
                                color: 'var(--text-muted)', width: '40px', height: '40px', padding: '0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            title="Configuración de Folios"
                        >
                            <Settings size={18} />
                        </button>
                    )}
                    {isAdmin && (
                        <button
                            onClick={() => {
                                setEditingEvent({ id: '', mes: 2, fechas: '15', sucursalId: '', txtPDF: '', clienteId: user?.clienteId || '' } as any);
                                setShowEditModal(true);
                            }}
                            className="btn"
                            style={{ border: '1px solid var(--primary)', color: 'var(--primary)', background: 'rgba(var(--primary-rgb), 0.05)', padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
                        >
                            <Plus size={16} />
                            Añadir Programación
                        </button>
                    )}
                    {isAdmin && (
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="btn"
                            style={{ border: '1px solid #4ade80', color: '#4ade80', background: 'rgba(74, 222, 128, 0.05)', padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
                        >
                            <Upload size={16} />
                            Importar Plan
                        </button>
                    )}
                    <button
                        onClick={exportToCSV}
                        className="btn btn-primary"
                        style={{ background: '#059669', border: 'none', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)', padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
                    >
                        <Download size={16} />
                        Exportar
                    </button>
                    <button
                        onClick={() => {
                            setRangeStart(0);
                            setRangeEnd(11);
                            setFilterSucursal('todas');
                            setFilterFranquicia('todas');
                        }}
                        className="btn"
                        style={{ border: '1px solid var(--glass-border)', color: 'var(--text-muted)', padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
                    >
                        Limpiar Filtros
                    </button>
                </div>
            </div>

            {/* Common Filters Area */}
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden', marginBottom: '2rem' }}>
                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '2rem', alignItems: 'flex-start' }}>
                        <div style={{ minWidth: '320px' }}>
                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Rango de Meses</span>
                                <span style={{ color: 'var(--primary)', fontWeight: '900' }}>{MESES[rangeStart].toUpperCase()} - {MESES[rangeEnd].toUpperCase()}</span>
                            </label>

                            <div style={{ position: 'relative', height: '40px', padding: '0 10px', marginTop: '0.5rem' }}>
                                {/* Slider Track */}
                                <div style={{
                                    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                                    left: '10px', right: '10px', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px'
                                }} />

                                {/* Colored Range */}
                                <div style={{
                                    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                                    left: `${(rangeStart / 11) * 100}%`,
                                    right: `${100 - (rangeEnd / 11) * 100}%`,
                                    height: '6px', background: 'var(--primary)', borderRadius: '10px',
                                    boxShadow: '0 0 10px var(--primary-glow)'
                                }} />

                                {/* Dual Input Range */}
                                <input
                                    type="range" min="0" max="11" value={rangeStart}
                                    onChange={e => setRangeStart(Math.min(parseInt(e.target.value), rangeEnd))}
                                    style={{
                                        position: 'absolute', width: '100%', left: 0, top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', pointerEvents: 'auto', WebkitAppearance: 'none', cursor: 'pointer'
                                    }}
                                    className="custom-range-slider"
                                />
                                <input
                                    type="range" min="0" max="11" value={rangeEnd}
                                    onChange={e => setRangeEnd(Math.max(parseInt(e.target.value), rangeStart))}
                                    style={{
                                        position: 'absolute', width: '100%', left: 0, top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', pointerEvents: 'auto', WebkitAppearance: 'none', cursor: 'pointer'
                                    }}
                                    className="custom-range-slider"
                                />
                            </div>
                            {/* Premium Slider Styles */}
                            <style>{sliderStyles}</style>

                            {/* Header info */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '-0.5rem' }}>
                                <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontWeight: '700' }}>ENE</span>
                                <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', fontWeight: '700' }}>DIC</span>
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'block' }}>Filtrar por Franquicia</label>
                            <select
                                value={filterFranquicia}
                                onChange={e => { setFilterFranquicia(e.target.value); setFilterSucursal('todas'); }}
                                style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', fontWeight: '600' }}
                            >
                                <option value="todas">Todas las franquicias</option>
                                {franquicias.map(f => <option key={f.id} value={f.id} style={{ color: 'black' }}>{f.nombre}</option>)}
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'block' }}>Filtrar por Sucursal</label>
                            <select
                                value={filterSucursal}
                                onChange={e => setFilterSucursal(e.target.value)}
                                style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', fontWeight: '600' }}
                            >
                                <option value="todas">Todas las sucursales</option>
                                {(filterFranquicia === 'todas'
                                    ? sucursales
                                    : sucursales.filter(s => s.franquiciaId === filterFranquicia)
                                ).map(s => <option key={s.id} value={s.id} style={{ color: 'black' }}>{s.nombre}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="glass-card" style={{ display: 'flex', padding: '0.25rem', gap: '0.25rem', borderRadius: '12px', background: 'rgba(0,0,0,0.2)' }}>
                            {[
                                { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
                                { id: 'calendario', label: 'Calendario', icon: Calendar },
                                { id: 'directorio', label: 'Directorio', icon: MapPin }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        padding: '0.65rem 1.5rem', borderRadius: '10px',
                                        background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                                        color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
                                        border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                        fontWeight: '700', fontSize: '0.9rem'
                                    }}
                                >
                                    <tab.icon size={18} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                        {isSuperAdmin && (
                            <button
                                onClick={() => setShowConfigModal(true)}
                                className="btn"
                                style={{ border: '1px solid var(--glass-border)', color: 'var(--text-muted)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem' }}
                                title="Configuración de Folios"
                            >
                                <Settings size={18} />
                            </button>
                        )}

                        <button
                            onClick={openAuditModal}
                            className="btn"
                            style={{ border: '1px solid var(--glass-border)', color: 'var(--text-muted)', marginLeft: isAdmin ? '0.5rem' : 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            <History size={16} />
                            Bitácora y Deshacer
                        </button>

                        <div style={{
                            background: 'var(--primary)', color: 'white', padding: '0.4rem 0.8rem',
                            borderRadius: '20px', fontSize: '0.75rem', fontWeight: '800',
                            boxShadow: '0 0 10px var(--primary-shadow)'
                        }}>
                            Mostrando {filteredEvents.length} eventos
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Areas */}
            <div className="animate-fade">
                {activeTab === 'resumen' && (
                    <>
                        {/* Stats Grid */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                            gap: '0.75rem',
                            marginBottom: '2rem'
                        }}>
                            <div
                                className="glass-card clickable"
                                onClick={() => setShowUnitsModal(true)}
                                style={{
                                    textAlign: 'center', padding: '1rem', border: '1px solid var(--glass-border)',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s, background 0.2s'
                                }}
                            >
                                <MapPin size={18} style={{ color: 'var(--accent)' }} />
                                <h4 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-main)', lineHeight: '1' }}>{stats.sucs}</h4>
                                <p style={{ fontSize: '0.55rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sucursales</p>
                            </div>
                            {stats.franchises.map((f, i) => (
                                <div
                                    key={i}
                                    className="glass-card"
                                    onClick={() => {
                                        setFilterFranquicia(f.id === 'independiente' ? 'todas' : f.id);
                                        setFilterSucursal('todas');
                                        setRangeStart(0);
                                        setRangeEnd(11);
                                        setActiveTab('calendario');
                                        setCalendarView('lista');
                                        showNotification(`Mostrando plan preventivo para ${f.name}`, "info");
                                    }}
                                    style={{
                                        textAlign: 'center',
                                        padding: '1rem',
                                        border: `1px solid ${f.color}33`,
                                        background: `${f.color}11`,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.25rem',
                                        minHeight: '100px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-5px)';
                                        e.currentTarget.style.boxShadow = `0 10px 20px ${f.color}22`;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <f.icon size={18} style={{ color: f.color }} />
                                    <h4 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-main)', lineHeight: '1' }}>{f.count}</h4>
                                    <p style={{
                                        fontSize: '0.55rem',
                                        fontWeight: '800',
                                        color: f.color,
                                        textTransform: 'uppercase',
                                        lineHeight: '1.1'
                                    }}>{f.name}</p>
                                </div>
                            ))}
                            <div className="glass-card" style={{
                                textAlign: 'center', padding: '1rem', border: '1px solid var(--glass-border)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem'
                            }}>
                                <Calendar size={18} style={{ color: 'var(--primary)' }} />
                                <h4 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-main)', lineHeight: '1' }}>{stats.total}</h4>
                                <p style={{ fontSize: '0.55rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Eventos</p>
                            </div>
                        </div>

                        {/* Charts Area */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                            <div className="glass-card" style={{ padding: '1.5rem', height: '350px' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '1.5rem', textAlign: 'center', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Intervenciones por Mes</h3>
                                <div style={{ height: '240px' }}>
                                    <Bar
                                        data={barData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: { display: false },
                                                tooltip: {
                                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                                    titleFont: { size: 14, weight: 'bold' },
                                                    bodyFont: { size: 12 },
                                                    padding: 12,
                                                    displayColors: false
                                                }
                                            },
                                            scales: {
                                                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, border: { display: false } },
                                                x: { grid: { display: false }, border: { display: false } }
                                            },
                                            onClick: (_event, elements) => {
                                                if (elements.length > 0) {
                                                    const monthIdx = elements[0].index;
                                                    setRangeStart(monthIdx);
                                                    setRangeEnd(monthIdx);
                                                    setActiveTab('calendario');
                                                    setCalendarView('lista');
                                                    showNotification(`Filtrando preventivos para ${MESES[monthIdx]}`, "info");
                                                }
                                            }
                                        }}
                                    />
                                </div>
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem', fontStyle: 'italic' }}>Tip: Haz clic en una barra para ver el detalle de ese mes</p>
                            </div>
                            <div className="glass-card" style={{ padding: '1.5rem', height: '350px' }}>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '1.5rem', textAlign: 'center', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>Carga por Franquicia</h3>
                                <div style={{ height: '260px' }}>
                                    <Doughnut
                                        data={doughnutData}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            cutout: '65%',
                                            plugins: {
                                                legend: {
                                                    position: 'bottom',
                                                    labels: {
                                                        boxWidth: 8,
                                                        usePointStyle: true,
                                                        pointStyle: 'circle',
                                                        font: { size: 10, weight: 'bold' },
                                                        color: 'var(--text-muted)',
                                                        padding: 15
                                                    }
                                                },
                                                tooltip: {
                                                    backgroundColor: 'rgba(0,0,0,0.8)',
                                                    titleFont: { size: 14, weight: 'bold' },
                                                    bodyFont: { size: 12 },
                                                    padding: 12,
                                                    displayColors: true
                                                }
                                            },
                                            onClick: (_event, elements) => {
                                                if (elements.length > 0) {
                                                    const idx = elements[0].index;
                                                    const fStat = stats.franchises[idx];
                                                    if (fStat) {
                                                        setFilterFranquicia(fStat.id === 'independiente' ? 'todas' : fStat.id);
                                                        setFilterSucursal('todas');
                                                        setActiveTab('calendario');
                                                        setCalendarView('lista');
                                                        showNotification(`Filtrando preventivos para ${fStat.name}`, "info");
                                                    }
                                                }
                                            }
                                        }}
                                    />
                                </div>
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem', fontStyle: 'italic' }}>Tip: Haz clic en una sección para filtrar por franquicia</p>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'calendario' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Selector de Vista (Premium) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div className="glass-card" style={{ display: 'flex', padding: '0.25rem', gap: '0.25rem', borderRadius: '10px' }}>
                                    {[
                                        { id: 'lista', label: 'Lista', icon: LayoutDashboard },
                                        { id: 'semana', label: 'Semana', icon: Calendar },
                                        { id: 'mes', label: 'Mes', icon: Calendar },
                                        { id: 'año', label: 'Año', icon: Calendar }
                                    ].map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => setCalendarView(v.id as any)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                padding: '0.4rem 0.8rem', borderRadius: '8px',
                                                background: calendarView === v.id ? 'var(--primary)' : 'transparent',
                                                color: calendarView === v.id ? 'white' : 'var(--text-muted)',
                                                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                                fontWeight: '700', fontSize: '0.75rem'
                                            }}
                                        >
                                            {calendarView === v.id && <v.icon size={12} />}
                                            {v.label}
                                        </button>
                                    ))}

                                    {calendarView === 'lista' && (
                                        <>
                                            <div style={{ width: '1px', background: 'var(--glass-border)', margin: '0.4rem 0.5rem' }} />
                                            <button
                                                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                    padding: '0.4rem 0.8rem', borderRadius: '8px',
                                                    background: 'rgba(255,255,255,0.1)',
                                                    color: 'var(--primary)',
                                                    border: '1px solid var(--primary)',
                                                    cursor: 'pointer', transition: 'all 0.2s',
                                                    fontWeight: '900', fontSize: '0.75rem'
                                                }}
                                            >
                                                <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                                                {sortOrder === 'asc' ? 'ANTIGUO' : 'RECIENTE'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {(calendarView === 'mes' || calendarView === 'semana') && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-main)' }}>
                                    <button
                                        onClick={() => {
                                            const newDate = new Date(viewDate);
                                            if (calendarView === 'semana') newDate.setDate(newDate.getDate() - 7);
                                            else newDate.setMonth(newDate.getMonth() - 1);
                                            setViewDate(newDate);
                                        }}
                                        className="btn-icon"
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '0.25rem 0.75rem', borderRadius: '8px' }}
                                    >←</button>
                                    <span style={{ fontWeight: '800', fontSize: '0.9rem', minWidth: '120px', textAlign: 'center' }}>
                                        {calendarView === 'semana' ? `Semana ${Math.ceil(viewDate.getDate() / 7)} de ${MESES[viewDate.getMonth()]}` : `${MESES[viewDate.getMonth()]} 2026`}
                                    </span>
                                    <button
                                        onClick={() => {
                                            const newDate = new Date(viewDate);
                                            if (calendarView === 'semana') newDate.setDate(newDate.getDate() + 7);
                                            else newDate.setMonth(newDate.getMonth() + 1);
                                            setViewDate(newDate);
                                        }}
                                        className="btn-icon"
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '0.25rem 0.75rem', borderRadius: '8px' }}
                                    >→</button>
                                </div>
                            )}

                            {calendarView === 'año' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem', background: 'var(--bg-card)', borderRadius: '10px', border: '1px solid var(--glass-border)' }}>
                                    {[
                                        { id: 0, label: '1er Semestre' },
                                        { id: 1, label: '2do Semestre' }
                                    ].map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => setSelectedSemester(s.id as any)}
                                            style={{
                                                padding: '0.4rem 0.8rem', borderRadius: '8px',
                                                background: selectedSemester === s.id ? 'var(--primary)' : 'transparent',
                                                color: selectedSemester === s.id ? 'white' : 'var(--text-muted)',
                                                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                                fontWeight: '800', fontSize: '0.75rem'
                                            }}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                            {calendarView === 'lista' && (
                                <div
                                    ref={listScrollRef}
                                    style={{ maxHeight: '600px', overflowY: 'auto' }}
                                    className="custom-scrollbar"
                                    onDragOver={(e) => {
                                        if (draggedEvent || draggedOT) {
                                            setDragMouseY(e.clientY);
                                        }
                                    }}
                                >
                                    {sortedEvents.length > 0 ? (
                                        sortedEvents.map((e, idx) => {
                                            const suc = sucursales.find(s => s.id === e.sucursalId || (s.nombre && e.txtPDF && s.nombre.includes(e.txtPDF)));
                                            const canDrag = !eventsWithOts.has(e.id);
                                            return (
                                                <div key={idx}
                                                    draggable={canDrag}
                                                    onDragStart={() => canDrag && setDraggedEvent(e)}
                                                    onDragEnd={() => setDraggedEvent(null)}
                                                    style={{
                                                        padding: '1.5rem', borderBottom: '1px solid var(--glass-border)',
                                                        display: 'flex', alignItems: 'center', gap: '1.5rem', transition: 'all 0.2s',
                                                        cursor: canDrag ? 'grab' : 'default',
                                                        opacity: draggedEvent?.id === e.id ? 0.4 : 1,
                                                    }} className="hover:bg-amber-50/5">
                                                    <button
                                                        onClick={() => { setEditingEvent(e); setShowEditModal(true); }}
                                                        style={{
                                                            width: '120px', borderLeft: `4px solid ${getEventColor(e)}`, paddingLeft: '1rem',
                                                            background: 'transparent', borderTop: 'none', borderRight: 'none', borderBottom: 'none',
                                                            textAlign: 'left', cursor: 'pointer'
                                                        }}
                                                        className="hover:bg-amber-500/10 group"
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                            <p style={{ fontSize: '0.65rem', fontWeight: '900', color: getEventColor(e), textTransform: 'uppercase' }}>{MESES[e.mes]}</p>
                                                            <Edit3 size={11} color={getEventColor(e)} style={{ opacity: 0.6 }} />
                                                        </div>
                                                        <p style={{ fontSize: '1.1rem', fontWeight: '900' }}>Día {e.fechas}</p>
                                                    </button>

                                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div style={{
                                                            width: '40px', height: '40px', borderRadius: '12px',
                                                            background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            border: '1px solid var(--glass-border)', overflow: 'hidden'
                                                        }}>
                                                            {(() => {
                                                                const fId = sucursales.find(s => s.id === e.sucursalId)?.franquiciaId;
                                                                const fLogo = franquicias.find(f => f.id === fId)?.logoUrl;
                                                                const fBG = franquicias.find(f => f.id === fId)?.colorFondo;

                                                                if (fLogo) return <div style={{ background: fBG || 'white', width: '100%', height: '100%', display: 'flex', padding: '4px' }}><img src={fLogo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>;
                                                                return suc?.franquiciaId ? '🏢' : '❓';
                                                            })()}
                                                        </div>
                                                        <div>
                                                            <h4 style={{ fontWeight: '800' }}>
                                                                {getFranchiseData(e) ? `[${getFranchiseInitials(getFranchiseData(e)!.nombre)}] ` : ""}
                                                                {suc?.nombre || e.txtPDF} <span style={{ opacity: 0.7, fontSize: '0.85rem' }}>({equipos.filter(eq => eq.sucursalId === e.sucursalId).length} Eq)</span>
                                                            </h4>
                                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Ref: {e.txtPDF}</p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => handleGenerarOT(e)}
                                                        style={{
                                                            padding: '0.6rem 1rem', borderRadius: '8px',
                                                            background: eventsWithOts.has(e.id) ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.05)',
                                                            border: '1px solid',
                                                            borderColor: eventsWithOts.has(e.id) ? 'var(--primary)' : 'var(--glass-border)',
                                                            color: eventsWithOts.has(e.id) ? 'var(--primary)' : 'var(--text-main)',
                                                            cursor: 'pointer', fontSize: '0.75rem',
                                                            display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800'
                                                        }}
                                                        className="hover:bg-primary hover:text-white"
                                                    >
                                                        {eventsWithOts.has(e.id) ? (
                                                            <>
                                                                <Clock size={14} />
                                                                Gestionar OTs
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ArrowRight size={14} />
                                                                Generar OT
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            <Info size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                                            <p>No se encontraron mantenimientos previstos para la selección.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {calendarView === 'mes' && (
                                <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--glass-border)', border: '1px solid var(--glass-border)', borderRadius: '12px', overflow: 'hidden' }}>
                                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => (
                                            <div key={d} style={{ padding: '1rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', fontWeight: '900', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{d}</div>
                                        ))}
                                        {(() => {
                                            const firstDay = new Date(2026, viewDate.getMonth(), 1).getDay();
                                            const daysInMonth = new Date(2026, viewDate.getMonth() + 1, 0).getDate();

                                            // Create flat array of days
                                            const allDays: { day: number | null, date: Date | null }[] = [];
                                            for (let i = 0; i < firstDay; i++) allDays.push({ day: null, date: null });
                                            for (let d = 1; d <= daysInMonth; d++) allDays.push({ day: d, date: new Date(2026, viewDate.getMonth(), d) });
                                            while (allDays.length % 7 !== 0) allDays.push({ day: null, date: null });

                                            // Break into weeks
                                            const weeks = [];
                                            for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7));

                                            return weeks.map((week, wIdx) => (
                                                <React.Fragment key={wIdx}>
                                                    {/* Background Layer (Day Numbers) */}
                                                    {week.map((cell, cIdx) => (
                                                        <div key={cIdx} style={{
                                                            height: '120px', background: cell.day ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.1)',
                                                            padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.03)',
                                                            position: 'relative', overflow: 'visible'
                                                        }}>
                                                            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: 'var(--text-muted)' }}>{cell.day}</span>
                                                        </div>
                                                    ))}
                                                    {/* Event Overlay Layer (Using Grid for spanning) */}
                                                    <div style={{
                                                        gridColumn: '1 / span 7', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
                                                        marginTop: '-95px', padding: '0 4px', pointerEvents: 'none', marginBottom: '10px'
                                                    }}>
                                                        {(() => {
                                                            const weekStart = week.find(c => c.day)?.day || 1;
                                                            const weekEnd = [...week].reverse().find(c => c.day)?.day || 31;
                                                            // Note: [...week] avoids mutating original in-place reverse if needed

                                                            return filteredEvents
                                                                .filter(e => {
                                                                    if (e.mes !== viewDate.getMonth()) return false;
                                                                    const [start, end] = e.fechas.includes('-')
                                                                        ? e.fechas.split('-').map(s => parseInt(s.trim()))
                                                                        : [parseInt(e.fechas), parseInt(e.fechas)];
                                                                    // Overlaps with this week?
                                                                    return start <= weekEnd && end >= weekStart;
                                                                })
                                                                .map((ev, evIdx) => {
                                                                    const [start, end] = ev.fechas.includes('-')
                                                                        ? ev.fechas.split('-').map(s => parseInt(s.trim()))
                                                                        : [parseInt(ev.fechas), parseInt(ev.fechas)];

                                                                    // Calculate relative positions in this week's 1-7 columns
                                                                    const startCol = Math.max(1, week.findIndex(c => c.day === (start < weekStart ? weekStart : start)) + 1);
                                                                    const endCol = Math.min(7, week.findIndex(c => c.day === (end > weekEnd ? weekEnd : end)) + 1);
                                                                    const span = (endCol - startCol) + 1;

                                                                    const suc = sucursales.find(s => s.id === ev.sucursalId || (s.nombre && ev.txtPDF && s.nombre.includes(ev.txtPDF)));
                                                                    const fColor = getEventColor(ev);
                                                                    const fData = getFranchiseData(ev);
                                                                    const initials = fData ? `[${getFranchiseInitials(fData.nombre)}] ` : "";

                                                                    return (
                                                                        <button
                                                                            key={ev.id || evIdx}
                                                                            onClick={() => { setEditingEvent(ev); setShowEditModal(true); }}
                                                                            style={{
                                                                                gridColumn: `${startCol} / span ${span}`,
                                                                                background: fColor, color: 'white', border: 'none',
                                                                                borderRadius: '6px', padding: '6px 12px', fontSize: '0.65rem',
                                                                                fontWeight: '900', textAlign: 'left', cursor: 'pointer',
                                                                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)', marginBottom: '4px',
                                                                                pointerEvents: 'auto', zIndex: 10, position: 'relative',
                                                                                whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
                                                                                transform: 'translateY(0)', transition: 'transform 0.2s',
                                                                                display: 'flex', flexDirection: 'column'
                                                                            }}
                                                                            className="hover:scale-[1.02] hover:brightness-110"
                                                                        >
                                                                            <span>{initials}{suc?.nombre || ev.txtPDF} ({equipos.filter(eq => eq.sucursalId === ev.sucursalId).length} Eq)</span>
                                                                            {ev.fechas.includes('-') && span > 1 && (
                                                                                <span style={{ fontSize: '0.5rem', opacity: 0.8, fontWeight: '700' }}>RANGO: {ev.fechas}</span>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                });
                                                        })()}
                                                    </div>
                                                </React.Fragment>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}

                            {calendarView === 'semana' && (
                                <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.1)' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'var(--glass-border)', border: '1px solid var(--glass-border)', borderRadius: '12px', overflow: 'hidden' }}>
                                        {/* Header */}
                                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((dayName, i) => {
                                            const startOfWeek = new Date(viewDate);
                                            startOfWeek.setDate(viewDate.getDate() - viewDate.getDay());
                                            const day = new Date(startOfWeek);
                                            day.setDate(startOfWeek.getDate() + i);
                                            return (
                                                <div key={i} style={{ padding: '1rem', textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>{dayName}</p>
                                                    <h4 style={{ fontSize: '1.25rem', fontWeight: '900' }}>{day.getDate()}</h4>
                                                </div>
                                            );
                                        })}

                                        {/* Columns BG */}
                                        {Array.from({ length: 7 }).map((_, i) => (
                                            <div key={i} style={{ height: '400px', background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.02)' }} />
                                        ))}

                                        {/* Spanning Events Overlay */}
                                        <div style={{ gridColumn: '1 / span 7', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginTop: '-400px', padding: '10px', pointerEvents: 'none', gap: '4px' }}>
                                            {(() => {
                                                const startOfWeek = new Date(viewDate);
                                                startOfWeek.setDate(viewDate.getDate() - viewDate.getDay());
                                                const weekDays = Array.from({ length: 7 }).map((_, i) => {
                                                    const d = new Date(startOfWeek);
                                                    d.setDate(startOfWeek.getDate() + i);
                                                    return d;
                                                });

                                                const wStart = weekDays[0].getDate();
                                                const wEnd = weekDays[6].getDate();
                                                const wMonth = weekDays[0].getMonth();

                                                return filteredEvents
                                                    .filter(e => {
                                                        if (e.mes !== wMonth) return false;
                                                        const [start, end] = e.fechas.includes('-')
                                                            ? e.fechas.split('-').map(s => parseInt(s.trim()))
                                                            : [parseInt(e.fechas), parseInt(e.fechas)];
                                                        return start <= wEnd && end >= wStart;
                                                    })
                                                    .map((ev, idx) => {
                                                        const [start, end] = ev.fechas.includes('-')
                                                            ? ev.fechas.split('-').map(s => parseInt(s.trim()))
                                                            : [parseInt(ev.fechas), parseInt(ev.fechas)];

                                                        const startCol = Math.max(1, weekDays.findIndex(d => d.getDate() === Math.max(wStart, start)) + 1);
                                                        const endCol = Math.min(7, weekDays.findIndex(d => d.getDate() === Math.min(wEnd, end)) + 1);
                                                        const span = (endCol - startCol) + 1;

                                                        const fColor = getEventColor(ev);
                                                        const fData = getFranchiseData(ev);
                                                        const initials = fData ? `[${getFranchiseInitials(fData.nombre)}] ` : "";
                                                        const suc = sucursales.find(s => s.id === ev.sucursalId || (s.nombre && ev.txtPDF && s.nombre.includes(ev.txtPDF)));

                                                        return (
                                                            <button
                                                                key={idx}
                                                                onClick={() => { setEditingEvent(ev); setShowEditModal(true); }}
                                                                style={{
                                                                    gridColumn: `${startCol} / span ${span}`,
                                                                    background: fColor, color: 'white', border: 'none',
                                                                    borderRadius: '8px', padding: '8px 12px', fontSize: '0.75rem',
                                                                    fontWeight: '900', textAlign: 'left', cursor: 'pointer',
                                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)', marginBottom: '4px',
                                                                    pointerEvents: 'auto', zIndex: 10, position: 'relative',
                                                                    whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden',
                                                                    display: 'flex', flexDirection: 'column'
                                                                }}
                                                                className="hover:scale-[1.02] hover:brightness-110"
                                                            >
                                                                <span>{initials}{suc?.nombre || ev.txtPDF} ({equipos.filter(eq => eq.sucursalId === ev.sucursalId).length} Eq)</span>
                                                                {span > 1 && <span style={{ fontSize: '0.55rem', opacity: 0.8 }}>{ev.fechas}</span>}
                                                            </button>
                                                        );
                                                    });
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {calendarView === 'año' && (
                                <div style={{ padding: '1.5rem', background: 'var(--bg-card)', minHeight: '850px', borderRadius: '16px' }}>
                                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '14px', border: '1px solid var(--glass-border)', overflowX: 'auto', backdropFilter: 'blur(10px)' }}>
                                        {MESES.slice(selectedSemester * 6, (selectedSemester + 1) * 6).map((mes, relativeIdx) => {
                                            const mIdx = (selectedSemester * 6) + relativeIdx;
                                            const daysInMonth = new Date(2026, mIdx + 1, 0).getDate();
                                            const renderedInMonth = new Set();

                                            return (
                                                <div key={mIdx} style={{ flex: 1, minWidth: '160px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.02)' }}>
                                                    <div style={{ padding: '0.85rem', textAlign: 'center', background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)', borderBottom: '2px solid var(--primary)', fontWeight: '900', fontSize: '0.85rem', color: 'var(--primary)', letterSpacing: '1.5px', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                                        {mes.toUpperCase()}
                                                    </div>
                                                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
                                                        {Array.from({ length: 31 }).map((_, dIdx) => {
                                                            const d = dIdx + 1;
                                                            const isValid = d <= daysInMonth;
                                                            const date = isValid ? new Date(2026, mIdx, d) : null;
                                                            const dayInitial = date ? ['D', 'L', 'M', 'M', 'J', 'V', 'S'][date.getDay()] : '';
                                                            const isWeekend = date ? (date.getDay() === 0 || date.getDay() === 6) : false;

                                                            const eventForDay = filteredEvents.find(e => {
                                                                if (e.mes !== mIdx) return false;
                                                                if (e.fechas.includes('-')) {
                                                                    const [start, end] = e.fechas.split('-').map(s => parseInt(s.trim()));
                                                                    return d >= start && d <= end;
                                                                }
                                                                return parseInt(e.fechas) === d;
                                                            });

                                                            // Spanning Logic: Identify if this is the start of an event
                                                            let isStart = false;
                                                            let spanDuration = 1;
                                                            if (eventForDay && !renderedInMonth.has(eventForDay.id)) {
                                                                const [start, end] = eventForDay.fechas.includes('-')
                                                                    ? eventForDay.fechas.split('-').map(s => parseInt(s.trim()))
                                                                    : [parseInt(eventForDay.fechas), parseInt(eventForDay.fechas)];

                                                                if (d === start) {
                                                                    isStart = true;
                                                                    spanDuration = (end - start) + 1;
                                                                    renderedInMonth.add(eventForDay.id);
                                                                }
                                                            }

                                                            const suc = eventForDay ? sucursales.find(s => s.id === eventForDay.sucursalId || (s.nombre && eventForDay.txtPDF && s.nombre.includes(eventForDay.txtPDF))) : null;
                                                            const fColor = eventForDay ? getEventColor(eventForDay) : 'var(--primary)';
                                                            const fData = eventForDay ? getFranchiseData(eventForDay) : null;
                                                            const initials = fData ? `[${getFranchiseInitials(fData.nombre)}] ` : "";

                                                            return (
                                                                <div key={dIdx} style={{
                                                                    display: 'flex', height: '28px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                                                                    background: !isValid ? 'rgba(0,0,0,0.1)' : isWeekend ? 'rgba(255,255,255,0.02)' : 'transparent',
                                                                    fontSize: '0.65rem', position: 'relative'
                                                                }}>
                                                                    <div style={{ width: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.03)', fontWeight: '800', color: isValid ? 'var(--text-muted)' : 'transparent' }}>{d}</div>
                                                                    <div style={{ width: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.03)', color: isValid ? (isWeekend ? 'var(--primary)' : 'rgba(255,255,255,0.3)') : 'transparent', fontWeight: '700' }}>{dayInitial}</div>
                                                                    <div style={{ flex: 1, position: 'relative', overflow: 'visible' }}>
                                                                        {isStart && (
                                                                            <button
                                                                                onClick={() => { setEditingEvent(eventForDay!); setShowEditModal(true); }}
                                                                                style={{
                                                                                    position: 'absolute',
                                                                                    top: '2px', left: '2px', right: '2px',
                                                                                    height: `calc(${28 * spanDuration}px - 4px)`,
                                                                                    background: fColor, color: 'white',
                                                                                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer',
                                                                                    fontWeight: '900', fontSize: '0.6rem', padding: '4px 8px',
                                                                                    textAlign: 'left', zIndex: 10,
                                                                                    display: 'flex', alignItems: 'flex-start',
                                                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)', transition: 'all 0.2s',
                                                                                    overflow: 'hidden', textOverflow: 'ellipsis'
                                                                                }}
                                                                                className="hover:scale-[1.01] hover:brightness-110"
                                                                            >
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                                                                    <span>{initials}{suc?.nombre || eventForDay?.txtPDF}</span>
                                                                                    {spanDuration > 1 && <span style={{ opacity: 0.8, fontSize: '0.5rem' }}>DURACIÓN: {spanDuration} DÍAS</span>}
                                                                                </div>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
                                            {stats.franchises.map((f, i) => (
                                                <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', fontSize: '0.6rem' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: f.color }}></div>
                                                    <span style={{ color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase' }}>{f.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.6 }}>
                                            Versión Corporativa 2.0 • Plan Mantenimiento 2026
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'directorio' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
                        {sucursales.map(sucursal => (
                            <div
                                key={sucursal.id}
                                onClick={() => {
                                    setFilterSucursal(sucursal.id);
                                    setRangeStart(0);
                                    setRangeEnd(11);
                                    setFilterFranquicia('todas');
                                    setActiveTab('calendario');
                                    setCalendarView('lista');
                                    showNotification(`Mostrando plan preventivo para ${sucursal.nombre}`, "info");
                                }}
                                style={{
                                    padding: '1.5rem', cursor: 'pointer', transition: 'all 0.3s',
                                    border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column'
                                }}
                                className="glass-card hover:scale-[1.02] hover:shadow-xl group"
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '12px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                                        overflow: 'hidden', border: '1px solid var(--glass-border)'
                                    }}>
                                        {(() => {
                                            const f = franquicias.find(f => f.id === sucursal.franquiciaId);
                                            if (f?.logoUrl) return <div style={{ background: f.colorFondo || 'white', width: '100%', height: '100%', display: 'flex', padding: '4px' }}><img src={f.logoUrl} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>;
                                            return '🏢';
                                        })()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ fontWeight: '900', fontSize: '1rem', lineHeight: '1.2' }}>{sucursal.nombre}</h4>
                                        <span style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {franquicias.find(f => f.id === sucursal.franquiciaId)?.nombre || 'INDEPENDIENTE'}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)' }}>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
                                        <MapPin size={14} style={{ flexShrink: 0 }} />
                                        {sucursal.direccion}
                                    </p>
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        fontSize: '0.65rem', padding: '0.65rem 0.85rem', background: 'rgba(0,0,0,0.2)',
                                        borderRadius: '10px', color: 'var(--text-main)', border: '1px solid rgba(255,255,255,0.03)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ background: 'var(--primary)', width: '6px', height: '6px', borderRadius: '50%' }}></div>
                                            <span style={{ fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                {equipos.filter(eq => eq.sucursalId === sucursal.id).length} Equipos
                                            </span>
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const lat = sucursal.coordenadas?.lat;
                                                const lng = sucursal.coordenadas?.lng;
                                                if (lat && lng) {
                                                    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
                                                } else {
                                                    window.open(`https://www.google.com/maps/search/${encodeURIComponent(sucursal.nombre + ' ' + sucursal.direccion)}`, '_blank');
                                                }
                                            }}
                                            style={{
                                                background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
                                                color: 'var(--primary)', padding: '0.4rem 0.6rem', borderRadius: '8px',
                                                display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer',
                                                transition: 'all 0.2s', fontWeight: '800', fontSize: '0.6rem'
                                            }}
                                            className="hover:bg-primary hover:text-white"
                                        >
                                            <MapPin size={12} />
                                            VER MAPA
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- PANEL DE ASIGNACIÓN PARA COORDINADOR (DRAG & DROP) --- */}
            {(user?.rol === 'Coordinador' || isAdmin) && (
                <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <div>
                            <h3 style={{ fontWeight: '900', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <Users size={24} className="text-primary" />
                                Panel de Gestión de Técnicos (Preventivos)
                            </h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mueve las OTs entre cajones para reasignar personal</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <select
                                value={filterTecnicoPanel}
                                onChange={(e) => setFilterTecnicoPanel(e.target.value)}
                                style={{ background: 'var(--bg-input)', color: 'white', border: '1px solid var(--glass-border)', padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.8rem' }}
                            >
                                <option value="todos">Todos los Técnicos</option>
                                <option value="internos">Solo Internos</option>
                                <option value="externos">Solo Externos</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                        {allTecnicos
                            .filter(t => {
                                // Filtrar técnicos que tengan acceso a alguna de las sucursales filtradas o todas si no hay filtro
                                const belongsToBranch = filterSucursal === 'todas' || (t.sucursalesPermitidas || []).includes(filterSucursal);
                                const matchesRol = filterTecnicoPanel === 'todos' || (filterTecnicoPanel === 'internos' && t.rol === 'Tecnico') || (filterTecnicoPanel === 'externos' && t.rol === 'TecnicoExterno');
                                return belongsToBranch && matchesRol;
                            })
                            .map(tec => {
                                const tecOTs = workOrders.filter(ot => ot.tecnicoId === tec.id && ot.tipo === 'Preventivo');
                                return (
                                    <div
                                        key={tec.id}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={() => {
                                            if (draggedOT) {
                                                handleReassignTecnico(draggedOT.otId, tec.id, draggedOT.fromTecnicoId);
                                            } else if (draggedEvent) {
                                                handleDropEventOnTecnico(tec.id);
                                            }
                                        }}
                                        style={{
                                            background: draggedEvent && !eventsWithOts.has(draggedEvent?.id || '') ? 'rgba(34, 197, 94, 0.04)' : 'rgba(255,255,255,0.02)',
                                            borderRadius: '20px',
                                            border: draggedEvent ? '2px dashed rgba(34, 197, 94, 0.5)' : '1px solid var(--glass-border)',
                                            padding: '1.25rem',
                                            minHeight: '200px',
                                            transition: 'all 0.3s',
                                            boxShadow: (draggedOT?.fromTecnicoId !== tec.id && draggedOT !== null) || draggedEvent !== null ? '0 0 20px rgba(var(--primary-rgb), 0.2)' : 'none'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                👤
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontWeight: '900', fontSize: '0.9rem' }}>{tec.nombre}</p>
                                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{tec.rol} • {tecOTs.length} OTs</p>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {/* Zona de Drop para eventos */}
                                            {draggedEvent && (
                                                <div style={{
                                                    textAlign: 'center', padding: '1.5rem',
                                                    border: '2px dashed rgba(34, 197, 94, 0.4)',
                                                    borderRadius: '12px', fontSize: '0.75rem',
                                                    color: '#22c55e', fontWeight: '800',
                                                    background: 'rgba(34, 197, 94, 0.05)',
                                                    animation: 'pulse 1.5s infinite',
                                                }}>
                                                    ✨ Soltar aquí para despachar
                                                    <br />
                                                    <span style={{ fontSize: '0.65rem', fontWeight: '600', opacity: 0.7 }}>
                                                        {draggedEvent.txtPDF} • {MESES[draggedEvent.mes]} {draggedEvent.fechas}
                                                    </span>
                                                </div>
                                            )}
                                            {tecOTs.length === 0 && !draggedEvent ? (
                                                <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed var(--glass-border)', borderRadius: '12px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                    Sin OTs asignadas
                                                </div>
                                            ) : (
                                                tecOTs.map(ot => {
                                                    const equip = equipos.find(e => e.id === ot.equipoId);
                                                    const isLocked = ot.estatus !== 'Asignada';
                                                    return (
                                                        <div
                                                            key={ot.id}
                                                            draggable={!isLocked}
                                                            onDragStart={() => !isLocked && setDraggedOT({ otId: ot.id, fromTecnicoId: tec.id })}
                                                            onDragEnd={() => setDraggedOT(null)}
                                                            style={{
                                                                background: 'rgba(255,255,255,0.03)',
                                                                padding: '0.75rem 1rem',
                                                                borderRadius: '12px',
                                                                border: '1px solid var(--glass-border)',
                                                                cursor: isLocked ? 'not-allowed' : 'grab',
                                                                opacity: isLocked ? 0.6 : 1,
                                                                position: 'relative'
                                                            }}
                                                            className={isLocked ? "" : "hover:border-primary transition-all"}
                                                        >
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.25rem' }}>
                                                                <span style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--primary)' }}>{ot.numero}</span>
                                                                <span style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}>{ot.estatus}</span>
                                                            </div>
                                                            <p style={{ fontSize: '0.75rem', fontWeight: '800' }}>{equip?.nombre || 'Equipo Desconocido'}</p>
                                                            <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{ot.sucursalNombre || 'Sucursal N/A'}</p>

                                                            {isLocked && <Lock size={12} style={{ position: 'absolute', right: '8px', bottom: '8px', opacity: 0.5 }} />}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            )}

            {/* Modal de Unidades */}
            {showUnitsModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem'
                }} onClick={() => setShowUnitsModal(false)}>
                    <div className="glass-card" style={{
                        maxWidth: '500px', width: '100%', padding: '2rem',
                        maxHeight: '85vh', overflowY: 'auto',
                        border: '1px solid var(--glass-border)', position: 'relative',
                        color: 'var(--text-main)'
                    }} onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setShowUnitsModal(false)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: '900' }}
                        >✕</button>

                        <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-main)' }}>
                            <MapPin color="var(--accent)" />
                            Directorio de Sucursales (12)
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: 'var(--text-main)' }}>
                            {franquicias
                                .filter(f => sucursales.some(s => s.franquiciaId === f.id))
                                .map(f => {
                                    const sucsInFran = sucursales.filter(s => s.franquiciaId === f.id);
                                    return (
                                        <div key={f.id}>
                                            <h4 style={{ fontSize: '0.7rem', fontWeight: '900', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.25rem' }}>
                                                {f.nombre}
                                            </h4>
                                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                {sucsInFran.map(s => (
                                                    <li
                                                        key={s.id}
                                                        onClick={() => {
                                                            setFilterSucursal(s.id);
                                                            setRangeStart(0);
                                                            setRangeEnd(11);
                                                            setFilterFranquicia('todas');
                                                            setActiveTab('calendario');
                                                            setCalendarView('lista');
                                                            setShowUnitsModal(false);
                                                            showNotification(`Mostrando plan preventivo para ${s.nombre}`, "info");
                                                        }}
                                                        style={{
                                                            fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)',
                                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                            cursor: 'pointer', padding: '0.5rem', borderRadius: '8px',
                                                            transition: 'all 0.2s', background: 'rgba(255,255,255,0.02)'
                                                        }}
                                                        className="hover:bg-amber-500/10"
                                                    >
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--accent)', minWidth: '20px' }}>•</span>
                                                        {s.nombre}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    );
                                })}
                        </div>

                        <button
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '2rem' }}
                            onClick={() => setShowUnitsModal(false)}
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
            {/* Modal de Edición */}
            {showEditModal && editingEvent && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowEditModal(false)}>
                    <div className="glass-card animate-fade" style={{ maxWidth: '450px', width: '100%', padding: '1.5rem', border: '1px solid var(--glass-border)', color: 'var(--text-main)' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '900', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Edit3 size={18} color="var(--primary)" />
                            Editar Programación
                        </h2>
                        <form onSubmit={handleUpdateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Mes de Intervención</label>
                                <select
                                    name="mes"
                                    value={editingEvent.mes}
                                    onChange={(e) => setEditingEvent({ ...editingEvent, mes: parseInt(e.target.value) })}
                                    className="form-select"
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', fontSize: '0.8rem' }}
                                >
                                    {MESES.map((m, i) => <option key={i} value={i} style={{ color: 'black' }}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                    <label style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0' }}>Día(s) Programado(s)</label>
                                    <span style={{ fontSize: '0.6rem', fontWeight: '900', color: 'var(--primary)' }}>
                                        {(() => {
                                            const dur = calculateDuration(editingEvent.fechas);
                                            return dur > 0 ? `(${dur} ${dur === 1 ? 'día' : 'días'})` : '';
                                        })()}
                                    </span>
                                </div>
                                <input
                                    name="fechas"
                                    value={editingEvent.fechas}
                                    onChange={(e) => setEditingEvent({ ...editingEvent, fechas: e.target.value })}
                                    className="form-input"
                                    placeholder="Ej: 15 o 15-18"
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', fontSize: '0.8rem' }}
                                />
                                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                                    Formato: <strong>Día</strong> (ej: 15) o <strong>Periodo</strong> (ej: 15-18) sin espacios.
                                </span>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Franquicia</label>
                                <select
                                    name="franquiciaId"
                                    value={editingEvent.franquiciaId || (sucursales.find(s => s.id === editingEvent.sucursalId)?.franquiciaId || 'independiente')}
                                    onChange={(e) => {
                                        const newFranId = e.target.value;
                                        const filteredSucs = newFranId === 'independiente'
                                            ? sucursales.filter(s => !s.franquiciaId)
                                            : sucursales.filter(s => s.franquiciaId === newFranId);
                                        setEditingEvent({
                                            ...editingEvent,
                                            franquiciaId: newFranId,
                                            sucursalId: filteredSucs.length > 0 ? filteredSucs[0].id : editingEvent.sucursalId
                                        });
                                    }}
                                    className="form-select"
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', fontSize: '0.8rem' }}
                                >
                                    <option value="independiente" style={{ color: 'black' }}>INDEPENDIENTE</option>
                                    {franquicias.map(f => <option key={f.id} value={f.id} style={{ color: 'black' }}>{f.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Sucursal</label>
                                <select
                                    name="sucursalId"
                                    value={editingEvent.sucursalId}
                                    onChange={(e) => setEditingEvent({ ...editingEvent, sucursalId: e.target.value })}
                                    className="form-select"
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', fontSize: '0.8rem' }}
                                >
                                    {(() => {
                                        const currentFranId = editingEvent.franquiciaId || (sucursales.find(s => s.id === editingEvent.sucursalId)?.franquiciaId || 'independiente');
                                        const filtered = currentFranId === 'independiente'
                                            ? sucursales.filter(s => !s.franquiciaId)
                                            : sucursales.filter(s => s.franquiciaId === currentFranId);
                                        return filtered.map(s => <option key={s.id} value={s.id} style={{ color: 'black' }}>{s.nombre}</option>);
                                    })()}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.4rem', display: 'block' }}>Referencia</label>
                                <input
                                    name="txtPDF"
                                    value={editingEvent.txtPDF}
                                    onChange={(e) => setEditingEvent({ ...editingEvent, txtPDF: e.target.value })}
                                    className="form-input"
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--glass-border)', fontSize: '0.8rem' }}
                                />
                            </div>

                            <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.2)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <p style={{ fontSize: '0.6rem', color: 'rgba(34, 197, 94, 0.8)', fontWeight: '800', textTransform: 'uppercase', margin: 0 }}>Acción Rápida</p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        handleGenerarOT(editingEvent);
                                    }}
                                    className="btn"
                                    style={{
                                        width: '100%',
                                        background: '#22c55e',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        padding: '0.6rem',
                                        fontSize: '0.8rem',
                                        fontWeight: '800',
                                        border: 'none'
                                    }}
                                >
                                    <Users size={16} />
                                    GENERAR OT MASIVAS
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button type="button" onClick={() => setShowEditModal(false)} className="btn" style={{ flex: 1, border: '1px solid var(--glass-border)', color: 'var(--text-muted)', padding: '0.6rem', fontSize: '0.8rem' }}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.6rem', fontSize: '0.8rem' }}>
                                    <Save size={14} />
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Bitácora y Deshacer */}
            {showAuditModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 11000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowAuditModal(false)}>
                    <div className="glass-card animate-fade" style={{ maxWidth: '480px', width: '100%', padding: '1.25rem', border: '1px solid var(--glass-border)', color: 'var(--text-main)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: '900', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <History size={20} color="var(--primary)" />
                            Bitácora de Programación
                        </h2>

                        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }} className="custom-scrollbar">
                            {auditEntries.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {auditEntries.map((entry, idx) => {
                                        // Intentar obtener info del evento relacionado
                                        const relatedEvent = planEvents.find(ev => ev.id === entry.planId);
                                        const sucId = (entry as any).sucursalId || relatedEvent?.sucursalId;
                                        const franId = (entry as any).franquiciaId || relatedEvent?.franquiciaId;
                                        const refPDF = (entry as any).txtPDF || relatedEvent?.txtPDF;

                                        const suc = sucursales.find(s => s.id === sucId);
                                        const fran = franquicias.find(f => f.id === franId);

                                        return (
                                            <div key={entry.id || idx} style={{ padding: '0.85rem', background: idx === 0 ? 'rgba(217, 119, 6, 0.08)' : 'rgba(255,255,255,0.02)', borderRadius: '10px', border: idx === 0 ? '1px solid var(--primary)' : '1px solid var(--glass-border)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem' }}>
                                                    <span style={{ fontWeight: '800', fontSize: '0.75rem' }}>{entry.usuarioNombre}</span>
                                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{new Date(entry.fecha).toLocaleString()}</span>
                                                </div>

                                                <div style={{ marginBottom: '0.6rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                                                        {fran?.nombre || 'Franqueado'}
                                                    </span>
                                                    <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontWeight: '800' }}>
                                                        {suc?.nombre || refPDF || 'Log Desconocido'}
                                                    </span>
                                                    {refPDF && refPDF !== suc?.nombre && (
                                                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>({refPDF})</span>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                                    {entry.detalles.map((d, di) => (
                                                        <div key={di} style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center' }}>
                                                            <span style={{ color: 'var(--text-muted)', minWidth: '60px' }}>{d.campo}:</span>
                                                            <span style={{ textDecoration: 'line-through', opacity: 0.4, marginRight: '0.4rem' }}>
                                                                {d.campo === 'mes' ? MESES[d.anterior] : d.anterior}
                                                            </span>
                                                            <ArrowRight size={10} style={{ margin: '0 0.2rem', opacity: 0.5 }} />
                                                            <span style={{ color: 'var(--primary)', fontWeight: '800', marginLeft: '0.4rem' }}>
                                                                {d.campo === 'mes' ? MESES[d.nuevo] : d.nuevo}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {idx === 0 && (
                                                    <button
                                                        onClick={handleUndoLastChange}
                                                        className="btn"
                                                        style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.65rem', height: 'auto', padding: '0.4rem', background: '#dc2626', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', borderRadius: '6px' }}
                                                    >
                                                        <RotateCcw size={12} />
                                                        Deshacer este cambio
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0', fontSize: '0.75rem' }}>No hay registros en la bitácora todavía.</p>
                            )}
                        </div>
                        <button onClick={() => setShowAuditModal(false)} className="btn" style={{ width: '100%', marginTop: '1rem', border: '1px solid var(--glass-border)', padding: '0.6rem', fontSize: '0.8rem' }}>Cerrar</button>
                    </div>
                </div>
            )}

            {/* Modal de Importación (Solo Admin) */}
            {showImportModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 100000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <Upload size={24} color="var(--primary)" />
                                <h2 style={{ fontSize: '1.5rem', fontWeight: '900' }}>Importar Calendario Preventivo</h2>
                            </div>
                            <button onClick={() => { setShowImportModal(false); setImportData([]); setImportErrors([]); }} style={{ background: 'transparent', border: 'none', color: 'white' }}><X size={24} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
                                    <FileText size={32} color="var(--primary)" style={{ marginBottom: '1rem', opacity: 0.7 }} />
                                    <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.5rem' }}>1. Descarga la Plantilla</h3>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Utiliza el formato correcto para asegurar que el sistema reconozca tus datos.</p>
                                    <button onClick={downloadTemplate} className="btn" style={{ background: 'var(--bg-input)', width: '100%', border: '1px solid var(--glass-border)', color: 'white' }}>
                                        <Download size={16} /> Descargar CSV
                                    </button>
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '16px', border: '1px dashed rgba(34, 197, 94, 0.2)', textAlign: 'center' }}>
                                    <Upload size={32} color="#4ade80" style={{ marginBottom: '1rem', opacity: 0.7 }} />
                                    <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.5rem' }}>2. Sube tu Archivo</h3>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Sube el archivo CSV con tu programación de mantenimientos.</p>
                                    <label className="btn" style={{ background: 'rgba(34,197,94,0.1)', width: '100%', border: '1px solid #4ade80', color: '#4ade80', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        <Upload size={16} /> Seleccionar Archivo
                                        <input type="file" accept=".csv" onChange={handleFileImport} style={{ display: 'none' }} />
                                    </label>
                                </div>
                            </div>

                            {/* Status and Errors Area */}
                            {(importData.length > 0 || importErrors.length > 0) && (
                                <div style={{ background: 'var(--bg-input)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <CheckCircle size={18} color="#4ade80" />
                                            <span style={{ fontWeight: '800', fontSize: '1.2rem', color: '#4ade80' }}>{importData.length}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Válidos</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <AlertCircle size={18} color="var(--priority-alta)" />
                                            <span style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--priority-alta)' }}>{importErrors.length}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Errores</span>
                                        </div>
                                    </div>

                                    {importErrors.length > 0 && (
                                        <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }} className="custom-scrollbar">
                                            {importErrors.map((err, i) => (
                                                <div key={i} style={{ fontSize: '0.7rem', color: '#f87171', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                                    {err}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {importData.length > 0 && importErrors.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '1rem', color: '#4ade80', fontSize: '0.85rem', fontWeight: '700' }}>
                                            ¡Archivo procesado con éxito! Todos los registros son válidos.
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button className="btn" onClick={() => { setShowImportModal(false); setImportData([]); setImportErrors([]); }} style={{ flex: 1, background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}>Cerrar</button>
                                <button
                                    disabled={importData.length === 0 || importErrors.length > 0 || isImporting}
                                    onClick={executeImport}
                                    className="btn btn-primary"
                                    style={{ flex: 2, background: '#22c55e', opacity: (importData.length === 0 || isImporting) ? 0.5 : 1 }}
                                >
                                    {isImporting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                                    {isImporting ? 'IMPORTANDO...' : `IMPORTAR ${importData.length} REGISTROS`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL DE CONFIGURACIÓN DE FOLIOS (SUPER ADMIN ONLY) --- */}
            {showConfigModal && isSuperAdmin && (
                <div className="modal-overlay" style={{ zIndex: 110000 }}>
                    <div className="glass-card modal-content animate-scale-up" style={{ maxWidth: '450px', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Settings size={20} color="var(--primary)" />
                                </div>
                                <div>
                                    <h3 style={{ fontWeight: '900', fontSize: '1.25rem' }}>Folios de OT</h3>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Configuración de Inicio (Solo Admin)</p>
                                </div>
                            </div>
                            <button onClick={() => setShowConfigModal(false)} className="hover:text-primary transition-colors"><X size={20} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="input-group">
                                <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Próximo Folio Correctivas</label>
                                <input
                                    type="number"
                                    value={configFolios.otNumber}
                                    onChange={(e) => setConfigFolios({ ...configFolios, otNumber: Number(e.target.value) })}
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--glass-border)', color: 'white', fontWeight: '800', fontSize: '1.2rem' }}
                                />
                            </div>

                            <div className="input-group">
                                <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Próximo Folio Preventivas (Serie P)</label>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem 1rem', borderRadius: '10px 0 0 10px', border: '1px solid var(--glass-border)', borderRight: 'none', color: 'var(--primary)', fontWeight: '900' }}>P-</span>
                                    <input
                                        type="number"
                                        value={configFolios.preventiveOtNumber}
                                        onChange={(e) => setConfigFolios({ ...configFolios, preventiveOtNumber: Number(e.target.value) })}
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '0 10px 10px 0', background: 'var(--bg-input)', border: '1px solid var(--glass-border)', color: 'white', fontWeight: '800', fontSize: '1.2rem' }}
                                    />
                                </div>
                            </div>

                            <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.1)', display: 'flex', gap: '0.75rem' }}>
                                <AlertCircle size={16} color="#F59E0B" style={{ flexShrink: 0 }} />
                                <p style={{ fontSize: '0.65rem', color: '#F59E0B', fontStyle: 'italic' }}>Atención: Cambiar estos valores afectará el consecutivo de las próximas OTs creadas en todo el sistema.</p>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button className="btn" onClick={() => setShowConfigModal(false)} style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--glass-border)' }}>Cancelar</button>
                                <button
                                    className="btn btn-primary"
                                    style={{ flex: 2 }}
                                    disabled={isSavingConfig}
                                    onClick={async () => {
                                        if (!user) return;
                                        setIsSavingConfig(true);
                                        try {
                                            await updateCounterConfig(user.clienteId, configFolios.otNumber, configFolios.preventiveOtNumber, user);
                                            showNotification("Configuración de folios actualizada.", "success");
                                            setShowConfigModal(false);
                                        } catch (e) {
                                            showNotification("Error al actualizar configuración.", "error");
                                        } finally { setIsSavingConfig(false); }
                                    }}
                                >
                                    {isSavingConfig ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    GUARDAR CONFIGURACIÓN
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {/* --- WIZARD DE GENERACIÓN MASIVA v2.0 --- */}
            {
                showGenModal && genEvent && user && (
                    <MassiveOTWizard
                        evento={genEvent}
                        equipos={equipos}
                        sucursales={sucursales}
                        allTecnicos={allTecnicos}
                        user={user}
                        preSelectedTecnicoId={preSelectedTecnicoForGen}
                        onClose={() => { setShowGenModal(false); setPreSelectedTecnicoForGen(undefined); }}
                        onSuccess={() => fetchData()}
                    />
                )
            }

            {/* --- DASHBOARD DE GESTIÓN MASIVA v2.0 --- */}
            {
                showDashboardModal && genEvent && user && (
                    <MassiveOTDashboard
                        evento={genEvent}
                        allTecnicos={allTecnicos}
                        equipos={equipos}
                        user={user}
                        onClose={() => setShowDashboardModal(false)}
                        onUpdate={() => fetchData()}
                    />
                )
            }
        </div >
    );
};

