import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

export type SortDirection = 'asc' | 'desc';

export interface SortDirectionConfig {
    field: string;
    direction: SortDirection;
}

interface SortableHeaderProps {
    label: string | React.ReactNode;
    field: string;
    currentSort: SortDirectionConfig;
    onSort: (field: string) => void;
    align?: 'left' | 'center' | 'right';
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
    label, field, currentSort, onSort, align = 'left'
}) => {
    const isSorted = currentSort.field === field;

    return (
        <th style={{ textAlign: align, padding: '0 1rem' }}>
            <button
                onClick={() => onSort(field)}
                style={{
                    background: 'transparent',
                    border: 'none',
                    color: isSorted ? 'var(--primary-light)' : 'var(--text-muted)',
                    fontWeight: isSorted ? '900' : '800',
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
                    gap: '0.4rem',
                    cursor: 'pointer',
                    padding: 0,
                    textTransform: 'uppercase'
                }}
            >
                {label}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    {isSorted ? (
                        currentSort.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                        <ArrowUp size={14} style={{ opacity: 0.2 }} />
                    )}
                </div>
            </button>
        </th>
    );
};
