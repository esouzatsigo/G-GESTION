import React, { useEffect, useState, useMemo } from 'react';
import {
    collection,
    getDocs,
    addDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';
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
    Save
} from 'lucide-react';
import {
    getNextOTNumber,
    getPlanPreventivo,
    updatePreventivoPlan,
    getBitacoraPreventivos,
    undoPreventivoChange,
    type PreventivoPlanEntry,
    type BitacoraPreventivo
} from '../services/dataService';
import type { Sucursal, Equipo, WorkOrder, Franquicia } from '../types';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../hooks/useAuth';
import { saveAs } from 'file-saver';

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
    const { user } = useAuth();
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
    const [isMigrating, setIsMigrating] = useState(false);
    const [calendarView, setCalendarView] = useState<'lista' | 'semana' | 'mes' | 'año'>('lista');
    const [viewDate, setViewDate] = useState(new Date(2026, rangeStart, 1));
    const [selectedSemester, setSelectedSemester] = useState<0 | 1>(0); // 0: Ene-Jun, 1: Jul-Dic

    useEffect(() => {
        // Sincronizar viewDate cuando cambia el rango si la vista no es Lista
        if (calendarView !== 'lista') {
            setViewDate(new Date(2026, rangeStart, 1));
        }
    }, [rangeStart]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [sucSnap, fSnap, eqSnap, planData] = await Promise.all([
                getDocs(collection(db, 'sucursales')),
                getDocs(collection(db, 'franquicias')),
                getDocs(collection(db, 'equipos')),
                getPlanPreventivo()
            ]);

            setSucursales(sucSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sucursal)));
            setFranquicias(fSnap.docs.map(d => ({ id: d.id, ...d.data() } as Franquicia)));
            setEquipos(eqSnap.docs.map(d => ({ id: d.id, ...d.data() } as Equipo)));

            if (planData.length === 0 && PLAN_2026.length > 0) {
                // Auto-migración si la DB está vacía
                setIsMigrating(true);
                const batchPromises = PLAN_2026.map(item => addDoc(collection(db, 'planPreventivo2026'), item));
                await Promise.all(batchPromises);
                const freshPlan = await getPlanPreventivo();
                setPlanEvents(freshPlan);
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
        if (name.includes('city') || name.includes('comisariato') || name.includes('panaderia') || name.includes('caucel') || name.includes('parr.')) return '#f59e0b';
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
    const filteredEvents = useMemo(() => {
        return planEvents.filter(e => {
            const matchMes = e.mes >= rangeStart && e.mes <= rangeEnd;
            const suc = sucursales.find(s => s.id === e.sucursalId || s.nombre.includes(e.txtPDF));
            const matchSuc = filterSucursal === 'todas' || suc?.id === filterSucursal;
            const matchFranquicia = filterFranquicia === 'todas' || suc?.franquiciaId === filterFranquicia;
            return matchMes && matchSuc && matchFranquicia;
        });
    }, [rangeStart, rangeEnd, filterSucursal, filterFranquicia, sucursales, planEvents]);

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
            const name = f.nombre;
            let icon = Info;
            const color = f.colorFondo || "#94a3b8";

            const upperName = name.toUpperCase();
            if (upperName.includes("BOSTON")) icon = Pizza;
            else if (upperName.includes("PARROQUIA")) icon = Coffee;
            else if (upperName.includes("CHICKEN") || upperName.includes("BPT")) icon = Drumstick;
            else if (upperName.includes("ROLL") || upperName.includes("SUSHI")) icon = Fish;
            else if (upperName.includes("INTERN") || upperName.includes("COMISARIATO")) icon = Info;

            return {
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

    // Datos para Gráfico de Barras (Meses)
    const barData = {
        labels: MESES.map(m => m.substring(0, 3)),
        datasets: [{
            label: 'Intervenciones',
            data: MESES.map((_, i) => filteredEvents.filter(e => e.mes === i).length),
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

    const handleGenerarOT = async (evento: any) => {
        if (!user) return;
        try {
            const numero = await getNextOTNumber();
            const sucursal = sucursales.find(s => s.id === evento.sucursalId || s.nombre.includes(evento.txtPDF));
            // Defaulting to the first equipment of that branch if none specified in static plan
            const equipo = equipos.find(e => e.sucursalId === sucursal?.id);

            const newOT: Partial<WorkOrder> = {
                numero,
                tipo: 'Preventivo',
                estatus: 'Pendiente',
                fechas: {
                    solicitada: new Date().toISOString(),
                    programada: new Date(2026, evento.mes, parseInt(evento.fechas.split(' ')[0])).toISOString(),
                },
                clienteId: sucursal?.clienteId || '',
                sucursalId: sucursal?.id || evento.sucursalId,
                equipoId: equipo?.id || '',
                descripcionFalla: `MANTENIMIENTO PREVENTIVO PROGRAMADO 2026 - REF: ${evento.txtPDF}`
            };

            await addDoc(collection(db, 'ordenesTrabajo'), newOT);
            showNotification(`OT #${numero} generada exitosamente para ${sucursal?.nombre || evento.txtPDF}.`, "success");
        } catch (e) {
            showNotification("Error al generar la Orden de Trabajo.", "error");
        }
    };

    const exportToCSV = () => {
        const rows = [
            ["Mes", "Dias", "Sucursal", "Franquicia", "Referencia PDF"]
        ];

        planEvents.forEach(e => {
            const suc = sucursales.find(s => s.id === e.sucursalId || s.nombre.includes(e.txtPDF));
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
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, "ICEMAS_Preventivos_2026.csv");
    };

    const handleUpdateEvent = async (e: any) => {
        e.preventDefault();
        if (!editingEvent || !user) return;
        try {
            const formData = new FormData(e.target);
            const newData = {
                mes: parseInt(formData.get('mes') as string),
                fechas: formData.get('fechas') as string,
                sucursalId: formData.get('sucursalId') as string,
                txtPDF: formData.get('txtPDF') as string
            };

            await updatePreventivoPlan(editingEvent.id, editingEvent, newData, user);
            showNotification("Programación actualizada correctamente.", "success");
            setShowEditModal(false);
            fetchData();
        } catch (error) {
            showNotification("Error al actualizar la programación.", "error");
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

                <div className="glass-card" style={{ display: 'flex', padding: '0.25rem', gap: '0.25rem', borderRadius: '12px' }}>
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
                                padding: '0.6rem 1rem', borderRadius: '10px',
                                background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                                color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
                                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                                fontWeight: '700', fontSize: '0.85rem'
                            }}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Common Filters Area */}
            <div className="glass-card" style={{ padding: '0', overflow: 'hidden', marginBottom: '2rem' }}>
                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div style={{ minWidth: '300px' }}>
                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Rango de Meses</span>
                                <span style={{ color: 'var(--primary)' }}>{MESES[rangeStart]} - {MESES[rangeEnd]}</span>
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                                <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>Ene</span>
                                <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>Dic</span>
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Filtrar por Franquicia</label>
                            <select
                                value={filterFranquicia}
                                onChange={e => { setFilterFranquicia(e.target.value); setFilterSucursal('todas'); }}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
                            >
                                <option value="todas">Todas las franquicias</option>
                                {franquicias.map(f => <option key={f.id} value={f.id} style={{ color: 'black' }}>{f.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Filtrar por Sucursal</label>
                            <select
                                value={filterSucursal}
                                onChange={e => setFilterSucursal(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
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
                        <button
                            onClick={exportToCSV}
                            className="btn btn-primary"
                            style={{ background: '#059669', border: 'none', boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)' }}
                        >
                            <Download size={18} />
                            Exportar Calendario
                        </button>
                        <button
                            onClick={() => { setRangeStart(0); setRangeEnd(11); setFilterSucursal('todas'); setFilterFranquicia('todas'); }}
                            className="btn"
                            style={{ border: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}
                        >
                            Limpiar Filtros
                        </button>
                        <button
                            onClick={openAuditModal}
                            className="btn"
                            style={{ border: '1px solid var(--glass-border)', color: 'var(--text-muted)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
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
                                <div key={i} className="glass-card" style={{
                                    textAlign: 'center',
                                    padding: '1rem',
                                    border: `1px solid ${f.color}33`,
                                    background: `${f.color}11`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.25rem',
                                    minHeight: '100px'
                                }}>
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
                                <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1.5rem', textAlign: 'center' }}>Intervenciones por Mes</h3>
                                <div style={{ height: '240px' }}>
                                    <Bar data={barData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                                </div>
                            </div>
                            <div className="glass-card" style={{ padding: '1.5rem', height: '350px' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: '800', marginBottom: '1.5rem', textAlign: 'center' }}>Carga por Franquicia</h3>
                                <div style={{ height: '240px' }}>
                                    <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }} />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'calendario' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Selector de Vista (Premium) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                    {filteredEvents.length > 0 ? (
                                        filteredEvents.map((e, idx) => {
                                            const suc = sucursales.find(s => s.id === e.sucursalId || s.nombre.includes(e.txtPDF));
                                            return (
                                                <div key={idx} style={{
                                                    padding: '1.5rem', borderBottom: '1px solid var(--glass-border)',
                                                    display: 'flex', alignItems: 'center', gap: '1.5rem', transition: 'all 0.2s'
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
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                            <p style={{ fontSize: '0.65rem', fontWeight: '900', color: getEventColor(e), textTransform: 'uppercase' }}>{MESES[e.mes]}</p>
                                                            <Edit3 size={10} className="hidden group-hover:block" />
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
                                                                {suc?.nombre || e.txtPDF}
                                                            </h4>
                                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Ref: {e.txtPDF}</p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => handleGenerarOT(e)}
                                                        style={{
                                                            padding: '0.6rem 1rem', borderRadius: '8px',
                                                            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
                                                            color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.75rem',
                                                            display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700'
                                                        }}
                                                        className="hover:bg-primary hover:text-white"
                                                    >
                                                        <ArrowRight size={14} />
                                                        Generar OT
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

                                                                    const suc = sucursales.find(s => s.id === ev.sucursalId || s.nombre.includes(ev.txtPDF));
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
                                                                            {initials}{suc?.nombre || ev.txtPDF}
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
                                                        const suc = sucursales.find(s => s.id === ev.sucursalId || s.nombre.includes(ev.txtPDF));

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
                                                                {initials}{suc?.nombre || ev.txtPDF}
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

                                                            const suc = eventForDay ? sucursales.find(s => s.id === eventForDay.sucursalId || s.nombre.includes(eventForDay.txtPDF)) : null;
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
                                className="glass-card"
                                onClick={() => { setFilterSucursal(sucursal.id); setRangeStart(0); setRangeEnd(11); setFilterFranquicia('todas'); setActiveTab('calendario'); }}
                                style={{
                                    padding: '1.5rem', cursor: 'pointer', transition: 'all 0.3s',
                                    border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column'
                                }}
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
                                        display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem',
                                        padding: '0.5rem', background: 'var(--bg-input)', borderRadius: '6px', color: 'var(--text-muted)'
                                    }}>
                                        <span>LAT: {sucursal.coordenadas?.lat?.toString().substring(0, 7) || '0.00'}</span>
                                        <span>LNG: {sucursal.coordenadas?.lng?.toString().substring(0, 7) || '0.00'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

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
                                                    <li key={s.id} style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
                    <div className="glass-card animate-fade" style={{ maxWidth: '500px', width: '100%', padding: '2rem', border: '1px solid var(--glass-border)', color: 'var(--text-main)' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '900', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Edit3 color="var(--primary)" />
                            Editar Programación
                        </h2>
                        <form onSubmit={handleUpdateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Mes de Intervención</label>
                                <select name="mes" defaultValue={editingEvent.mes} className="form-select" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}>
                                    {MESES.map((m, i) => <option key={i} value={i} style={{ color: 'black' }}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                    <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0' }}>Día(s) Programado(s)</label>
                                    <span style={{ fontSize: '0.65rem', fontWeight: '900', color: 'var(--primary)' }}>
                                        {(() => {
                                            const dur = calculateDuration(editingEvent.fechas);
                                            return dur > 0 ? `(${dur} ${dur === 1 ? 'día' : 'días'})` : '';
                                        })()}
                                    </span>
                                </div>
                                <input
                                    name="fechas"
                                    defaultValue={editingEvent.fechas}
                                    onChange={(e) => setEditingEvent({ ...editingEvent, fechas: e.target.value })}
                                    className="form-input"
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Sucursal</label>
                                <select name="sucursalId" defaultValue={editingEvent.sucursalId} className="form-select" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}>
                                    {sucursales.map(s => <option key={s.id} value={s.id} style={{ color: 'black' }}>{s.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'block' }}>Referencia (PDF)</label>
                                <input name="txtPDF" defaultValue={editingEvent.txtPDF} className="form-input" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: 'var(--bg-input)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowEditModal(false)} className="btn" style={{ flex: 1, border: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>Cancelar</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <Save size={16} />
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
                    <div className="glass-card animate-fade" style={{ maxWidth: '600px', width: '100%', padding: '2rem', border: '1px solid var(--glass-border)', color: 'var(--text-main)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '900', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <History color="var(--primary)" />
                            Bitácora de Programación Preventiva
                        </h2>

                        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '1rem' }}>
                            {auditEntries.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {auditEntries.map((entry, idx) => (
                                        <div key={entry.id || idx} style={{ padding: '1rem', background: idx === 0 ? 'rgba(217, 119, 6, 0.1)' : 'rgba(255,255,255,0.02)', borderRadius: '12px', border: idx === 0 ? '1px solid var(--primary)' : '1px solid var(--glass-border)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: '800', fontSize: '0.85rem' }}>{entry.usuarioNombre}</span>
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(entry.fecha).toLocaleString()}</span>
                                            </div>
                                            {entry.detalles.map((d, di) => (
                                                <div key={di} style={{ fontSize: '0.75rem' }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>{d.campo}:</span>
                                                    <span style={{ textDecoration: 'line-through', margin: '0 0.5rem', opacity: 0.5 }}> {d.campo === 'mes' ? MESES[d.anterior] : d.anterior} </span>
                                                    <ArrowRight size={10} style={{ margin: '0 0.25rem' }} />
                                                    <span style={{ color: 'var(--primary)', fontWeight: '700' }}> {d.campo === 'mes' ? MESES[d.nuevo] : d.nuevo}</span>
                                                </div>
                                            ))}
                                            {idx === 0 && (
                                                <button
                                                    onClick={handleUndoLastChange}
                                                    className="btn btn-primary"
                                                    style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.7rem', height: 'auto', padding: '0.4rem', background: '#dc2626' }}
                                                >
                                                    <RotateCcw size={14} />
                                                    Deshacer este cambio
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>No hay registros en la bitácora todavía.</p>
                            )}
                        </div>
                        <button onClick={() => setShowAuditModal(false)} className="btn" style={{ width: '100%', marginTop: '1.5rem', border: '1px solid var(--glass-border)' }}>Cerrar</button>
                    </div>
                </div>
            )}
        </div>
    );
};
