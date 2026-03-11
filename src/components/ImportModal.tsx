import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Upload, CheckCircle, FileSpreadsheet, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { collection, writeBatch, doc, getDocs } from 'firebase/firestore';
import { trackedAddDoc } from '../services/firestoreHelpers';
import { db } from '../services/firebase';
import { useNotification } from '../context/NotificationContext';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { cleanObject } from '../utils/cleaners';
import { downloadExcel } from '../utils/fileDownload';
import { useAuth } from '../hooks/useAuth';
import { tenantQuery } from '../services/tenantContext';
import { getClientes } from '../services/dataService';
import type { Franquicia, Cliente, Sucursal } from '../types';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'sucursales' | 'equipos';
    onSuccess: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, type, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<any[]>([]);
    const [catalogs, setCatalogs] = useState<{
        clientes: Cliente[],
        franquicias: Franquicia[],
        sucursales: Sucursal[],
        familias: any[]
    }>({ clientes: [], franquicias: [], sucursales: [], familias: [] });
    const { showNotification } = useNotification();

    const { user, activeClienteId } = useAuth();

    useEscapeKey(onClose, isOpen);

    const fetchCatalogs = async () => {
        try {
            const targetClienteId = (user?.rol === 'Admin General' && activeClienteId && activeClienteId !== 'ADMIN')
                ? activeClienteId
                : (user?.rol !== 'Admin General' ? user?.clienteId : undefined);

            const [cSnap, fSnap, sSnap, famSnap] = await Promise.all([
                getClientes(targetClienteId),
                // Important: getDocs with tenantQuery needs a valid user object. If not, fallback to regular collection
                user ? getDocs(tenantQuery('franquicias', user)) : getDocs(collection(db, 'franquicias')),
                user ? getDocs(tenantQuery('sucursales', user)) : getDocs(collection(db, 'sucursales')),
                user ? getDocs(tenantQuery('familias', user)) : getDocs(collection(db, 'familias'))
            ]);
            setCatalogs({
                clientes: cSnap,
                franquicias: fSnap.docs.map(d => ({ id: d.id, ...d.data() } as Franquicia)),
                sucursales: sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Sucursal)),
                familias: famSnap.docs.map(d => ({ id: d.id, ...d.data() } as any))
            });
        } catch (error) {
            console.error("Error fetching catalogs:", error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchCatalogs();
            setFile(null);
            setPreview([]);
        }
    }, [isOpen]);

    // Universal download — works on Chrome, Firefox, Safari, and mobile
    const downloadTemplate = async () => {
        const headers = type === 'sucursales'
            ? ['CLIENTE_ID', 'FRANQUICIA', 'NOMBRE_SUCURSAL', 'NOMENCLATURA', 'DIRECCION', 'LATITUD', 'LONGITUD']
            : ['CLIENTE_ID', 'SUCURSAL_ID', 'FRANQUICIA', 'FAMILIA', 'NOMBRE_EQUIPO'];
        const fileName = type === 'sucursales' ? 'Plantilla_Sucursales.xlsx' : 'Plantilla_Equipos.xlsx';

        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

        try {
            const success = await downloadExcel(wbout, fileName);
            if (success) {
                showNotification('Plantilla descargada exitosamente.', 'success');
            }
        } catch (err: any) {
            console.error('Download failed:', err);
            showNotification('No se pudo descargar la plantilla. Intente de nuevo.', 'error');
        }
    };

    // Help normalize names (handle different types of apostrophes, case, accents and extra spaces)
    const normalizeText = (text: string) => {
        if (!text) return "";
        return text.toLowerCase()
            .trim()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/[´`'‘’]/g, "'") // Standardize all quotes to '
            .replace(/\s+/g, " "); // Collapse multiple spaces
    };

    const validateRow = (row: any, currentCatalogs: typeof catalogs) => {
        const errors: string[] = [];
        const rawClientId = String(row.CLIENTE_ID || '').trim();
        const rawFranchiseName = String(row.FRANQUICIA || '').trim();

        if (!rawClientId) {
            errors.push("ID Cliente ausente");
        }

        // 1. Resolve Client (Check by ID first, then by Name / Razon Social)
        let resolvedClient = currentCatalogs.clientes.find(c => c.id.toLowerCase() === rawClientId.toLowerCase());
        if (!resolvedClient && rawClientId) {
            resolvedClient = currentCatalogs.clientes.find(c =>
                normalizeText(c.nombre) === normalizeText(rawClientId) ||
                normalizeText(c.razonSocial) === normalizeText(rawClientId)
            );
        }

        if (!resolvedClient && rawClientId) {
            errors.push(`Cliente "${rawClientId}" no existe`);
        }

        // 2. Resolve Franchise (Check by Name or ID, within the resolved client scope or ADMIN)
        let resolvedFranchise = null;
        if (!rawFranchiseName) {
            errors.push("Franquicia ausente");
        } else if (resolvedClient) {
            resolvedFranchise = currentCatalogs.franquicias.find(f =>
                (f.id.toLowerCase() === rawFranchiseName.toLowerCase() || normalizeText(f.nombre) === normalizeText(rawFranchiseName)) &&
                (
                    f.clienteId === resolvedClient!.id ||
                    f.clienteId === 'ADMIN' ||
                    normalizeText(f.clienteId) === normalizeText(resolvedClient!.id) ||
                    normalizeText(f.clienteId) === normalizeText(resolvedClient!.nombre) ||
                    normalizeText(f.clienteId) === normalizeText(rawClientId)
                )
            );
            if (!resolvedFranchise) {
                errors.push(`Franquicia "${rawFranchiseName}" no encontrada para el cliente ${resolvedClient.nombre}`);
            }
        }

        // 3. Type specific validation
        if (type === 'sucursales') {
            if (!row.NOMBRE_SUCURSAL) errors.push("Nombre sucursal ausente");
            if (!row.NOMENCLATURA) errors.push("Nomenclatura ausente");
        } else {
            // EQUIPOS IMPORT
            const rawSucursalRef = String(row.SUCURSAL_ID || '').trim();
            if (!rawSucursalRef) {
                errors.push("ID Sucursal ausente");
            } else if (resolvedClient) {
                // Find sucursal by ID or Name within client scope or raw client reference
                const s = currentCatalogs.sucursales.find(s =>
                    (s.id.toLowerCase() === rawSucursalRef.toLowerCase() || normalizeText(s.nombre) === normalizeText(rawSucursalRef)) &&
                    (
                        s.clienteId === resolvedClient!.id ||
                        s.clienteId === 'ADMIN' ||
                        normalizeText(s.clienteId) === normalizeText(resolvedClient!.id) ||
                        normalizeText(s.clienteId) === normalizeText(resolvedClient!.nombre) ||
                        normalizeText(s.clienteId) === normalizeText(rawClientId)
                    )
                );
                if (!s) {
                    errors.push(`Sucursal "${rawSucursalRef}" no existe para el cliente ${resolvedClient.nombre}`);
                }
            }

            const rawFamilia = String(row.FAMILIA || '').trim();
            if (!rawFamilia) {
                errors.push("Familia ausente (Ej: ESP_REFRIGERACION)");
            } else {
                const f = currentCatalogs.familias.find(fam => 
                    fam.id === rawFamilia || 
                    normalizeText(fam.nombre) === normalizeText(rawFamilia) || 
                    normalizeText(fam.nomenclatura) === normalizeText(rawFamilia)
                );
                if (!f) {
                    errors.push(`Familia "${rawFamilia}" no encontrada en el catálogo Maestro`);
                }
            }

            if (!row.NOMBRE_EQUIPO) errors.push("Nombre equipo ausente");
        }

        return errors.length === 0 ? "Apto" : `❌ ${errors.join(", ")}`;
    };

    const lastCatalogsRef = useRef<string>("");

    // Auto re-validate when catalogs arrive (solves race condition where file is picked before catalogs load)
    useEffect(() => {
        const catHash = `${catalogs.clientes.length}-${catalogs.franquicias.length}-${catalogs.sucursales.length}`;
        if (preview.length > 0 && catalogs.clientes.length > 0 && lastCatalogsRef.current !== catHash) {
            lastCatalogsRef.current = catHash;
            console.log("Re-validando con catálogos actualizados...");
            setPreview(prev => prev.map(row => ({
                ...row,
                DIAGNOSTICO: validateRow(row, catalogs)
            })));
        }
    }, [catalogs, preview.length]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data = XLSX.utils.sheet_to_json(ws) as any[];

                    const validatedData = data.map(row => {
                        const cleanedRow = cleanObject(row);
                        return {
                            ...cleanedRow,
                            DIAGNOSTICO: validateRow(cleanedRow, catalogs)
                        };
                    });

                    setPreview(validatedData);
                } catch (err) {
                    showNotification("Error al leer el archivo Excel.", "error");
                }
            };
            reader.readAsBinaryString(selectedFile);
        }
    };

    const handleQuickAddClient = async (name: string) => {
        if (!name) return;
        setLoading(true);
        try {
            await trackedAddDoc(collection(db, 'clientes'), {
                nombre: name,
                razonSocial: name // Fallback to same as name
            });
            showNotification(`Cliente "${name}" agregado al catálogo.`, "success");
            await fetchCatalogs();
            if (file) handleFileChange({ target: { files: [file] } } as any);
        } catch (e) {
            showNotification("Error al agregar cliente.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAddFranchise = async (cId: string, fName: string) => {
        if (!cId || !fName) return;
        setLoading(true);
        try {
            await trackedAddDoc(collection(db, 'franquicias'), {
                clienteId: cId,
                nombre: fName,
                logoUrl: '',
                colorFondo: '#FFFFFF'
            });
            showNotification(`Franquicia "${fName}" agregada al catálogo.`, "success");
            await fetchCatalogs();
            if (file) handleFileChange({ target: { files: [file] } } as any);
        } catch (e) {
            showNotification("Error al agregar franquicia.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAddSucursal = async (cId: string, fId: string, sName: string) => {
        if (!cId || !fId || !sName) return;
        setLoading(true);
        try {
            await trackedAddDoc(collection(db, 'sucursales'), {
                clienteId: cId,
                franquiciaId: fId,
                nombre: sName,
                direccion: '',
                coordenadas: { lat: 0, lng: 0 }
            });
            showNotification(`Sucursal "${sName}" agregada al catálogo.`, "success");
            await fetchCatalogs();
            if (file) handleFileChange({ target: { files: [file] } } as any);
        } catch (e) {
            showNotification("Error al agregar sucursal.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async () => {
        if (preview.length === 0 || preview.some(r => r.DIAGNOSTICO !== "Apto")) {
            showNotification('Existen errores en los datos. Corríjalos antes de importar.', 'warning');
            return;
        }
        setLoading(true);

        try {
            const batch = writeBatch(db);
            const colRef = collection(db, type);
            let count = 0;

            preview.forEach((row) => {
                const rawClientId = String(row.CLIENTE_ID || '').trim();
                const rawFranchiseName = String(row.FRANQUICIA || '').trim();

                // 1. Resolve Client
                let resolvedClient = catalogs.clientes.find(c => c.id.toLowerCase() === rawClientId.toLowerCase());
                if (!resolvedClient) {
                    resolvedClient = catalogs.clientes.find(c =>
                        normalizeText(c.nombre) === normalizeText(rawClientId) ||
                        normalizeText(c.razonSocial) === normalizeText(rawClientId)
                    );
                }
                if (!resolvedClient) return;

                // 2. Resolve Franchise
                const resolvedFranchise = catalogs.franquicias.find(f =>
                    (f.id.toLowerCase() === rawFranchiseName.toLowerCase() || normalizeText(f.nombre) === normalizeText(rawFranchiseName)) &&
                    (
                        f.clienteId === resolvedClient!.id ||
                        f.clienteId === 'ADMIN' ||
                        normalizeText(f.clienteId) === normalizeText(resolvedClient!.id) ||
                        normalizeText(f.clienteId) === normalizeText(resolvedClient!.nombre) ||
                        normalizeText(f.clienteId) === normalizeText(rawClientId)
                    )
                );
                if (!resolvedFranchise) return;

                if (type === 'sucursales') {
                    const docRef = doc(colRef);
                    batch.set(docRef, {
                        clienteId: resolvedClient.id,
                        franquiciaId: resolvedFranchise.id,
                        nombre: String(row.NOMBRE_SUCURSAL),
                        nomenclatura: String(row.NOMENCLATURA),
                        direccion: String(row.DIRECCION || ''),
                        coordenadas: {
                            lat: parseFloat(row.LATITUD) || 0,
                            lng: parseFloat(row.LONGITUD) || 0
                        },
                        createdAt: new Date().toISOString()
                    });
                    count++;
                } else {
                    // Resolve Sucursal
                    const rawSucursalRef = String(row.SUCURSAL_ID || '').trim();
                    const resolvedSucursal = catalogs.sucursales.find(s =>
                        (s.id.toLowerCase() === rawSucursalRef.toLowerCase() || normalizeText(s.nombre) === normalizeText(rawSucursalRef)) &&
                        (
                            s.clienteId === resolvedClient!.id ||
                            s.clienteId === 'ADMIN' ||
                            normalizeText(s.clienteId) === normalizeText(resolvedClient!.id) ||
                            normalizeText(s.clienteId) === normalizeText(resolvedClient!.nombre) ||
                            normalizeText(s.clienteId) === normalizeText(rawClientId)
                        )
                    );

                    const resolvedFamilia = catalogs.familias.find(fam => 
                        fam.id === String(row.FAMILIA) || 
                        normalizeText(fam.nombre) === normalizeText(String(row.FAMILIA)) || 
                        normalizeText(fam.nomenclatura) === normalizeText(String(row.FAMILIA))
                    );

                    if (!resolvedSucursal || !resolvedFamilia) return;

                    const docRef = doc(colRef);
                    batch.set(docRef, {
                        clienteId: resolvedClient.id,
                        sucursalId: resolvedSucursal.id,
                        franquiciaId: resolvedFranchise.id,
                        familiaId: resolvedFamilia.id,
                        familia: resolvedFamilia.nombre || resolvedFamilia.nomenclatura || String(row.FAMILIA),
                        nombre: String(row.NOMBRE_EQUIPO),
                        createdAt: new Date().toISOString()
                    });
                    count++;
                }
            });

            await batch.commit();
            showNotification(`Se importaron ${count} registros exitosamente.`, 'success');
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            showNotification('Error al procesar la importación.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div className="glass-card animate-fade" style={{ width: '100%', maxWidth: '600px', border: '1px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <FileSpreadsheet size={24} color="var(--primary-light)" />
                        <h2 style={{ fontSize: '1rem', fontWeight: '900', color: 'white' }}>IMPORTAR {type.toUpperCase()}</h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            className="btn"
                            onClick={handleImport}
                            disabled={!file || loading || preview.some(r => r.DIAGNOSTICO !== "Apto")}
                            style={{
                                padding: '0.6rem 1.2rem',
                                fontSize: '0.75rem',
                                fontWeight: '800',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '10px',
                                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                cursor: 'pointer',
                                opacity: (!file || loading || preview.some(r => r.DIAGNOSTICO !== "Apto")) ? 0.5 : 1
                            }}
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                            {loading ? 'PROCESANDO...' : 'IMPORTAR DATOS'}
                        </button>
                        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}><X size={24} /></button>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <section style={{ padding: '0.75rem', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '12px', border: '1px dashed var(--primary-light)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <h3 style={{ fontSize: '0.7rem', fontWeight: '800', marginBottom: '0.4rem', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Download size={14} /> 1. DESCARGAR PLANTILLA
                            </h3>
                            <button
                                onClick={downloadTemplate}
                                className="btn"
                                style={{ width: '100%', fontSize: '0.7rem', padding: '0.4rem', background: 'var(--bg-glass)', border: '1px solid var(--primary)', color: 'white', borderRadius: '8px' }}
                            >
                                OBTENER .XLSX
                            </button>
                        </section>

                        <section style={{ position: 'relative', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                            <h3 style={{ fontSize: '0.7rem', fontWeight: '800', marginBottom: '0.4rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Upload size={14} /> 2. CARGAR ARCHIVO
                            </h3>
                            <input
                                type="file"
                                accept=".xlsx, .xls"
                                onChange={handleFileChange}
                                style={{
                                    width: '100%', padding: '0.75rem', borderRadius: '10px', border: '2px dashed var(--glass-border)',
                                    background: 'var(--bg-input)', cursor: 'pointer', fontSize: '0.7rem'
                                }}
                            />
                            {file && <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '6px', border: '1px solid rgba(34, 197, 94, 0.2)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <CheckCircle size={14} color="#22c55e" /> <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</span>
                            </div>}
                        </section>
                    </div>

                    {preview.length > 0 && (
                        <section style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '12px', padding: '0.75rem', border: '1px solid var(--glass-border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <h4 style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Vista Previa & Diagnóstico</h4>
                                {(() => {
                                    const missingClientRow = preview.find(r => r.DIAGNOSTICO.includes("Cliente") && r.DIAGNOSTICO.includes("existe"));
                                    const missingFranchiseRow = preview.find(r => r.DIAGNOSTICO.includes("Franquicia") && r.DIAGNOSTICO.includes("encontrada"));
                                    const missingSucursalRow = preview.find(r => r.DIAGNOSTICO.includes("Sucursal") && r.DIAGNOSTICO.includes("existe"));

                                    return (
                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                            {missingClientRow && (
                                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.65rem', color: '#F59E0B' }}>¿Cliente nuevo?</span>
                                                    <button
                                                        onClick={() => handleQuickAddClient(String(missingClientRow.CLIENTE_ID))}
                                                        style={{ fontSize: '0.6rem', padding: '2px 6px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                                    >
                                                        + CLIENTE
                                                    </button>
                                                </div>
                                            )}
                                            {missingFranchiseRow && (
                                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.65rem', color: '#F59E0B' }}>¿Falta Franquicia?</span>
                                                    <button
                                                        onClick={() => {
                                                            const resolvedClient = catalogs.clientes.find(c => c.id.toLowerCase() === String(missingFranchiseRow.CLIENTE_ID).toLowerCase() || normalizeText(c.nombre) === normalizeText(String(missingFranchiseRow.CLIENTE_ID)));
                                                            if (resolvedClient) handleQuickAddFranchise(resolvedClient.id, missingFranchiseRow.FRANQUICIA);
                                                        }}
                                                        style={{ fontSize: '0.6rem', padding: '2px 6px', background: '#F59E0B', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                                    >
                                                        + FRANQUICIA
                                                    </button>
                                                </div>
                                            )}
                                            {missingSucursalRow && type === 'equipos' && (
                                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.65rem', color: '#F59E0B' }}>¿Falta Sucursal?</span>
                                                    <button
                                                        onClick={() => {
                                                            const resolvedClient = catalogs.clientes.find(c => c.id.toLowerCase() === String(missingSucursalRow.CLIENTE_ID).toLowerCase() || normalizeText(c.nombre) === normalizeText(String(missingSucursalRow.CLIENTE_ID)));
                                                            const resolvedFranchise = catalogs.franquicias.find(f => normalizeText(f.nombre) === normalizeText(String(missingSucursalRow.FRANQUICIA)) && f.clienteId === resolvedClient?.id);
                                                            if (resolvedClient && resolvedFranchise) handleQuickAddSucursal(resolvedClient.id, resolvedFranchise.id, missingSucursalRow.SUCURSAL_ID);
                                                        }}
                                                        style={{ fontSize: '0.6rem', padding: '2px 6px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                                                    >
                                                        + SUCURSAL
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="custom-scrollbar" style={{ maxHeight: '250px', overflowY: 'auto', overflowX: 'auto', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                                <table style={{ width: '100%', fontSize: '0.7rem', borderCollapse: 'collapse', color: 'white' }}>
                                    <thead style={{ position: 'sticky', top: 0, background: '#1e293b', zIndex: 1, color: 'white' }}>
                                        <tr>
                                            <th style={{ textAlign: 'left', padding: '0.6rem', borderBottom: '2px solid var(--glass-border)', color: 'white', textTransform: 'uppercase', fontSize: '0.6rem' }}>DIAGNÓSTICO</th>
                                            {Object.keys(preview[0]).filter(k => k !== 'DIAGNOSTICO').map(k => (
                                                <th key={k} style={{ textAlign: 'left', padding: '0.6rem', borderBottom: '2px solid var(--glass-border)', color: 'white', textTransform: 'uppercase', fontSize: '0.6rem' }}>{k}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.map((row, i) => {
                                            const isApto = row.DIAGNOSTICO === "Apto";
                                            return (
                                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isApto ? 'transparent' : 'rgba(239, 68, 68, 0.05)' }}>
                                                    <td style={{ padding: '0.5rem', fontWeight: 'bold', color: isApto ? '#22c55e' : '#ef4444', fontSize: '0.65rem' }}>
                                                        {row.DIAGNOSTICO}
                                                    </td>
                                                    {Object.entries(row).filter(([k]) => k !== 'DIAGNOSTICO').map(([, v], j) => (
                                                        <td key={j} style={{ padding: '0.5rem', opacity: 0.9, color: 'white' }}>{String(v)}</td>
                                                    ))}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};
