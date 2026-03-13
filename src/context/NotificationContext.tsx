import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X, ExternalLink } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationAction {
    label: string;
    onClick: () => void;
}

interface Notification {
    id: string;
    type: NotificationType;
    message: string;
    action?: NotificationAction;
}

interface NotificationContextType {
    showNotification: (message: string, type?: NotificationType, action?: NotificationAction) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const showNotification = useCallback((message: string, type: NotificationType = 'info', action?: NotificationAction) => {
        const id = Math.random().toString(36).substr(2, 9);
        setNotifications(prev => [...prev, { id, type, message, action }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, action ? 15000 : 10000); // More time if there's an action to click
    }, []);

    // Expose for simulation agent
    useEffect(() => {
        (window as any).showSimulationMsg = showNotification;
    }, [showNotification]);

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <div style={{
                position: 'fixed',
                top: '70px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                pointerEvents: 'none',
                width: 'calc(100% - 2rem)',
                maxWidth: '460px'
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
                                background:
                                    n.type === 'success' ? 'rgba(16, 185, 129, 0.12)' :
                                    n.type === 'error'   ? 'rgba(239, 68, 68, 0.10)' :
                                    n.type === 'warning' ? 'rgba(245, 158, 11, 0.10)' :
                                                           'rgba(59, 130, 246, 0.10)',
                                backdropFilter: 'blur(12px)',
                                border: `1px solid ${
                                    n.type === 'success' ? 'rgba(16, 185, 129, 0.3)' :
                                    n.type === 'error'   ? 'rgba(239, 68, 68, 0.3)' :
                                    n.type === 'warning' ? 'rgba(245, 158, 11, 0.3)' :
                                                           'rgba(59, 130, 246, 0.3)'
                                }`,
                                padding: '0.85rem 1rem',
                                borderRadius: '14px',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.65rem',
                                width: '100%'
                            }}
                        >
                            <div style={{
                                color:
                                    n.type === 'success' ? '#10b981' :
                                    n.type === 'error'   ? '#ef4444' :
                                    n.type === 'warning' ? '#f59e0b' : '#3b82f6',
                                flexShrink: 0,
                                marginTop: '1px'
                            }}>
                                {n.type === 'success' && <CheckCircle2 size={20} />}
                                {n.type === 'error' && <AlertCircle size={20} />}
                                {n.type === 'warning' && <AlertCircle size={20} />}
                                {n.type === 'info' && <Info size={20} />}
                            </div>
                            <div style={{ flex: 1, fontSize: '0.92rem', fontWeight: '500', color: 'var(--text-main)', lineHeight: '1.4' }}>
                                {n.message}
                            </div>
                            {n.action && (
                                <button
                                    onClick={() => {
                                        n.action!.onClick();
                                        removeNotification(n.id);
                                    }}
                                    style={{
                                        background: 'var(--primary)',
                                        border: 'none',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.35rem',
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        whiteSpace: 'nowrap',
                                        transition: 'opacity 0.2s'
                                    }}
                                >
                                    <ExternalLink size={13} />
                                    {n.action.label}
                                </button>
                            )}
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

