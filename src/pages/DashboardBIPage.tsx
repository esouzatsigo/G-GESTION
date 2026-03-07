import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { WorkOrder, Sucursal, Franquicia, User } from '../types';
import { tenantQuery } from '../services/tenantContext';
import { getDocs } from 'firebase/firestore';
import { Chart, Line, Bar, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title as ChartTitle,
    Tooltip,
    Legend as ChartLegend,
    Filler
} from 'chart.js';
import { Filter, Calendar, MapPin, Building2, TrendingUp, Clock, CheckCircle2, Users, Activity, Divide, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { BIDrillDownModal } from '../components/BIDrillDownModal';
import { generateExecutiveReport } from '../utils/generateExecutiveReport';
import { PrintableExecutiveReport } from '../components/PrintableExecutiveReport';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    ChartTitle,
    Tooltip,
    ChartLegend,
    Filler
);

export const DashboardBIPage: React.FC = () => {
    // raw data
    const [ots, setOts] = useState<WorkOrder[]>([]);
    const [sucursales, setSucursales] = useState<Sucursal[]>([]);
    const [franquicias, setFranquicias] = useState<Franquicia[]>([]);
    const [tecnicos, setTecnicos] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    // Smart filter bar: auto-hide on scroll down, reappear on scroll up
    const [filtersVisible, setFiltersVisible] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        const onScroll = (e?: Event) => {
            const y = (e?.target as HTMLElement)?.scrollTop ?? window.scrollY ?? 0;
            if (y < 80) {
                setFiltersVisible(true);
            } else if (y > lastScrollY.current + 25) {
                setFiltersVisible(false);
            } else if (y < lastScrollY.current - 25) {
                setFiltersVisible(true);
            }
            lastScrollY.current = y;
        };
        const winScroll = () => onScroll();
        window.addEventListener('scroll', winScroll, { passive: true });
        const main = document.querySelector('main');
        if (main) main.addEventListener('scroll', onScroll as EventListener, { passive: true });
        return () => {
            window.removeEventListener('scroll', winScroll);
            if (main) main.removeEventListener('scroll', onScroll as EventListener);
        };
    }, []);

    // DrillDown Modal State
    const [drillDown, setDrillDown] = useState<{ title: string; subtitle?: string; orders: WorkOrder[] } | null>(null);
    const [previewReport, setPreviewReport] = useState<{ startDate: string; endDate: string; data: any } | null>(null);

    // Global Filters
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedFranquicia, setSelectedFranquicia] = useState('ALL');
    const [selectedSucursal, setSelectedSucursal] = useState('ALL');
    const [selectedTipo, setSelectedTipo] = useState('ALL');

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const [otsSnap, sucSnap, franSnap, userSnap] = await Promise.all([
                    getDocs(tenantQuery('ordenesTrabajo', user)),
                    getDocs(tenantQuery('sucursales', user)),
                    getDocs(tenantQuery('franquicias', user)),
                    getDocs(tenantQuery('usuarios', user))
                ]);

                setOts(otsSnap.docs.map(d => ({ id: d.id, ...d.data() } as WorkOrder)));
                setSucursales(sucSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sucursal)));
                setFranquicias(franSnap.docs.map(d => ({ id: d.id, ...d.data() } as Franquicia)));
                setTecnicos(userSnap.docs.map(d => {
                    const data = d.data();
                    return { id: d.id, ...data } as User;
                }).filter(u => u.rol && (u.rol.toLowerCase().includes('tecnico') || u.rol.toLowerCase().includes('coordinador'))));
            } catch (error) {
                console.error("Error fetching data for BI Dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // ----------------------------------------------------------------------
    // DERIVED STATE & FILTERING
    // ----------------------------------------------------------------------

    const filteredOts = useMemo(() => {
        return ots.filter(ot => {
            const requestedDateStr = ot.fechas?.solicitada?.split('T')[0];
            const tsDate = requestedDateStr || '';

            if (tsDate < startDate || tsDate > endDate) return false;

            if (selectedTipo !== 'ALL') {
                const tipo = ot.tipo || 'Correctivo';
                if (tipo !== selectedTipo) return false;
            }

            if (selectedFranquicia !== 'ALL') {
                const suc = sucursales.find(s => s.id === ot.sucursalId);
                if (!suc || suc.franquiciaId !== selectedFranquicia) return false;
            }
            if (selectedSucursal !== 'ALL' && ot.sucursalId !== selectedSucursal) return false;

            return true;
        });
    }, [ots, startDate, endDate, selectedFranquicia, selectedSucursal, selectedTipo, sucursales]);

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    color: 'var(--text-main)',
                    font: { family: 'Inter', size: 9 },
                    boxWidth: 10,
                    padding: 10
                }
            },
            tooltip: {
                callbacks: {
                    label: function (context: any) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += context.parsed.y;
                            // Extract percentage if available
                            const total = context.chart._metasets[context.datasetIndex].total;
                            if (total > 0 && context.chart.config.type === 'doughnut') {
                                const percentage = ((context.parsed / total) * 100).toFixed(1) + '%';
                                label += ` (${percentage})`;
                            }
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                ticks: { color: 'var(--text-muted)', font: { size: 9 } },
                grid: { color: 'rgba(255,255,255,0.05)' }
            },
            y: {
                ticks: { color: 'var(--text-muted)', font: { size: 9 } },
                grid: { color: 'rgba(255,255,255,0.05)' }
            }
        }
    };

    // --- SMART INSIGHT COMPONENT ---
    const SmartInsight = ({ title, value, insight, color = 'var(--primary)', isPositive = true }: any) => (
        <div style={{
            background: `linear-gradient(135deg, rgba(255,255,255,0.02), rgba(${color === 'var(--primary)' ? '79,70,229' : '16,185,129'}, 0.05))`,
            border: `1px solid rgba(${color === 'var(--primary)' ? '79,70,229' : '16,185,129'}, 0.2)`,
            borderRadius: '12px',
            padding: '1rem',
            marginTop: '1rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'flex-start'
        }}>
            <div style={{
                background: `rgba(${color === 'var(--primary)' ? '79,70,229' : '16,185,129'}, 0.1)`,
                padding: '0.5rem',
                borderRadius: '8px',
                color: color
            }}>
                <Sparkles size={16} />
            </div>
            <div>
                <h4 style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.2rem' }}>{title}</h4>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-main)' }}>{value}</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: isPositive ? 'var(--status-concluida)' : '#ef4444', lineHeight: '1.4' }}>
                    {insight}
                </p>
            </div>
        </div>
    );

    // 1. Dinámica de Flujo de Trabajo (Divided by Type)
    const flujoData = useMemo(() => {
        const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
        const corrCounts = [0, 0, 0, 0, 0, 0, 0];
        const prevCounts = [0, 0, 0, 0, 0, 0, 0];
        const backlogRatios = [0, 0, 0, 0, 0, 0, 0];

        filteredOts.forEach(ot => {
            if (!ot.fechas?.solicitada) return;
            const openDate = new Date(ot.fechas.solicitada);
            const day = openDate.getDay();

            const isCorrective = (ot.tipo || 'Correctivo') === 'Correctivo';
            if (isCorrective) {
                corrCounts[day]++;
            } else {
                prevCounts[day]++;
            }

            const isClosed = ot.estatus === 'Concluida' || ot.estatus === 'Finalizada';
            if (!isClosed && (ot.estatus as any) !== 'Cancelada') {
                backlogRatios[day]++;
            }
        });

        // Convert backlog counts to % of total intake that day
        for (let i = 0; i < 7; i++) {
            const total = corrCounts[i] + prevCounts[i];
            backlogRatios[i] = total > 0 ? (backlogRatios[i] / total) * 100 : 0;
        }

        // Insight Logic: Find Peak Day
        let maxIntake = 0;
        let peakDayIndex = 0;
        for (let i = 0; i < 7; i++) {
            const totalIntake = corrCounts[i] + prevCounts[i];
            if (totalIntake > maxIntake) {
                maxIntake = totalIntake;
                peakDayIndex = i;
            }
        }
        let peakDayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][peakDayIndex];

        return {
            labels: days,
            datasets: [
                {
                    type: 'line' as const,
                    label: 'Ratio Backlog (%)',
                    data: backlogRatios.map(v => v.toFixed(1)),
                    borderColor: '#F59E0B',
                    backgroundColor: '#F59E0B',
                    borderWidth: 2,
                    tension: 0.4,
                    yAxisID: 'y1'
                },
                {
                    type: 'bar' as const,
                    label: 'Correctivas (Intake)',
                    data: corrCounts,
                    backgroundColor: '#4f46e5',
                    yAxisID: 'y'
                },
                {
                    type: 'bar' as const,
                    label: 'Preventivas (Intake)',
                    data: prevCounts,
                    backgroundColor: '#10b981',
                    yAxisID: 'y'
                }
            ],
            insight: {
                peakDayName,
                peakVolume: maxIntake,
                isWarning: maxIntake > (filteredOts.length / 7) * 1.5 // Alert if peak is > 50% above average
            }
        };
    }, [filteredOts]);

    // 2. Estatus Real de Órdenes
    const estatusData = useMemo(() => {
        const statuses = [
            'Pendiente',
            'Asignada',
            'Llegada a Sitio',
            'Iniciada',
            'Concluida. Pendiente Firma Cliente',
            'Concluida',
            'Finalizada',
            'Cancelada'
        ];

        const counts = new Array(statuses.length).fill(0);

        filteredOts.forEach(ot => {
            const s = ot.estatus || 'Pendiente';
            const idx = statuses.indexOf(s);
            if (idx !== -1) counts[idx]++;
        });

        const total = filteredOts.length || 1;
        const finalized = (counts[statuses.indexOf('Concluida')] || 0) + (counts[statuses.indexOf('Finalizada')] || 0);
        const processing = filteredOts.length - (counts[statuses.indexOf('Cancelada')] || 0) - finalized;

        const finP = ((finalized / total) * 100).toFixed(1);
        const proP = ((processing / total) * 100).toFixed(1);

        // Insight Logic: Find Bottleneck
        let maxInProgress = 0;
        let bottleneckStatus = '';
        const inProgressIndices = [0, 1, 2, 3, 4]; // Pendiente to Cierre Solicitado
        inProgressIndices.forEach(idx => {
            if (counts[idx] > maxInProgress) {
                maxInProgress = counts[idx];
                bottleneckStatus = statuses[idx];
            }
        });
        const bottleneckP = ((maxInProgress / total) * 100).toFixed(1);

        return {
            chartData: {
                labels: statuses.map(s => s.toUpperCase()),
                datasets: [{
                    data: counts,
                    backgroundColor: [
                        '#94a3b8', // Pendiente
                        '#64748b', // Asignada
                        '#0ea5e9', // Llegada
                        '#4f46e5', // Iniciada
                        '#06b6d4', // Cierre Solicitado
                        '#10b981', // Concluida
                        '#8b5cf6', // Finalizada
                        '#ef4444'  // Cancelada
                    ],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            finP, proP,
            insight: {
                bottleneckStatus,
                bottleneckP,
                maxInProgress
            }
        };
    }, [filteredOts]);

    // 3. Carga por Técnico (Divided by Type)
    const cargaTecnicoData = useMemo(() => {
        const userStats: Record<string, { name: string, corrective: number, preventive: number }> = {};

        tecnicos.forEach(t => {
            userStats[t.id] = { name: t.nombre, corrective: 0, preventive: 0 };
        });

        filteredOts.forEach(ot => {
            if (!ot.tecnicoId || !userStats[ot.tecnicoId]) return;
            if ((ot.estatus as any) === 'Cancelada') return;

            const isCorrective = (ot.tipo || 'Correctivo') === 'Correctivo';
            if (isCorrective) userStats[ot.tecnicoId].corrective++;
            else userStats[ot.tecnicoId].preventive++;
        });

        const sortedUsers = Object.values(userStats).filter(u => (u.corrective + u.preventive) > 0);

        // Insight Logic: Find Overloaded Tech
        let totalActive = 0;
        let maxActive = 0;
        let overloadedTech = '';
        sortedUsers.forEach(u => {
            const active = u.corrective + u.preventive;
            totalActive += active;
            if (active > maxActive) {
                maxActive = active;
                overloadedTech = u.name;
            }
        });
        const avgActive = sortedUsers.length > 0 ? totalActive / sortedUsers.length : 0;
        const isOverloaded = maxActive > (avgActive * 1.5); // 50% above average

        return {
            labels: sortedUsers.map(u => u.name),
            datasets: [
                { label: 'Correctivas', data: sortedUsers.map(u => u.corrective), backgroundColor: '#4f46e5' },
                { label: 'Preventivas', data: sortedUsers.map(u => u.preventive), backgroundColor: '#10b981' }
            ],
            insight: {
                overloadedTech,
                maxActive,
                isOverloaded
            }
        };
    }, [filteredOts, tecnicos]);

    // 4. Factor de Mantenimiento (Preventivas vs Correctivas)
    const factorMantenimiento = useMemo(() => {
        let corr = 0;
        let prev = 0;

        filteredOts.forEach(ot => {
            if ((ot.estatus as any) === 'Cancelada') return;
            if ((ot.tipo || 'Correctivo') === 'Correctivo') corr++;
            else prev++;
        });

        const total = (corr + prev) || 1;
        const ratio = (prev / total) * 100;

        // Time series for ratio
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const monthlyCorr = new Array(12).fill(0);
        const monthlyPrev = new Array(12).fill(0);

        filteredOts.forEach(ot => {
            if (!ot.fechas?.solicitada || (ot.estatus as any) === 'Cancelada') return;
            const m = new Date(ot.fechas.solicitada).getMonth();
            if ((ot.tipo || 'Correctivo') === 'Correctivo') monthlyCorr[m]++;
            else monthlyPrev[m]++;
        });

        const monthlyRatio = monthlyCorr.map((c, i) => {
            const p = monthlyPrev[i];
            const t = (c + p) || 1;
            return ((p / t) * 100).toFixed(1);
        });

        return {
            corr, prev, ratio: ratio.toFixed(1),
            chartData: {
                labels: months,
                datasets: [
                    {
                        label: '% Preventivo (Factor)',
                        data: monthlyRatio,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            insight: {
                trendMessage: ratio > 30 ? "Salud preventiva óptima" : "Alto volumen correctivo",
                isPositive: ratio > 30
            }
        };
    }, [filteredOts]);

    // 5. Eficiencia Operativa
    const KPI = useMemo(() => {
        let hechas = 0;
        let pendientes = 0;
        let totalHoras = 0;
        let conteoHoras = 0;
        let maxHoras = 0;

        const branchDelayMap: Record<string, { t: number, c: number, name: string }> = {};

        filteredOts.forEach(ot => {
            const isClosed = ot.estatus === 'Concluida' || ot.estatus === 'Finalizada';
            if (isClosed) hechas++;
            else if ((ot.estatus as any) !== 'Cancelada') pendientes++;

            if (isClosed && ot.fechas?.solicitada && ot.fechas?.concluida) {
                const s = new Date(ot.fechas.solicitada).getTime();
                const c = new Date(ot.fechas.concluida).getTime();
                const diffHours = (c - s) / (1000 * 60 * 60);

                if (diffHours > 0) {
                    totalHoras += diffHours;
                    conteoHoras++;
                    if (diffHours > maxHoras) maxHoras = diffHours;

                    if (ot.sucursalId) {
                        if (!branchDelayMap[ot.sucursalId]) {
                            const suc = sucursales.find(su => su.id === ot.sucursalId);
                            branchDelayMap[ot.sucursalId] = { t: 0, c: 0, name: suc?.nombre || ot.sucursalId };
                        }
                        branchDelayMap[ot.sucursalId].t += diffHours;
                        branchDelayMap[ot.sucursalId].c++;
                    }
                }
            }
        });

        const branchDelays = Object.values(branchDelayMap)
            .map(b => ({ name: b.name, avg: b.t / b.c }))
            .sort((a, b) => b.avg - a.avg)
            .slice(0, 5);

        return {
            hechas, pendientes,
            promedioHoras: conteoHoras > 0 ? (totalHoras / conteoHoras).toFixed(1) : '0',
            maximoHoras: maxHoras.toFixed(1),
            branchDelaysChart: {
                labels: branchDelays.map(b => b.name.length > 20 ? b.name.substring(0, 20) + '...' : b.name),
                datasets: [{
                    label: 'Horas',
                    data: branchDelays.map(b => b.avg.toFixed(1)),
                    backgroundColor: '#4f46e5',
                    indexAxis: 'y' as const
                }]
            },
            insight: {
                worstBranch: branchDelays.length > 0 ? branchDelays[0].name : 'N/A',
                worstAvg: branchDelays.length > 0 ? branchDelays[0].avg.toFixed(1) : '0',
                globalAvg: conteoHoras > 0 ? (totalHoras / conteoHoras).toFixed(1) : '0'
            }
        };
    }, [filteredOts, sucursales]);

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '60vh' }}>
            <div style={{ color: 'var(--primary)', fontWeight: '600' }}>Cargando Inteligencia Operativa...</div>
        </div>
    );

    return (
        <>
            <div className="animate-fade" style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>

                {/* ── SMART FILTER BAR (Ultra-Compact & Auto-Hide) ── */}
                <div style={{
                    position: 'sticky', top: 0, zIndex: 100,
                    transform: filtersVisible ? 'translateY(0)' : 'translateY(-110%)',
                    opacity: filtersVisible ? 1 : 0,
                    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                    pointerEvents: filtersVisible ? 'all' : 'none',
                    marginBottom: filtersVisible ? '-1rem' : '-64px',
                }}>
                    <div style={{
                        background: 'var(--bg-card)',
                        backdropFilter: 'blur(12px)',
                        borderBottom: '1px solid var(--glass-border)',
                        padding: '0.4rem 1.25rem', // Padding mínimo 
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, borderRight: '1px solid var(--glass-border)', paddingRight: '0.6rem' }}>
                            <Activity size={14} color="var(--primary)" />
                            <span style={{ fontWeight: '900', fontSize: '0.75rem', color: 'var(--text-main)' }}>BI DASHBOARD</span>
                        </div>

                        {/* Compact inputs */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--bg-input)', padding: '0.25rem 0.6rem', borderRadius: '8px' }}>
                            <Calendar size={12} color="var(--primary)" />
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.72rem', outline: 'none', width: '100px' }} />
                            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>→</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.72rem', outline: 'none', width: '100px' }} />
                        </div>

                        {[
                            { icon: <Building2 size={12} />, value: selectedFranquicia, setter: setSelectedFranquicia, options: [{ id: 'ALL', nombre: 'Franquicias' }, ...franquicias] },
                            { icon: <MapPin size={12} />, value: selectedSucursal, setter: setSelectedSucursal, options: [{ id: 'ALL', nombre: 'Sucursales' }, ...sucursales.filter(s => selectedFranquicia === 'ALL' || s.franquiciaId === selectedFranquicia)] },
                            { icon: <Filter size={12} />, value: selectedTipo, setter: setSelectedTipo, options: [{ id: 'ALL', nombre: 'Todos' }, { id: 'Correctivo', nombre: 'Correctivo' }, { id: 'Preventivo', nombre: 'Preventivo' }] }
                        ].map((f, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--bg-input)', padding: '0.25rem 0.6rem', borderRadius: '8px' }}>
                                <span style={{ color: 'var(--primary)' }}>{f.icon}</span>
                                <select value={f.value} onChange={e => f.setter(e.target.value)} style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.72rem', outline: 'none', maxWidth: '120px' }}>
                                    {f.options.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.nombre}</option>)}
                                </select>
                            </div>
                        ))}

                        <div style={{ flex: 1 }} />

                        <button
                            onClick={() => setPreviewReport({
                                startDate,
                                endDate,
                                data: { flujo: flujoData, estatus: estatusData, factor: factorMantenimiento, carga: cargaTecnicoData, kpi: KPI }
                            })}
                            style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', cursor: 'pointer' }}
                        >
                            VER REPORTE
                        </button>

                        <button onClick={() => setFiltersVisible(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                    </div>
                </div>

                {/* Floating pill: aparece cuando los filtros están ocultos */}
                <div style={{
                    position: 'fixed', top: '80px', right: '1.5rem', zIndex: 40,
                    transform: filtersVisible ? 'translateY(-60px)' : 'translateY(0)',
                    opacity: filtersVisible ? 0 : 1,
                    transition: 'transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease',
                    pointerEvents: filtersVisible ? 'none' : 'all',
                }}>
                    <button
                        onClick={() => { setFiltersVisible(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--primary)', color: 'white', border: 'none', padding: '0.45rem 0.9rem', borderRadius: '20px', fontWeight: '800', fontSize: '0.75rem', cursor: 'pointer', boxShadow: '0 4px 16px rgba(79,70,229,0.4)' }}
                    >
                        <Filter size={13} /> Filtros
                    </button>
                </div>

                {/* FLOW & STATUS ROW */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>

                    {/* 1. Dinámica de Flujo */}
                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Activity size={18} color="var(--primary)" /> Dinámica de Flujo de Trabajo
                            </h2>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Volumen diario de OTs Correctivas vs Preventivas & % Backlog</p>
                        </div>
                        <div style={{ height: '350px' }}>
                            <Chart
                                type='bar'
                                // @ts-ignore
                                data={flujoData}
                                options={{
                                    ...chartOptions,
                                    onClick: (_: any, elements: any[]) => {
                                        if (elements.length > 0) {
                                            const datasetIndex = elements[0].datasetIndex;
                                            const index = elements[0].index;
                                            if (datasetIndex === 0) return; // Ignore Line

                                            const dayClicked = index;
                                            const isCorrective = datasetIndex === 1;
                                            const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayClicked];

                                            const matchingOts = filteredOts.filter(ot => {
                                                if (!ot.fechas?.solicitada) return false;
                                                const openDay = new Date(ot.fechas.solicitada).getDay();
                                                const tipo = ot.tipo || 'Correctivo';
                                                return openDay === dayClicked && (isCorrective ? tipo === 'Correctivo' : tipo === 'Preventivo');
                                            });

                                            setDrillDown({
                                                title: `Extracción: Día ${dayName}`,
                                                subtitle: `Tipo de Orden: ${isCorrective ? 'Correctivas' : 'Preventivas'}`,
                                                orders: matchingOts
                                            });
                                        }
                                    },
                                    scales: {
                                        y: { stacked: true, ticks: { color: 'var(--text-muted)' } },
                                        y1: { type: 'linear', display: true, position: 'right', ticks: { color: 'var(--text-muted)' }, grid: { drawOnChartArea: false } },
                                        x: { stacked: true, ticks: { color: 'var(--text-muted)' } }
                                    }
                                }}
                            />
                        </div>
                        {flujoData.insight.peakVolume > 0 && (
                            <SmartInsight
                                title="PATRÓN DE INGRESO"
                                value={flujoData.insight.peakDayName}
                                insight={`Registra el mayor volumen de trabajo (${flujoData.insight.peakVolume} OTs). ${flujoData.insight.isWarning ? 'Pico de demanda inusual.' : 'Distribución estable.'}`}
                                isPositive={!flujoData.insight.isWarning}
                            />
                        )}
                    </div>

                    {/* 2. Estatus Reales */}
                    <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckCircle2 size={18} color="var(--primary)" /> Estatus de Órdenes (Global)
                            </h2>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Distribución real según el flujo operativo</p>
                        </div>

                        <div style={{ height: '240px', display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            <Doughnut
                                data={estatusData.chartData}
                                options={{
                                    ...chartOptions,
                                    cutout: '70%',
                                    maintainAspectRatio: false,
                                    onClick: (_: any, elements: any[]) => {
                                        if (elements.length > 0) {
                                            const index = elements[0].index;
                                            const statuses = ['Pendiente', 'Asignada', 'Llegada a Sitio', 'Iniciada', 'Concluida. Pendiente Firma Cliente', 'Concluida', 'Finalizada', 'Cancelada'];
                                            const clickedStatus = statuses[index];
                                            const matchingOts = filteredOts.filter(ot => (ot.estatus || 'Pendiente') === clickedStatus);
                                            setDrillDown({
                                                title: `Módulo: ${clickedStatus.toUpperCase()}`,
                                                subtitle: `Desglose de todas las órdenes estacionadas en este estado.`,
                                                orders: matchingOts
                                            });
                                        }
                                    }
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                            <div style={{ flex: 1, background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--status-concluida)' }}>FINALIZADO</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--status-concluida)' }}>{estatusData.finP}%</p>
                            </div>
                            <div style={{ flex: 1, background: 'rgba(79, 70, 229, 0.05)', border: '1px solid rgba(79, 70, 229, 0.2)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
                                <p style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--primary)' }}>EN PROCESO</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary)' }}>{estatusData.proP}%</p>
                            </div>
                        </div>
                        {estatusData.insight.maxInProgress > 0 && (
                            <SmartInsight
                                title="ANÁLISIS DE CUELLO DE BOTELLA"
                                value={estatusData.insight.bottleneckStatus.toUpperCase()}
                                insight={`Concentra el ${estatusData.insight.bottleneckP}% del volumen total (${estatusData.insight.maxInProgress} OTs retenidas aquí).`}
                                isPositive={false}
                            />
                        )}
                    </div>
                </div>

                {/* FACTOR DE MANTENIMIENTO DASHBOARD (NEW) */}
                <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'linear-gradient(135deg, var(--bg-card), rgba(16, 185, 129, 0.05))' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>
                        <div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Divide size={20} color="#10b981" /> Factor de Mantenimiento
                                </h2>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Salud del plan: Preventiva vs Correctiva</p>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>TOTAL CORRECTIVAS</span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#4f46e5' }}>{factorMantenimiento.corr}</span>
                                    </div>
                                </div>
                                <div style={{ background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)' }}>TOTAL PREVENTIVAS</span>
                                        <span style={{ fontSize: '1.5rem', fontWeight: '900', color: '#10b981' }}>{factorMantenimiento.prev}</span>
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)', textAlign: 'center' }}>
                                    <span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10b981' }}>{factorMantenimiento.ratio}%</span>
                                    <p style={{ fontSize: '0.7rem', fontWeight: '800', color: '#10b981', marginTop: '0.2rem' }}>MAINTENANCE FACTOR RATIO</p>
                                </div>
                            </div>

                            <SmartInsight
                                title="EVALUACIÓN ESTRATÉGICA"
                                value={factorMantenimiento.insight.trendMessage}
                                insight={factorMantenimiento.insight.isPositive ? 'La proporción preventiva ayuda a contener fallas mayores.' : 'Sugiere incrementar rondas preventivas para mitigar las correcciones de emergencia.'}
                                isPositive={factorMantenimiento.insight.isPositive}
                            />
                        </div>

                        <div style={{ height: '350px' }}>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-muted)' }}>Evolución del Factor (Tendencia Mensual)</h3>
                            <Line
                                data={factorMantenimiento.chartData}
                                options={{
                                    ...chartOptions,
                                    onClick: (_: any, elements: any[]) => {
                                        if (elements.length > 0) {
                                            const index = elements[0].index;
                                            const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                                            const matchingOts = filteredOts.filter(ot => {
                                                if (!ot.fechas?.solicitada || (ot.estatus as any) === 'Cancelada') return false;
                                                return new Date(ot.fechas.solicitada).getMonth() === index;
                                            });
                                            setDrillDown({
                                                title: `Análisis Mensual: ${months[index]}`,
                                                subtitle: `Todas las incidencias (Correctivas y Preventivas) registradas.`,
                                                orders: matchingOts
                                            });
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* BOTTOM ROW: TECHNICIAN LOAD & EFFICIENCY */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>

                    {/* 3. Carga por Técnico */}
                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Users size={18} color="var(--primary)" /> Carga por Técnico (Tipo de Orden)
                            </h2>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Distribución de trabajo activo por tipo</p>
                        </div>
                        <div style={{ height: '350px' }}>
                            <Bar
                                data={cargaTecnicoData}
                                options={{
                                    ...chartOptions,
                                    onClick: (_: any, elements: any[]) => {
                                        if (elements.length > 0) {
                                            const datasetIndex = elements[0].datasetIndex;
                                            const index = elements[0].index;
                                            const isCorrective = datasetIndex === 0;
                                            const techName = cargaTecnicoData.labels[index];
                                            const techId = tecnicos.find(t => t.nombre === techName)?.id || '';

                                            const matchingOts = filteredOts.filter(ot => {
                                                if (ot.tecnicoId !== techId || (ot.estatus as any) === 'Cancelada') return false;
                                                const tipo = ot.tipo || 'Correctivo';
                                                return isCorrective ? tipo === 'Correctivo' : tipo === 'Preventivo';
                                            });

                                            setDrillDown({
                                                title: `Asignaciones: ${techName}`,
                                                subtitle: `Carga activa de tipo: ${isCorrective ? 'Correctiva' : 'Preventiva'}`,
                                                orders: matchingOts
                                            });
                                        }
                                    },
                                    scales: {
                                        x: { stacked: true, ticks: { color: 'var(--text-muted)' } },
                                        y: { stacked: true, ticks: { color: 'var(--text-muted)' } }
                                    }
                                }}
                            />
                        </div>
                        {cargaTecnicoData.insight.maxActive > 0 && (
                            <SmartInsight
                                title="RIESGO DE SATURACIÓN"
                                value={cargaTecnicoData.insight.overloadedTech}
                                insight={cargaTecnicoData.insight.isOverloaded
                                    ? `Acumula ${cargaTecnicoData.insight.maxActive} OTs, excediendo el promedio del equipo en más del 50%.`
                                    : `Lidera la carga con ${cargaTecnicoData.insight.maxActive} OTs asigandas en equilibrio razonable.`}
                                isPositive={!cargaTecnicoData.insight.isOverloaded}
                            />
                        )}
                    </div>

                    {/* 4. Eficiencia Operativa */}
                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={18} color="var(--primary)" /> Eficiencia Operativa
                            </h2>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tiempos de resolución y respuesta</p>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
                                <p style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--text-main)' }}>{KPI.promedioHoras}h</p>
                                <p style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TIEMPO PROMEDIO</p>
                            </div>
                            <div style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
                                <p style={{ fontSize: '1.8rem', fontWeight: '900', color: '#ef4444' }}>{KPI.maximoHoras}h</p>
                                <p style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TIEMPO MÁXIMO</p>
                            </div>
                        </div>

                        <h3 style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '1rem' }}>SLA Impact per Branch (Top 5 Delays)</h3>
                        <div style={{ height: '200px' }}>
                            <Bar
                                data={KPI.branchDelaysChart}
                                options={{
                                    ...chartOptions,
                                    onClick: (_: any, elements: any[]) => {
                                        if (elements.length > 0) {
                                            const index = elements[0].index;
                                            const shortName = KPI.branchDelaysChart.labels[index];
                                            const suc = sucursales.find(s => s.nombre.startsWith(shortName.replace('...', '')) || shortName.startsWith(s.nombre));

                                            const matchingOts = filteredOts.filter(ot => {
                                                const isClosed = ot.estatus === 'Concluida' || ot.estatus === 'Finalizada';
                                                return ot.sucursalId === suc?.id && isClosed && ot.fechas?.solicitada && ot.fechas?.concluida;
                                            });

                                            setDrillDown({
                                                title: `Análisis de Retraso: ${suc?.nombre || shortName}`,
                                                subtitle: `Órdenes cerradas que conforman este promedio SLA.`,
                                                orders: matchingOts
                                            });
                                        }
                                    },
                                    indexAxis: 'y',
                                    plugins: { legend: { display: false } },
                                    scales: { x: { ticks: { color: 'var(--text-muted)' } }, y: { ticks: { color: 'var(--text-main)', font: { size: 10 } } } }
                                }}
                            />
                        </div>
                    </div>

                </div>

                {/* ═══════ ANÁLISIS DE TIEMPOS POR ROL Y PROCESO (Pendiente #4) ═══════ */}
                {(() => {
                    const tiemposRol = (() => {
                        const sums = { solicitudAsignacion: 0, asignacionLlegada: 0, llegadaCierre: 0, cierreFirma: 0 };
                        const counts = { solicitudAsignacion: 0, asignacionLlegada: 0, llegadaCierre: 0, cierreFirma: 0 };

                        filteredOts.forEach(ot => {
                            const f = ot.fechas;
                            if (!f?.solicitada) return;
                            const toMs = (d?: string) => d ? new Date(d).getTime() : null;
                            const toHrs = (a: number | null, b: number | null) => (a && b && b > a) ? (b - a) / 3600000 : null;

                            const sol = toMs(f.solicitada);
                            const asi = toMs(f.asignada);
                            const lle = toMs(f.llegada);
                            const con = toMs(f.concluida || f.concluidaTecnico);
                            const fin = toMs(f.finalizada);

                            const h1 = toHrs(sol, asi); if (h1 !== null) { sums.solicitudAsignacion += h1; counts.solicitudAsignacion++; }
                            const h2 = toHrs(asi, lle); if (h2 !== null) { sums.asignacionLlegada += h2; counts.asignacionLlegada++; }
                            const h3 = toHrs(lle, con); if (h3 !== null) { sums.llegadaCierre += h3; counts.llegadaCierre++; }
                            const h4 = toHrs(con, fin); if (h4 !== null) { sums.cierreFirma += h4; counts.cierreFirma++; }
                        });

                        const avg = (k: keyof typeof sums) => counts[k] > 0 ? parseFloat((sums[k] / counts[k]).toFixed(1)) : 0;
                        return {
                            solicitudAsignacion: avg('solicitudAsignacion'),
                            asignacionLlegada: avg('asignacionLlegada'),
                            llegadaCierre: avg('llegadaCierre'),
                            cierreFirma: avg('cierreFirma'),
                            counts
                        };
                    })();

                    const etapas = [
                        { label: 'Solicitud → Asignación', rol: 'Coordinador', val: tiemposRol.solicitudAsignacion, color: '#4f46e5', icon: '🎯', n: tiemposRol.counts.solicitudAsignacion, meta: 4, desc: 'Tiempo que tarda el Coordinador en asignar la OT.' },
                        { label: 'Asignación → Llegada a Sitio', rol: 'Técnico (Tránsito)', val: tiemposRol.asignacionLlegada, color: '#0ea5e9', icon: '🚗', n: tiemposRol.counts.asignacionLlegada, meta: 2, desc: 'Tiempo de tránsito del técnico al cliente.' },
                        { label: 'Llegada → Cierre Técnico', rol: 'Técnico (Campo)', val: tiemposRol.llegadaCierre, color: '#8b5cf6', icon: '🔧', n: tiemposRol.counts.llegadaCierre, meta: 3, desc: 'Tiempo real de ejecución técnica en sitio.' },
                        { label: 'Cierre Técnico → Finalización', rol: 'Supervisor', val: tiemposRol.cierreFirma, color: '#10b981', icon: '✅', n: tiemposRol.counts.cierreFirma, meta: 6, desc: 'Tiempo de revisión y autorización del Supervisor.' },
                    ];

                    const maxVal = Math.max(...etapas.map(e => e.val), 1);
                    const bottleneck = etapas.reduce((a, b) => b.val > a.val ? b : a, etapas[0]);
                    const totalCiclo = etapas.reduce((s, e) => s + e.val, 0);

                    return (
                        <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(139,92,246,0.25)', background: 'linear-gradient(135deg, var(--bg-card), rgba(139,92,246,0.04))' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.2rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Clock size={20} color="#8b5cf6" /> Análisis de Tiempos por Rol y Proceso
                                    </h2>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        Duración promedio por etapa del ciclo de vida · Basado en {filteredOts.filter(o => o.fechas?.asignada).length} OTs con datos completos
                                    </p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ciclo Total Promedio</p>
                                    <p style={{ fontSize: '2rem', fontWeight: '900', color: '#8b5cf6', lineHeight: 1 }}>{totalCiclo.toFixed(1)}h</p>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>solicitud → autorización</p>
                                </div>
                            </div>

                            {/* Barras horizontales por etapa */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                                {etapas.map((et, i) => (
                                    <div key={i}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '1.1rem' }}>{et.icon}</span>
                                                <div>
                                                    <p style={{ fontWeight: '800', fontSize: '0.85rem' }}>{et.label}</p>
                                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '600' }}>ROL: {et.rol} · {et.n} OTs medidas</p>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <span style={{ fontSize: '1.3rem', fontWeight: '900', color: et.val > et.meta ? '#ef4444' : et.color }}>{et.val > 0 ? `${et.val}h` : '-'}</span>
                                                {et.val === bottleneck.val && et.val > 0 && <span style={{ display: 'block', fontSize: '0.6rem', fontWeight: '800', color: '#ef4444', textTransform: 'uppercase' }}>⚠ CUELLO BOTELLA</span>}
                                            </div>
                                        </div>
                                        <div style={{ height: '10px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', width: `${maxVal > 0 ? (et.val / maxVal) * 100 : 0}%`,
                                                background: et.val === bottleneck.val && et.val > 0 ? 'linear-gradient(90deg,#ef4444,#f97316)' : `linear-gradient(90deg,${et.color},${et.color}99)`,
                                                borderRadius: '6px', transition: 'width 0.8s ease', boxShadow: `0 0 8px ${et.color}60`
                                            }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                                            <p style={{ fontSize: '0.67rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{et.desc}</p>
                                            <p style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>meta ≤ {et.meta}h</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Tarjetas de productividad por rol */}
                            <h3 style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Users size={13} /> Índice de Productividad por Rol
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                {etapas.map((r, i) => {
                                    const cumple = r.val > 0 && r.val <= r.meta;
                                    const pct = r.val > 0 ? Math.min((r.meta / r.val) * 100, 100) : 0;
                                    return (
                                        <div key={i} style={{
                                            background: r.val === 0 ? 'var(--bg-input)' : cumple ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                                            border: `1px solid ${r.val === 0 ? 'var(--glass-border)' : cumple ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.2)'}`,
                                            borderRadius: '14px', padding: '1rem'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ fontSize: '1.2rem' }}>{r.icon}</span>
                                                <span style={{ fontSize: '0.6rem', fontWeight: '800', color: r.val === 0 ? 'var(--text-muted)' : cumple ? '#10b981' : '#ef4444' }}>
                                                    {r.val === 0 ? 'SIN DATOS' : cumple ? '✓ META OK' : '✗ EXCEDE'}
                                                </span>
                                            </div>
                                            <p style={{ fontWeight: '800', fontSize: '0.8rem', marginBottom: '0.2rem' }}>{r.rol}</p>
                                            <p style={{ fontSize: '1.5rem', fontWeight: '900', color: r.color, lineHeight: 1 }}>{r.val > 0 ? `${r.val}h` : '—'}</p>
                                            <p style={{ fontSize: '0.63rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>meta ≤ {r.meta}h</p>
                                            {r.val > 0 && (
                                                <div style={{ height: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', marginTop: '0.6rem', overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${pct}%`, background: cumple ? '#10b981' : '#ef4444', borderRadius: '4px' }} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Smart Insight */}
                            {bottleneck.val > 0 && (
                                <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                    <div style={{ background: 'rgba(239,68,68,0.1)', padding: '0.5rem', borderRadius: '8px', color: '#ef4444', flexShrink: 0 }}><Sparkles size={16} /></div>
                                    <div>
                                        <p style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>INSIGHT · CUELLO DE BOTELLA DETECTADO</p>
                                        <p style={{ fontWeight: '800', color: 'var(--text-main)', marginTop: '0.2rem' }}>{bottleneck.label}</p>
                                        <p style={{ fontSize: '0.8rem', color: '#fca5a5', marginTop: '0.2rem' }}>
                                            La etapa <strong>"{bottleneck.rol}"</strong> consume en promedio <strong>{bottleneck.val}h</strong> — la más alta del proceso.
                                            Optimizarla puede reducir el ciclo total en hasta un <strong>{totalCiclo > 0 ? ((bottleneck.val / totalCiclo) * 100).toFixed(0) : 0}%</strong>.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* ═══════ PERÍODOS DE PRODUCTIVIDAD POR ROL (Pendiente #5) ═══════ */}
                {(() => {
                    // Para cada rol, calculamos: distribución por bloque de hora y por día de semana
                    type RolConfig = { label: string; icon: string; color: string; dateKey: keyof typeof filteredOts[0]['fechas']; rolName: string };
                    const roles: RolConfig[] = [
                        { label: 'Gerente', icon: '👔', color: '#F59E0B', dateKey: 'solicitada', rolName: 'Solicitud de OT' },
                        { label: 'Coordinador', icon: '🎯', color: '#4f46e5', dateKey: 'asignada', rolName: 'Asignación' },
                        { label: 'Técnico (Llegada)', icon: '🚗', color: '#0ea5e9', dateKey: 'llegada', rolName: 'Llegada a Sitio' },
                        { label: 'Técnico (Cierre)', icon: '🔧', color: '#8b5cf6', dateKey: 'concluida', rolName: 'Cierre Técnico' },
                        { label: 'Supervisor', icon: '✅', color: '#10b981', dateKey: 'finalizada', rolName: 'Autorización Final' },
                    ];

                    const bloques = ['🌙 00-06', '🌅 06-12', '☀️ 12-18', '🌆 18-24'];
                    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

                    const getRolStats = (dateKey: keyof typeof filteredOts[0]['fechas']) => {
                        const hourCounts = new Array(24).fill(0);
                        const dayCounts = new Array(7).fill(0);
                        let total = 0;

                        filteredOts.forEach(ot => {
                            const dateStr = ot.fechas?.[dateKey] as string | undefined;
                            if (!dateStr) return;
                            const d = new Date(dateStr);
                            if (isNaN(d.getTime())) return;
                            hourCounts[d.getHours()]++;
                            dayCounts[d.getDay()]++;
                            total++;
                        });

                        const bloqueCounts = [
                            hourCounts.slice(0, 6).reduce((a, b) => a + b, 0),
                            hourCounts.slice(6, 12).reduce((a, b) => a + b, 0),
                            hourCounts.slice(12, 18).reduce((a, b) => a + b, 0),
                            hourCounts.slice(18, 24).reduce((a, b) => a + b, 0),
                        ];

                        const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
                        const peakDay = dayCounts.indexOf(Math.max(...dayCounts));
                        const maxBloque = Math.max(...bloqueCounts, 1);
                        const maxDay = Math.max(...dayCounts, 1);

                        return { hourCounts, dayCounts, bloqueCounts, peakHour, peakDay, maxBloque, maxDay, total };
                    };

                    const allStats = roles.map(r => ({ ...r, stats: getRolStats(r.dateKey) }));
                    const anyData = allStats.some(r => r.stats.total > 0);

                    return (
                        <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(245,158,11,0.2)', background: 'linear-gradient(135deg, var(--bg-card), rgba(245,158,11,0.03))' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.2rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Activity size={20} color="#F59E0B" /> Períodos de Productividad por Rol
                                    </h2>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                        Ventanas de actividad real por rol · Detecta cobertura, picos y brechas operativas
                                    </p>
                                </div>
                                {!anyData && (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 1rem', background: 'var(--bg-input)', borderRadius: '10px' }}>
                                        ⚠ Sin OTs con datos de fechas en el período seleccionado
                                    </div>
                                )}
                            </div>

                            {/* Tabla principal: un rol por fila */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {allStats.map((rol, ri) => {
                                    const s = rol.stats;
                                    const peakHourLabel = s.peakHour < 12 ? `${s.peakHour}:00 AM` : s.peakHour === 12 ? '12:00 PM' : `${s.peakHour - 12}:00 PM`;
                                    const actBloqueIdx = s.bloqueCounts.indexOf(Math.max(...s.bloqueCounts));

                                    return (
                                        <div key={ri} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '1.25rem', borderLeft: `4px solid ${rol.color}` }}>
                                            {/* Rol header */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                                    <span style={{ fontSize: '1.3rem' }}>{rol.icon}</span>
                                                    <div>
                                                        <p style={{ fontWeight: '900', fontSize: '0.95rem', color: rol.color }}>{rol.label}</p>
                                                        <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '600' }}>Acción: {rol.rolName} · {s.total} registros</p>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                    {s.total > 0 && <>
                                                        <div style={{ textAlign: 'center', background: `${rol.color}18`, border: `1px solid ${rol.color}40`, borderRadius: '10px', padding: '0.4rem 0.8rem' }}>
                                                            <p style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hora Pico</p>
                                                            <p style={{ fontSize: '1rem', fontWeight: '900', color: rol.color }}>{peakHourLabel}</p>
                                                        </div>
                                                        <div style={{ textAlign: 'center', background: `${rol.color}18`, border: `1px solid ${rol.color}40`, borderRadius: '10px', padding: '0.4rem 0.8rem' }}>
                                                            <p style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Día Pico</p>
                                                            <p style={{ fontSize: '1rem', fontWeight: '900', color: rol.color }}>{dias[s.peakDay]}</p>
                                                        </div>
                                                        <div style={{ textAlign: 'center', background: '#10b98118', border: '1px solid #10b98140', borderRadius: '10px', padding: '0.4rem 0.8rem' }}>
                                                            <p style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Bloque Activo</p>
                                                            <p style={{ fontSize: '0.85rem', fontWeight: '900', color: '#10b981' }}>{bloques[actBloqueIdx]}</p>
                                                        </div>
                                                    </>}
                                                </div>
                                            </div>

                                            {s.total === 0 ? (
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>Sin datos en el período</p>
                                            ) : (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                                    {/* Bloques de hora */}
                                                    <div>
                                                        <p style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>Distribución por Bloque Horario</p>
                                                        {bloques.map((bl, bi) => {
                                                            const pct = s.maxBloque > 0 ? (s.bloqueCounts[bi] / s.maxBloque) * 100 : 0;
                                                            const isMax = bi === actBloqueIdx;
                                                            return (
                                                                <div key={bi} style={{ marginBottom: '0.5rem' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                                                        <span style={{ fontSize: '0.72rem', fontWeight: isMax ? '800' : '600', color: isMax ? rol.color : 'var(--text-muted)' }}>{bl}</span>
                                                                        <span style={{ fontSize: '0.72rem', fontWeight: '800', color: isMax ? rol.color : 'var(--text-muted)' }}>{s.bloqueCounts[bi]}</span>
                                                                    </div>
                                                                    <div style={{ height: '7px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                                                        <div style={{
                                                                            height: '100%', width: `${pct}%`,
                                                                            background: isMax ? `linear-gradient(90deg, ${rol.color}, ${rol.color}bb)` : 'rgba(255,255,255,0.15)',
                                                                            borderRadius: '4px', transition: 'width 0.6s ease',
                                                                            boxShadow: isMax ? `0 0 6px ${rol.color}80` : 'none'
                                                                        }} />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>

                                                    {/* Mini heatmap día de semana */}
                                                    <div>
                                                        <p style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>Actividad por Día de Semana</p>
                                                        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'flex-end', height: '56px' }}>
                                                            {dias.map((dia, di) => {
                                                                const pct = s.maxDay > 0 ? (s.dayCounts[di] / s.maxDay) : 0;
                                                                const isMax = di === s.peakDay;
                                                                return (
                                                                    <div key={di} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                                                                        <div style={{ width: '100%', height: `${Math.max(pct * 44, 4)}px`, borderRadius: '4px 4px 3px 3px', background: isMax ? rol.color : `${rol.color}40`, transition: 'height 0.5s ease', boxShadow: isMax ? `0 0 6px ${rol.color}60` : 'none' }} />
                                                                        <span style={{ fontSize: '0.6rem', fontWeight: isMax ? '800' : '500', color: isMax ? rol.color : 'var(--text-muted)' }}>{dia}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Tabla resumen de cobertura */}
                            {anyData && (
                                <div style={{ marginTop: '2rem', padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '14px' }}>
                                    <h3 style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <TrendingUp size={13} /> Tabla de Cobertura por Rol y Turno
                                    </h3>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.4rem', fontSize: '0.78rem' }}>
                                            <thead>
                                                <tr style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    <th style={{ textAlign: 'left', padding: '0.4rem 0.6rem' }}>Rol</th>
                                                    <th style={{ textAlign: 'center', padding: '0.4rem' }}>🌙 Madrugada</th>
                                                    <th style={{ textAlign: 'center', padding: '0.4rem' }}>🌅 Mañana</th>
                                                    <th style={{ textAlign: 'center', padding: '0.4rem' }}>☀️ Tarde</th>
                                                    <th style={{ textAlign: 'center', padding: '0.4rem' }}>🌆 Noche</th>
                                                    <th style={{ textAlign: 'center', padding: '0.4rem' }}>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {allStats.map((rol, ri) => {
                                                    const s = rol.stats;
                                                    return (
                                                        <tr key={ri} style={{ background: 'rgba(255,255,255,0.02)' }}>
                                                            <td style={{ padding: '0.5rem 0.6rem', fontWeight: '700', borderRadius: '8px 0 0 8px', borderLeft: `3px solid ${rol.color}` }}>
                                                                {rol.icon} {rol.label}
                                                            </td>
                                                            {s.bloqueCounts.map((cnt, bi) => {
                                                                const isMax = cnt === Math.max(...s.bloqueCounts) && cnt > 0;
                                                                return (
                                                                    <td key={bi} style={{ textAlign: 'center', padding: '0.5rem', fontWeight: isMax ? '900' : '500', color: isMax ? rol.color : cnt === 0 ? 'rgba(255,255,255,0.2)' : 'var(--text-muted)', background: isMax ? `${rol.color}15` : 'transparent' }}>
                                                                        {cnt > 0 ? cnt : '—'}
                                                                        {isMax && <span style={{ fontSize: '0.6rem', marginLeft: '0.2rem' }}>★</span>}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td style={{ textAlign: 'center', padding: '0.5rem', fontWeight: '800', color: 'var(--text-main)', borderRadius: '0 8px 8px 0' }}>{s.total}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <p style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginTop: '0.75rem', fontStyle: 'italic' }}>★ = bloque horario de mayor actividad para ese rol. Útil para planificar guardias y reforzar turnos.</p>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div> {/* end of animate-fade div */}

            {/* Drill Down Modal: Movido fuera para evitar conflictos de posicionamiento */}
            {drillDown && (
                <BIDrillDownModal
                    isOpen={true}
                    onClose={() => setDrillDown(null)}
                    title={drillDown.title}
                    subtitle={drillDown.subtitle}
                    orders={drillDown.orders}
                />
            )}

            {previewReport && (
                <PrintableExecutiveReport
                    startDate={previewReport.startDate}
                    endDate={previewReport.endDate}
                    data={previewReport.data}
                    onClose={() => setPreviewReport(null)}
                    onExportPdf={() => generateExecutiveReport(previewReport.startDate, previewReport.endDate, previewReport.data)}
                />
            )}
        </>
    );
};
