import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getClientes } from '../services/dataService';
import type { Cliente } from '../types';
import { Building2 } from 'lucide-react';

export const AdminClientSelector: React.FC = () => {
    const { user, activeClienteId, setActiveClienteId } = useAuth();
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(false);

    // Only fetch and render for true Admin role AND specific HCelis identity
    // El selector debe ser visible si el usuario tiene rol Admin y es el dueño/maestro
    const isHCelis = user?.email === 'hhcelis@hgestion.com' || (user?.rol === 'Admin' && user?.clienteId === 'ADMIN');

    useEffect(() => {
        if (!isHCelis) return;
        const load = async () => {
            setLoading(true);
            try {
                // We use getting all clients, which admin can do
                const data = await getClientes();
                setClientes(data);
            } catch (e) {
                console.error("Error loading clients for selector", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [isHCelis]);

    if (!isHCelis) return null;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            background: activeClienteId && activeClienteId !== 'ADMIN' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(55, 65, 81, 0.4)',
            padding: '0.4rem 0.8rem',
            borderRadius: '12px',
            border: activeClienteId && activeClienteId !== 'ADMIN' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--glass-border)',
            transition: 'all 0.3s ease',
            position: 'relative'
        }}>
            <Building2 size={18} color={activeClienteId && activeClienteId !== 'ADMIN' ? '#10b981' : 'var(--primary)'} />
            <select
                value={activeClienteId || 'ADMIN'}
                onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'ADMIN') {
                        setActiveClienteId(null);
                    } else {
                        const cliente = clientes.find(c => c.id === val);
                        setActiveClienteId(val, cliente?.nombre);
                    }
                }}
                disabled={loading}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: activeClienteId && activeClienteId !== 'ADMIN' ? '#10b981' : 'var(--text-main)',
                    fontSize: '0.85rem',
                    fontWeight: '900',
                    outline: 'none',
                    cursor: 'pointer',
                    maxWidth: '400px',
                    width: 'auto',
                    letterSpacing: '0.02em',
                    appearance: 'none',
                    paddingRight: '1.5rem'
                }}
                title="Contexto de Empresa Activo"
            >
                <option value="ADMIN" style={{ background: '#1f2937', color: 'white' }}>🌎 VISTA GLOBAL (ADMIN)</option>
                {clientes.map(c => (
                    <option key={c.id} value={c.id} style={{ background: '#1f2937', color: 'white' }}>
                        🏢 {c.nombre.toUpperCase()}
                    </option>
                ))}
            </select>
            <div style={{ position: 'absolute', right: '0.8rem', pointerEvents: 'none', color: activeClienteId && activeClienteId !== 'ADMIN' ? '#10b981' : 'var(--text-muted)' }}>
                ▼
            </div>
        </div>
    );
};
