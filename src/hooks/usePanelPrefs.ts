import { useState, useCallback, useEffect } from 'react';

export const usePanelPrefs = (userId: string = '') => {
    const keyHidden = `hgestion_hidden_btns_${userId} `;

    const [hiddenIds, setHiddenIds] = useState<string[]>([]);

    useEffect(() => {
        if (!userId) return;
        const load = () => {
            const saved = localStorage.getItem(keyHidden);
            if (saved) setHiddenIds(JSON.parse(saved));
        };
        load();
        const handleStorage = () => load();
        window.addEventListener('panelPrefsChanged', handleStorage);
        return () => window.removeEventListener('panelPrefsChanged', handleStorage);
    }, [userId, keyHidden]);

    const toggleVisibility = useCallback((id: string) => {
        if (!userId) return;
        setHiddenIds(prev => {
            const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
            localStorage.setItem(keyHidden, JSON.stringify(next));
            window.dispatchEvent(new Event('panelPrefsChanged'));
            return next;
        });
    }, [userId, keyHidden]);

    return { hiddenIds, toggleVisibility };
};
