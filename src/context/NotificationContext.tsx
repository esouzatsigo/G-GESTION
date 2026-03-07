import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
    id: string;
    type: NotificationType;
    message: string;
}

interface NotificationContextType {
    showNotification: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        setNotifications(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 5000);
    }, []);

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <div style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                pointerEvents: 'none'
            }}>
                <AnimatePresence>
                    {notifications.map(n => (
                        <motion.div
                            key={n.id}
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 20, scale: 0.95 }}
                            style={{
                                pointerEvents: 'auto',
                                background: 'var(--bg-card)',
                                backdropFilter: 'var(--glass-blur)',
                                border: '1px solid var(--glass-border)',
                                padding: '1rem 1.25rem',
                                borderRadius: '16px',
                                boxShadow: 'var(--glass-shadow)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                minWidth: '300px',
                                maxWidth: '450px'
                            }}
                        >
                            <div style={{
                                color: n.type === 'success' ? 'var(--status-concluida)' :
                                    n.type === 'error' ? 'var(--priority-alta)' :
                                        n.type === 'warning' ? 'var(--priority-media)' : 'var(--accent)'
                            }}>
                                {n.type === 'success' && <CheckCircle2 size={20} />}
                                {n.type === 'error' && <AlertCircle size={20} />}
                                {n.type === 'warning' && <AlertCircle size={20} />}
                                {n.type === 'info' && <Info size={20} />}
                            </div>
                            <div style={{ flex: 1, fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-main)' }}>
                                {n.message}
                            </div>
                            <button
                                onClick={() => removeNotification(n.id)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
                            >
                                <X size={16} />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotification must be used within a NotificationProvider');
    return context;
};
