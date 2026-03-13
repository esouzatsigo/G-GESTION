import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
    X, Filter, CheckCircle, ChevronRight, ChevronUp, ChevronDown,
    Search, Zap, Save, Loader2, AlertTriangle, GripVertical,
    Calendar
} from 'lucide-react';
import type { Equipo, Sucursal, User, MassiveAssignment } from '../types';
import { createMassivePreventiveOTsV2, getExistingOTsForEvent, type PreventivoPlanEntry } from '../services/dataService';
import { useNotification } from '../context/NotificationContext';

const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const FAMILIA_ICONS: Record<string, string> = {
    'Aires': '🌀',
    'Coccion': '🍳',
    'Refrigeracion': '❄️',
    'Cocina': '🍳',
    'Restaurante': '🍽️',
    'Local': '🏪',
    'Agua': '🚰',
    'Generadores': '⚡',
};

interface FamilyGroup {
    familia: string;
    equipos: Equipo[];
    selected: boolean;
    priority: number; // Lower = higher priority
}

/** Slot = Combinación  Técnico + Día */
interface DistributionSlot {
    tecnicoId: string;
    tecnicoNombre: string;
    tecnicoRol: string;
    dia: number;
    mes: number;
    equipos: Equipo[];
}

interface Props {
    evento: PreventivoPlanEntry;
    equipos: Equipo[];
    sucursales: Sucursal[];
    allTecnicos: User[];
    user: User;
    preSelectedTecnicoId?: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const MassiveOTWizard: React.FC<Props> = ({
    evento, equipos, sucursales, allTecnicos, user, preSelectedTecnicoId, onClose, onSuccess
}) => {
    const { showNotification } = useNotification();
    const sucursal = sucursales.find(s => s.id === evento.sucursalId);

    // --- State ---
    const [step, setStep] = useState(1);
    const [existingEqIds, setExistingEqIds] = useState<string[]>([]);
    const [loadingExisting, setLoadingExisting] = useState(true);

    // Step 2: Family-based selection
    const [familyGroups, setFamilyGroups] = useState<FamilyGroup[]>([]);
    const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());
    const [searchFilter, setSearchFilter] = useState('');

    // Step 3: Distribution
    const [selectedDays, setSelectedDays] = useState<number[]>([]);
    const [selectedTecnicos, setSelectedTecnicos] = useState<string[]>([]);
    const [distributionSlots, setDistributionSlots] = useState<DistributionSlot[]>([]);
    const [draggedItem, setDraggedItem] = useState<{ type: 'familia' | 'equipo'; id: string; sourceSlotIdx: number } | null>(null);
    const [draggedFamilyIdx, setDraggedFamilyIdx] = useState<number | null>(null);

    // Step 4: Generating
    const [isGenerating, setIsGenerating] = useState(false);

    // --- Equipment for this branch ---
    const branchEquipos = useMemo(() =>
        equipos.filter(e => e.sucursalId === evento.sucursalId),
        [equipos, evento.sucursalId]
    );

    // --- AUTO-SCROLL DURANTE DRAG & DROP ---
    const boardScrollRef = useRef<HTMLDivElement>(null);
    const bodyScrollRef = useRef<HTMLDivElement>(null);
    const [dragMouseY, setDragMouseY] = useState<number | null>(null);

    useEffect(() => {
        if (!draggedItem) {
            setDragMouseY(null);
            return;
        }

        const scrollIncrement = 15;
        const interval = setInterval(() => {
            if (dragMouseY === null) return;

            // 1. Scroll del Body principal del Modal
            if (bodyScrollRef.current) {
                const rect = bodyScrollRef.current.getBoundingClientRect();
                const relativeY = dragMouseY - rect.top;
                const threshold = 60;
                if (relativeY < threshold) bodyScrollRef.current.scrollTop -= scrollIncrement;
                else if (relativeY > rect.height - threshold) bodyScrollRef.current.scrollTop += scrollIncrement;
            }

            // 2. Scroll del Tablero de Distribución
            if (boardScrollRef.current) {
                const rect = boardScrollRef.current.getBoundingClientRect();
                if (dragMouseY > rect.top && dragMouseY < rect.bottom) {
                    const relativeY = dragMouseY - rect.top;
                    const threshold = 40;
                    if (relativeY < threshold) boardScrollRef.current.scrollTop -= scrollIncrement;
                    else if (relativeY > rect.height - threshold) boardScrollRef.current.scrollTop += scrollIncrement;
                }
            }
        }, 50);

        return () => clearInterval(interval);
    }, [draggedItem, dragMouseY]);

    // --- Helpers ---
    const normalize = (s: string | undefined) => s?.trim().toLowerCase() || '';
    const parseDaysFromEvent = (fechas: string): number[] => {
        const lower = fechas.trim().toLowerCase();
        if (lower === 'mañana' || lower === 'manana') {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return [tomorrow.getDate()];
        }

        if (fechas.includes('-')) {
            const [start, end] = fechas.split('-').map(s => parseInt(s.trim()));
            if (!isNaN(start) && !isNaN(end)) {
                return Array.from({ length: end - start + 1 }, (_, i) => start + i);
            }
        }
        const single = parseInt(fechas.trim());
        return isNaN(single) ? [] : [single];
    };

    // --- Initialize on mount ---
    useEffect(() => {
        const init = async () => {
            setLoadingExisting(true);
            try {
                const existing = await getExistingOTsForEvent(evento.id, user);
                setExistingEqIds(existing);
            } catch { /* silent */ }
            setLoadingExisting(false);

            // Build family groups
            const familyMap = new Map<string, Equipo[]>();
            branchEquipos.forEach(eq => {
                const arr = familyMap.get(eq.familia) || [];
                arr.push(eq);
                familyMap.set(eq.familia, arr);
            });

            const groups: FamilyGroup[] = [];
            let priority = 0;
            familyMap.forEach((eqs, familia) => {
                groups.push({ familia, equipos: eqs, selected: true, priority: priority++ });
            });
            setFamilyGroups(groups);

            // Parse days from event
            const parsedDays = parseDaysFromEvent(evento.fechas);
            setSelectedDays(parsedDays);

            // Si viene un técnico pre-seleccionado (desde el Drag & Drop del Panel), auto-seleccionarlo
            if (preSelectedTecnicoId) {
                setSelectedTecnicos([preSelectedTecnicoId]);
            }
        };
        init();
    }, [evento, branchEquipos, preSelectedTecnicoId]);

    // All selected equipment (respecting family selection and excluding existing)
    const selectedEquipos = useMemo(() => {
        const result: Equipo[] = [];
        familyGroups
            .filter(g => g.selected)
            .sort((a, b) => a.priority - b.priority)
            .forEach(g => {
                g.equipos.forEach(eq => {
                    if (!existingEqIds.includes(eq.id)) {
                        result.push(eq);
                    }
                });
            });
        return result;
    }, [familyGroups, existingEqIds]);

    // Technicians for this branch
    const branchTecnicos = useMemo(() => {
        const internos = allTecnicos.filter(t =>
            (t.rol === 'Tecnico' || t.rol === 'ROL_TECNICO') && t.sucursalesPermitidas?.includes(evento.sucursalId)
        );
        const externos = allTecnicos.filter(t => t.rol === 'TecnicoExterno' || t.rol === 'ROL_TECNICO_EXTERNO');
        return { internos, externos };
    }, [allTecnicos, evento.sucursalId]);

    // --- Family Operations ---
    const toggleFamily = (familia: string) => {
        setFamilyGroups(prev => prev.map(g =>
            g.familia === familia ? { ...g, selected: !g.selected } : g
        ));
    };

    const moveFamilyPriority = (familia: string, direction: 'up' | 'down') => {
        setFamilyGroups(prev => {
            const sorted = [...prev].sort((a, b) => a.priority - b.priority);
            const idx = sorted.findIndex(g => g.familia === familia);
            if (idx < 0) return prev;
            const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= sorted.length) return prev;

            // Swap priorities
            const temp = sorted[idx].priority;
            sorted[idx] = { ...sorted[idx], priority: sorted[swapIdx].priority };
            sorted[swapIdx] = { ...sorted[swapIdx], priority: temp };
            return sorted;
        });
    };

    const toggleExpandFamily = (familia: string) => {
        setExpandedFamilies(prev => {
            const next = new Set(prev);
            next.has(familia) ? next.delete(familia) : next.add(familia);
            return next;
        });
    };

    // --- Family Reordering (Step 2) ---
    const handleFamilyDragStart = (idx: number) => {
        setDraggedFamilyIdx(idx);
    };

    const handleFamilyDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleFamilyDrop = (targetIdx: number) => {
        if (draggedFamilyIdx === null || draggedFamilyIdx === targetIdx) return;

        setFamilyGroups(prev => {
            const sorted = [...prev].sort((a, b) => a.priority - b.priority);
            const newOrder = [...sorted];
            const [moved] = newOrder.splice(draggedFamilyIdx, 1);
            newOrder.splice(targetIdx, 0, moved);

            // Re-assign priorities based on new order
            return newOrder.map((g, i) => ({ ...g, priority: i }));
        });
        setDraggedFamilyIdx(null);
    };

    // --- Auto-Distribute Algorithm (Round-Robin with Family Priority) ---
    const autoDistribute = useCallback(() => {
        if (selectedDays.length === 0 || selectedTecnicos.length === 0) return;

        const selectedTecObjs = selectedTecnicos.map(id => allTecnicos.find(t => t.id === id)!).filter(Boolean);

        // Build empty slots (all days × all selected technicians)
        const slots: DistributionSlot[] = [];
        selectedDays.forEach(dia => {
            selectedTecObjs.forEach(tec => {
                slots.push({
                    tecnicoId: tec.id,
                    tecnicoNombre: tec.nombre,
                    tecnicoRol: tec.rol,
                    dia,
                    mes: evento.mes,
                    equipos: [],
                });
            });
        });

        // Distribute equipment 
        const equiposCopy = [...selectedEquipos];
        const assignedEqIds = new Set<string>();

        // 1. Assign strictly by specialty to technicians who HAVE one
        equiposCopy.forEach(eq => {
            const normalizedFam = normalize(eq.familia);
            // Find all selected technicians that have this specialty
            const matchingTecs = selectedTecObjs.filter(t => normalize(t.especialidad) === normalizedFam);

            if (matchingTecs.length > 0) {
                // Find slots for these technicians
                const matchingSlots = slots.filter(s => matchingTecs.some(t => t.id === s.tecnicoId));
                if (matchingSlots.length > 0) {
                    // Use round-robin distribution among matching slots
                    const eqIdx = equiposCopy.indexOf(eq);
                    const rbSlot = matchingSlots[eqIdx % matchingSlots.length];
                    rbSlot.equipos.push(eq);
                    assignedEqIds.add(eq.id);
                }
            }
        });

        // 2. Distribute remaining equipment to available technicians (avoiding specialty mismatch)
        const remainingEquipos = equiposCopy.filter(eq => !assignedEqIds.has(eq.id));
        const availableSlots = slots.filter(s => {
            const tec = selectedTecObjs.find(t => t.id === s.tecnicoId);
            // Anyone without a specialty can take anything. 
            // Specialists are restricted to their specialty.
            return !tec?.especialidad;
        });

        if (availableSlots.length > 0) {
            remainingEquipos.forEach((eq, index) => {
                const rbSlot = availableSlots[index % availableSlots.length];
                rbSlot.equipos.push(eq);
                assignedEqIds.add(eq.id);
            });
        }

        // Filter out empty slots
        setDistributionSlots(slots.filter(s => s.equipos.length > 0));
    }, [selectedDays, selectedTecnicos, selectedEquipos, allTecnicos, evento.mes]);

    // --- Drag & Drop ---
    const handleDragStart = (type: 'familia' | 'equipo', id: string, sourceSlotIdx: number) => {
        setDraggedItem({ type, id, sourceSlotIdx });
    };

    const handleDrop = (targetSlotIdx: number) => {
        if (!draggedItem) return;

        setDistributionSlots(prev => {
            const next = prev.map(s => ({ ...s, equipos: [...s.equipos] }));
            const source = next[draggedItem.sourceSlotIdx];
            const target = next[targetSlotIdx];
            if (!source || !target) return prev;

            const targetTec = allTecnicos.find(t => t.id === target.tecnicoId);
            const targetTecSpec = normalize(targetTec?.especialidad);

            if (draggedItem.type === 'familia') {
                // --- BUSINESS RULE CHECK FOR FAMILIES ---
                const draggedFam = normalize(draggedItem.id);

                if (targetTecSpec && targetTecSpec !== draggedFam) {
                    showNotification(
                        `❌ Regla de Negocio: ${targetTec?.nombre} tiene especialidad en ${targetTec?.especialidad}. NO puede recibir equipos de la familia ${draggedItem.id}.`,
                        "error"
                    );
                    return prev;
                }

                // Move entire family
                const equiposToMove = source.equipos.filter(e => e.familia === draggedItem.id);
                source.equipos = source.equipos.filter(e => e.familia !== draggedItem.id);
                target.equipos = [...target.equipos, ...equiposToMove];
            } else {
                // Move single equipment
                const eqIdx = source.equipos.findIndex(e => e.id === draggedItem.id);
                if (eqIdx >= 0) {
                    const eq = source.equipos[eqIdx];

                    // --- BUSINESS RULE CHECK FOR SINGLE EQUIPMENT ---
                    const eqFam = normalize(eq.familia);

                    if (targetTecSpec && targetTecSpec !== eqFam) {
                        showNotification(
                            `❌ Regla de Negocio: ${targetTec?.nombre} tiene especialidad en ${targetTec?.especialidad}. NO puede recibir este equipo de familia ${eq.familia}.`,
                            "error"
                        );
                        return prev;
                    }

                    const [removedEq] = source.equipos.splice(eqIdx, 1);
                    target.equipos.push(removedEq);
                }
            }

            return next.filter(s => s.equipos.length > 0);
        });
        setDraggedItem(null);
    };

    // --- Generate OTs ---
    const handleGenerate = async () => {
        if (!sucursal || !user) return;
        setIsGenerating(true);

        try {
            const assignments: MassiveAssignment[] = [];
            distributionSlots.forEach(slot => {
                slot.equipos.forEach(eq => {
                    assignments.push({
                        equipoId: eq.id,
                        tecnicoId: slot.tecnicoId,
                        fechaProgramada: new Date(2026, slot.mes, slot.dia).toISOString(),
                        familiaEquipo: eq.familia,
                    });
                });
            });

            await createMassivePreventiveOTsV2(evento, assignments, sucursal, user);
            showNotification(`✅ ${assignments.length} OTs preventivas generadas exitosamente.`, "success");
            onSuccess();
            onClose();
        } catch (e) {
            showNotification("Error al generar órdenes masivas.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- Total equipment in distribution ---
    const totalInDistribution = distributionSlots.reduce((acc, s) => acc + s.equipos.length, 0);

    // ═══════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════
    return (
        <div className="modal-overlay" style={{ zIndex: 200000 }}>
            <div className="glass-card modal-content animate-scale-up" style={{ maxWidth: '860px', width: '95%', padding: '0', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

                {/* Progress Bar */}
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', width: '100%', flexShrink: 0 }}>
                    <div style={{ height: '100%', background: 'var(--primary)', width: `${(step / 4) * 100}%`, transition: 'all 0.4s' }} />
                </div>

                {/* Header */}
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ fontWeight: '900', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <Zap size={22} className="text-primary" />
                                Despacho Masivo de OTs
                            </h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                {evento.txtPDF} • {MESES[evento.mes]} {evento.fechas}, 2026
                            </p>
                        </div>
                        <button onClick={onClose} className="hover:text-primary transition-colors" style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={24} /></button>
                    </div>

                    {/* Step Indicators */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        {['Filtros', 'Selección', 'Distribución', 'Confirmar'].map((label, i) => (
                            <div key={i} style={{
                                flex: 1, textAlign: 'center', padding: '0.4rem', borderRadius: '8px', fontSize: '0.65rem', fontWeight: '800',
                                background: step > i + 1 ? 'rgba(34, 197, 94, 0.1)' : step === i + 1 ? 'rgba(var(--primary-rgb), 0.15)' : 'rgba(255,255,255,0.02)',
                                color: step > i + 1 ? '#22c55e' : step === i + 1 ? 'var(--primary)' : 'var(--text-muted)',
                                border: `1px solid ${step === i + 1 ? 'var(--primary)' : 'transparent'}`,
                            }}>
                                {step > i + 1 ? '✓ ' : ''}{label}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Body — Scrollable */}
                <div
                    ref={bodyScrollRef}
                    style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1 }}
                    className="custom-scrollbar"
                    onDragOver={(e) => {
                        e.preventDefault();
                        if (draggedItem) setDragMouseY(e.clientY);
                    }}
                >

                    {/* ════════ STEP 1: Filters ════════ */}
                    {step === 1 && (
                        <div>
                            <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '12px' }}>
                                <Filter size={18} color="var(--primary)" />
                                <p style={{ fontSize: '0.8rem', fontWeight: '700' }}>Paso 1: Contexto del Evento Preventivo</p>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                                    <p style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Sucursal</p>
                                    <p style={{ fontWeight: '800', fontSize: '1rem' }}>{sucursal?.nombre || evento.txtPDF}</p>
                                </div>
                                <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                                    <p style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Fecha(s) Programada(s)</p>
                                    <p style={{ fontWeight: '800', fontSize: '1rem' }}>{MESES[evento.mes]} {evento.fechas}, 2026</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                                    <p style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Equipos en Sucursal</p>
                                    <p style={{ fontWeight: '800', fontSize: '1.5rem', color: 'var(--primary)' }}>{branchEquipos.length}</p>
                                </div>
                                <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                                    <p style={{ fontSize: '0.6rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Ya con OT Generada</p>
                                    <p style={{ fontWeight: '800', fontSize: '1.5rem', color: existingEqIds.length > 0 ? '#F59E0B' : '#22c55e' }}>
                                        {loadingExisting ? '...' : existingEqIds.length}
                                    </p>
                                </div>
                            </div>

                            {existingEqIds.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.75rem', padding: '1rem', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', marginBottom: '1.5rem' }}>
                                    <AlertTriangle size={18} color="#F59E0B" style={{ flexShrink: 0, marginTop: 2 }} />
                                    <p style={{ fontSize: '0.8rem', color: '#F59E0B' }}>
                                        <strong>{existingEqIds.length} equipo(s)</strong> ya tienen OT generada para este evento. No se duplicarán.
                                    </p>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button className="btn btn-primary" onClick={() => setStep(2)} disabled={loadingExisting}>
                                    Seleccionar Equipos <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ════════ STEP 2: Family-based Selection ════════ */}
                    {step === 2 && (
                        <div>
                            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '12px' }}>
                                <CheckCircle size={18} color="var(--primary)" />
                                <div>
                                    <p style={{ fontSize: '0.8rem', fontWeight: '700' }}>Paso 2: Selección por Familia y Prioridad</p>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Ordena las familias con ▲▼. Las de arriba se programan primero.</p>
                                </div>
                            </div>

                            {/* Search */}
                            <div style={{ position: 'relative', marginBottom: '1rem' }}>
                                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                <input
                                    type="text" placeholder="Buscar equipo por nombre..."
                                    value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.2rem', borderRadius: '10px', background: 'var(--bg-input)', border: '1px solid var(--glass-border)', color: 'white', fontFamily: 'inherit' }}
                                />
                            </div>

                            {/* Family Groups */}
                            <div className="custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '42vh', overflowY: 'auto', padding: '0.5rem' }}>
                                {familyGroups.sort((a, b) => a.priority - b.priority).map((group, gIdx) => {
                                    const availableEquipos = group.equipos.filter(eq =>
                                        !existingEqIds.includes(eq.id) &&
                                        (searchFilter === '' || eq.nombre.toLowerCase().includes(searchFilter.toLowerCase()))
                                    );
                                    const existingCount = group.equipos.filter(eq => existingEqIds.includes(eq.id)).length;
                                    const isExpanded = expandedFamilies.has(group.familia);
                                    const isDragging = draggedFamilyIdx === gIdx;

                                    return (
                                        <div
                                            key={group.familia}
                                            draggable
                                            onDragStart={() => handleFamilyDragStart(gIdx)}
                                            onDragOver={handleFamilyDragOver}
                                            onDrop={() => handleFamilyDrop(gIdx)}
                                            onDragEnd={() => setDraggedFamilyIdx(null)}
                                            style={{
                                                borderRadius: '16px',
                                                border: `1.5px solid ${isDragging ? 'var(--primary)' : group.selected ? 'var(--primary)' : 'var(--glass-border)'}`,
                                                background: isDragging ? 'rgba(var(--primary-rgb), 0.1)' : group.selected ? 'rgba(var(--primary-rgb), 0.06)' : 'rgba(255,255,255,0.03)',
                                                overflow: 'hidden',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                flexShrink: 0,
                                                opacity: isDragging ? 0.4 : 1,
                                                transform: isDragging ? 'scale(0.98)' : 'scale(1)',
                                                cursor: 'grab'
                                            }}
                                            className="family-panel-hover"
                                        >
                                            {/* Family Header */}
                                            <div style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.25rem', gap: '0.9rem' }}>
                                                {/* Drag handle icon */}
                                                <GripVertical size={18} style={{ color: 'var(--text-muted)', cursor: 'grab', opacity: 0.6 }} />

                                                {/* Checkbox */}
                                                <div
                                                    onClick={() => toggleFamily(group.familia)}
                                                    style={{
                                                        width: '24px', height: '24px', borderRadius: '7px', cursor: 'pointer',
                                                        border: `2px solid ${group.selected ? 'var(--primary)' : 'var(--glass-border)'}`,
                                                        background: group.selected ? 'var(--primary)' : 'transparent',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {group.selected && <CheckCircle size={15} color="white" />}
                                                </div>

                                                {/* Icon + Name */}
                                                <span style={{ fontSize: '1.25rem' }}>{FAMILIA_ICONS[group.familia] || '🔧'}</span>
                                                <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => toggleExpandFamily(group.familia)}>
                                                    <span style={{ fontWeight: '850', fontSize: '1rem', letterSpacing: '-0.01em' }}>{group.familia}</span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.75rem', fontWeight: '500' }}>
                                                        ({availableEquipos.length} disponibles{existingCount > 0 ? `, ${existingCount} con OT` : ''})
                                                    </span>
                                                </div>

                                                {/* Priority arrows (Optional if drag is implemented, but kept for accessibility/precision) */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                                        <button disabled={gIdx === 0} onClick={(e) => { e.stopPropagation(); moveFamilyPriority(group.familia, 'up'); }}
                                                            style={{ background: 'none', border: 'none', color: gIdx === 0 ? 'rgba(255,255,255,0.1)' : 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}>
                                                            <ChevronUp size={16} />
                                                        </button>
                                                        <button disabled={gIdx === familyGroups.length - 1} onClick={(e) => { e.stopPropagation(); moveFamilyPriority(group.familia, 'down'); }}
                                                            style={{ background: 'none', border: 'none', color: gIdx === familyGroups.length - 1 ? 'rgba(255,255,255,0.1)' : 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}>
                                                            <ChevronDown size={16} />
                                                        </button>
                                                    </div>

                                                    {/* Expand */}
                                                    <button onClick={(e) => { e.stopPropagation(); toggleExpandFamily(group.familia); }}
                                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px' }}>
                                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Equipment List (expanded) */}
                                            {isExpanded && (
                                                <div style={{ padding: '0.5rem 1.25rem 1.25rem 4.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(0,0,0,0.1)' }}>
                                                    {group.equipos.map(eq => {
                                                        const isExisting = existingEqIds.includes(eq.id);
                                                        const matchesSearch = searchFilter === '' || eq.nombre.toLowerCase().includes(searchFilter.toLowerCase());
                                                        if (!matchesSearch) return null;
                                                        return (
                                                            <div key={eq.id} style={{
                                                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                                padding: '0.5rem 0.85rem', borderRadius: '10px',
                                                                background: isExisting ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255,255,255,0.02)',
                                                                border: '1px solid var(--glass-border)',
                                                                opacity: isExisting ? 0.6 : 1,
                                                            }}>
                                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isExisting ? '#ef4444' : '#22c55e', boxShadow: isExisting ? '0 0 8px rgba(239,68,68,0.4)' : '0 0 8px rgba(34,197,94,0.4)' }} />
                                                                <span style={{ fontSize: '0.85rem', flex: 1, fontWeight: '600' }}>{eq.nombre}</span>
                                                                {isExisting && <span style={{ fontSize: '0.65rem', color: '#f87171', fontWeight: '800', textTransform: 'uppercase' }}>Ya en OT</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Summary bar */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    <strong style={{ color: 'var(--primary)' }}>{selectedEquipos.length}</strong> equipos seleccionados de <strong>{familyGroups.filter(g => g.selected).length}</strong> familias
                                </span>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn" onClick={() => setStep(1)}>Atrás</button>
                                    <button className="btn btn-primary" onClick={() => setStep(3)} disabled={selectedEquipos.length === 0}>
                                        Distribución ({selectedEquipos.length}) <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ════════ STEP 3: Distribution ════════ */}
                    {step === 3 && (
                        <div>
                            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: '12px' }}>
                                <Calendar size={18} color="var(--primary)" />
                                <div>
                                    <p style={{ fontSize: '0.8rem', fontWeight: '700' }}>Paso 3: Distribución Multi-Técnico / Multi-Día</p>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Selecciona técnicos y días, luego auto-distribuye o arrastra manualmente.</p>
                                </div>
                            </div>

                            {/* Days Configuration */}
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                                    📅 Días de Trabajo
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {selectedDays.map(day => (
                                        <div key={day} style={{
                                            padding: '0.5rem 1rem', borderRadius: '10px', fontWeight: '800', fontSize: '0.85rem',
                                            background: 'rgba(var(--primary-rgb), 0.15)', color: 'var(--primary)',
                                            border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        }}>
                                            {day} {MESES[evento.mes].substring(0, 3)}
                                            {selectedDays.length > 1 && (
                                                <button onClick={() => setSelectedDays(prev => prev.filter(d => d !== day))}
                                                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                                            )}
                                        </div>
                                    ))}
                                    <button onClick={() => {
                                        const maxDay = Math.max(...selectedDays);
                                        setSelectedDays(prev => [...prev, maxDay + 1]);
                                    }}
                                        style={{
                                            padding: '0.5rem 1rem', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '700',
                                            background: 'transparent', color: 'var(--text-muted)', border: '1px dashed var(--glass-border)', cursor: 'pointer',
                                        }}>
                                        + Día
                                    </button>
                                </div>
                            </div>

                            {/* Technicians Selection */}
                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                                    👥 Técnicos Internos
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                                    {branchTecnicos.internos.length === 0 && (
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem 1rem' }}>No hay técnicos internos vinculados a esta sucursal.</p>
                                    )}
                                    {branchTecnicos.internos.map(tec => (
                                        <div key={tec.id} onClick={() => setSelectedTecnicos(prev =>
                                            prev.includes(tec.id) ? prev.filter(id => id !== tec.id) : [...prev, tec.id]
                                        )} style={{
                                            padding: '0.75rem 1rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                            background: selectedTecnicos.includes(tec.id) ? 'rgba(var(--primary-rgb), 0.1)' : 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${selectedTecnicos.includes(tec.id) ? 'var(--primary)' : 'var(--glass-border)'}`, transition: 'all 0.2s',
                                        }}>
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>👤</div>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontWeight: '800', fontSize: '0.85rem' }}>{tec.nombre}</p>
                                                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Técnico Interno</p>
                                            </div>
                                            {selectedTecnicos.includes(tec.id) && <CheckCircle size={18} color="var(--primary)" />}
                                        </div>
                                    ))}
                                </div>

                                {branchTecnicos.externos.length > 0 && (
                                    <>
                                        <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                                            👥 Técnicos Externos (Especialistas)
                                        </label>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                            {branchTecnicos.externos.map(tec => (
                                                <div key={tec.id} onClick={() => setSelectedTecnicos(prev =>
                                                    prev.includes(tec.id) ? prev.filter(id => id !== tec.id) : [...prev, tec.id]
                                                )} style={{
                                                    padding: '0.75rem 1rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                    background: selectedTecnicos.includes(tec.id) ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.03)',
                                                    border: `1px solid ${selectedTecnicos.includes(tec.id) ? '#F59E0B' : 'var(--glass-border)'}`, transition: 'all 0.2s',
                                                }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>🔧</div>
                                                    <div style={{ flex: 1 }}>
                                                        <p style={{ fontWeight: '800', fontSize: '0.85rem' }}>{tec.nombre}</p>
                                                        <p style={{ fontSize: '0.6rem', color: '#F59E0B' }}>{FAMILIA_ICONS[tec.especialidad || ''] || '🔧'} {tec.especialidad || 'Sin especialidad'}</p>
                                                    </div>
                                                    {selectedTecnicos.includes(tec.id) && <CheckCircle size={18} color="#F59E0B" />}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Auto-Distribute Button */}
                            {selectedTecnicos.length > 0 && selectedDays.length > 0 && (
                                <button onClick={autoDistribute} className="btn btn-primary" style={{ width: '100%', marginBottom: '1.25rem', padding: '0.85rem', fontSize: '0.9rem' }}>
                                    <Zap size={18} /> ⚡ AUTO-DISTRIBUIR ({selectedEquipos.length} equipos → {selectedTecnicos.length} técnicos × {selectedDays.length} días)
                                </button>
                            )}

                            {/* Distribution Board */}
                            {distributionSlots.length > 0 && (
                                <div>
                                    <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>
                                        📋 Tablero de Distribución — Arrastra familias o equipos entre columnas
                                    </label>
                                    <div
                                        ref={boardScrollRef}
                                        className="custom-scrollbar"
                                        style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(distributionSlots.length, 3)}, 1fr)`, gap: '0.75rem', maxHeight: '55vh', overflowY: 'auto', paddingRight: '0.5rem' }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            if (draggedItem) setDragMouseY(e.clientY);
                                        }}
                                    >
                                        {distributionSlots.map((slot, slotIdx) => {
                                            const tec = allTecnicos.find(t => t.id === slot.tecnicoId);
                                            const isExterno = tec?.rol === 'TecnicoExterno';

                                            // Group equipos by familia within this slot
                                            const famMap = new Map<string, Equipo[]>();
                                            slot.equipos.forEach(eq => {
                                                const arr = famMap.get(eq.familia) || [];
                                                arr.push(eq);
                                                famMap.set(eq.familia, arr);
                                            });

                                            return (
                                                <div
                                                    key={`${slot.tecnicoId}-${slot.dia}`}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={() => handleDrop(slotIdx)}
                                                    style={{
                                                        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)',
                                                        borderRadius: '14px', padding: '0.75rem', minHeight: '120px',
                                                        borderColor: draggedItem ? 'var(--primary)' : 'var(--glass-border)',
                                                    }}
                                                >
                                                    {/* Slot Header */}
                                                    <div style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--glass-border)' }}>
                                                        <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--primary)' }}>
                                                            📅 Día {slot.dia} {MESES[slot.mes].substring(0, 3)}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem' }}>
                                                            {isExterno ? '🔧' : '👤'} {slot.tecnicoNombre}
                                                        </div>
                                                        {isExterno && (
                                                            <div style={{ fontSize: '0.55rem', color: '#F59E0B', fontWeight: '700' }}>
                                                                {FAMILIA_ICONS[tec?.especialidad || ''] || ''} {tec?.especialidad}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Equipment by Family */}
                                                    {Array.from(famMap.entries()).map(([familia, eqs]) => (
                                                        <div
                                                            key={familia}
                                                            draggable
                                                            onDragStart={() => handleDragStart('familia', familia, slotIdx)}
                                                            style={{
                                                                marginBottom: '0.5rem', padding: '0.5rem', borderRadius: '10px',
                                                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                                                                cursor: 'grab',
                                                            }}
                                                        >
                                                            <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.3rem' }}>
                                                                <GripVertical size={12} /> {FAMILIA_ICONS[familia] || '🔧'} {familia} ({eqs.length})
                                                            </div>
                                                            {eqs.map(eq => (
                                                                <div
                                                                    key={eq.id}
                                                                    draggable
                                                                    onDragStart={(e) => { e.stopPropagation(); handleDragStart('equipo', eq.id, slotIdx); }}
                                                                    style={{
                                                                        fontSize: '0.7rem', padding: '0.2rem 0.4rem', marginLeft: '0.75rem',
                                                                        color: 'var(--text-main)', cursor: 'grab',
                                                                    }}
                                                                >
                                                                    • {eq.nombre}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ))}

                                                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.5rem', fontWeight: '700' }}>
                                                        {slot.equipos.length} equipos
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Navigation */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                <button className="btn" onClick={() => setStep(2)}>Atrás</button>
                                <button className="btn btn-primary" disabled={totalInDistribution === 0} onClick={() => setStep(4)}>
                                    Resumen Final ({totalInDistribution}) <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ════════ STEP 4: Summary & Confirm ════════ */}
                    {step === 4 && (
                        <div>
                            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                                <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'rgba(34, 197, 94, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', border: '2px dashed #22c55e' }}>
                                    <CheckCircle size={35} color="#22c55e" />
                                </div>
                                <h4 style={{ fontWeight: '900', fontSize: '1.3rem', marginBottom: '0.5rem' }}>Resumen de Generación Masiva</h4>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                    <strong style={{ color: 'white' }}>{totalInDistribution} órdenes</strong> preventivas para{' '}
                                    <strong style={{ color: 'var(--primary)' }}>{sucursal?.nombre}</strong>
                                </p>
                            </div>

                            {/* Summary Table */}
                            <div className="custom-scrollbar" style={{ maxHeight: '45vh', overflowY: 'auto', marginBottom: '1.5rem', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-card)' }}>
                                        <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                                            <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontWeight: '800', color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Equipo</th>
                                            <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left', fontWeight: '800', color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Familia</th>
                                            <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left', fontWeight: '800', color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Técnico</th>
                                            <th style={{ padding: '0.6rem 1rem', textAlign: 'right', fontWeight: '800', color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase' }}>Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {distributionSlots.flatMap(slot =>
                                            slot.equipos.map(eq => (
                                                <tr key={eq.id} style={{ borderTop: '1px solid var(--glass-border)' }}>
                                                    <td style={{ padding: '0.5rem 1rem', fontWeight: '700' }}>{eq.nombre}</td>
                                                    <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{FAMILIA_ICONS[eq.familia] || ''} {eq.familia}</td>
                                                    <td style={{ padding: '0.5rem', color: 'var(--primary)', fontWeight: '700' }}>{slot.tecnicoNombre}</td>
                                                    <td style={{ padding: '0.5rem 1rem', textAlign: 'right' }}>{slot.dia} {MESES[slot.mes].substring(0, 3)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    <p style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--primary)' }}>{totalInDistribution}</p>
                                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>OTs a crear</p>
                                </div>
                                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    <p style={{ fontSize: '1.5rem', fontWeight: '900', color: '#22c55e' }}>{new Set(distributionSlots.map(s => s.tecnicoId)).size}</p>
                                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Técnicos</p>
                                </div>
                                <div style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                                    <p style={{ fontSize: '1.5rem', fontWeight: '900', color: '#F59E0B' }}>{new Set(distributionSlots.map(s => s.dia)).size}</p>
                                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Días</p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn" disabled={isGenerating} onClick={() => setStep(3)} style={{ flex: 1 }}>
                                    ← Ajustar
                                </button>
                                <button
                                    className="btn btn-primary"
                                    style={{ flex: 2, background: '#22c55e', borderColor: '#22c55e' }}
                                    disabled={isGenerating}
                                    onClick={handleGenerate}
                                >
                                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                    {isGenerating ? ' GENERANDO...' : ` 🚀 CREAR ${totalInDistribution} ÓRDENES`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
