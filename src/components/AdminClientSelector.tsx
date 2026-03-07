import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getClientes } from '../services/dataService';
import type { Cliente } from '../types';
import { Building2 } from 'lucide-react';

export const AdminClientSelector: React.FC = () => {
    const { user, activeClienteId, setActiveClienteId } = useAuth();
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(false);

    // Only fetch and render for true Admin role
    const isSuperRole = user?.rol === 'Admin';

    useEffect(() => {
        if (!isSuperRole) return;
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
    }, [isSuperRole]);

    if (!isSuperRole) return null;

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(55, 65, 81, 0.3)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
            <Building2 size={16} color="var(--primary)" />
            <select
                value={activeClienteId || 'ADMIN'}
                onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'ADMIN') {
                        setActiveClienteId(null);
                        // Trigger a page reload to aggressively reset caches if needed, or rely on React state
                        window.location.reload();
                    } else {
                        setActiveClienteId(val);
                        window.location.reload();
                    }
                }}
                disabled={loading}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: activeClienteId !== 'ADMIN' ? '#10b981' : 'var(--text-main)',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    outline: 'none',
                    cursor: 'pointer',
                    maxWidth: '120px'
                }}
                title="Cambiar contexto de Empresa"
            >
                <option value="ADMIN" style={{ background: 'var(--bg-card)' }}>MODO ADMINISTRADOR (Ver Todo)</option>
                {clientes.map(c => (
                    <option key={c.id} value={c.id} style={{ background: 'var(--bg-card)' }}>
                        {c.nombre}
                    </option>
                ))}
            </select>
        </div>
    );
};
