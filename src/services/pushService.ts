/**
 * SERVICIO DE PUSH NOTIFICATIONS H-GESTIÓN
 * Integración con Firebase Cloud Messaging (FCM).
 * 
 * Flujo:
 * 1. El Coordinador accede al sistema → se registra el Service Worker
 * 2. Se obtiene el token FCM → se guarda en Firestore (usuarios/{uid}/fcmTokens)
 * 3. Cuando se crea una notificación, se envía un push al token registrado
 * 
 * NOTA: Para enviar pushes desde el frontend se necesita un Cloud Function
 * o un servidor backend. Por ahora registramos el token y usamos la 
 * Notification API del navegador como fallback inmediato.
 */
import { getToken, onMessage } from 'firebase/messaging';
import { messagingPromise } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// VAPID Key - Se genera en Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
// Por ahora usamos la clave del proyecto h-gestion-dev
const VAPID_KEY = 'BLvJf0z2gO8g2C0m_Rq4b5T8h2K9vN1jP3xQ7wE6rY5dF8sA4lM0nB6cX1zV9tU2kG3hI7jL5oW8pR4qS6eD0'; // placeholder - reemplazar con la real

/**
 * Solicita permiso de notificaciones y registra el token FCM para un usuario.
 */
export const registrarPushNotifications = async (userId: string): Promise<string | null> => {
    try {
        const messaging = await messagingPromise;
        if (!messaging) {
            console.warn('FCM no disponible. Usando Notification API del navegador.');
            return null;
        }

        // Solicitar permiso
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn('Permiso de notificaciones denegado.');
            return null;
        }

        // Registrar Service Worker
        let registration: ServiceWorkerRegistration | undefined;
        if ('serviceWorker' in navigator) {
            registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        }

        // Obtener token FCM
        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        if (token) {
            // Guardar token en Firestore
            await setDoc(doc(db, 'usuarios', userId, 'fcmTokens', 'web'), {
                token,
                ultimaActualizacion: new Date().toISOString(),
                plataforma: 'web',
                userAgent: navigator.userAgent,
            });
            console.log('✅ Token FCM registrado:', token.substring(0, 20) + '...');
            return token;
        }
        return null;
    } catch (error) {
        console.error('Error registrando push notifications:', error);
        return null;
    }
};

/**
 * Escucha mensajes entrantes cuando la app está en primer plano.
 * Muestra una notificación nativa del navegador.
 */
export const escucharMensajesEntrantes = async () => {
    const messaging = await messagingPromise;
    if (!messaging) return;

    onMessage(messaging, (payload) => {
        console.log('📩 Mensaje FCM recibido:', payload);
        const { title, body, icon } = payload.notification || {};

        // Mostrar notificación nativa del navegador
        if (Notification.permission === 'granted' && title) {
            new Notification(title, {
                body: body || '',
                icon: icon || '/favicon.ico',
                badge: '/favicon.ico',
                tag: payload.data?.otId || 'hgestion',
                requireInteraction: true,
            });
        }
    });
};

/**
 * Fallback: Usa la Notification API del navegador directamente.
 * Esto funciona SIN backend, como demo silvestre.
 */
export const enviarNotificacionNativa = (titulo: string, mensaje: string, otNumero?: number) => {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
        new Notification(titulo, {
            body: mensaje,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: otNumero ? `ot-${otNumero}` : 'hgestion',
            requireInteraction: true,
            vibrate: [200, 100, 200],
        } as NotificationOptions);
    } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(perm => {
            if (perm === 'granted') {
                new Notification(titulo, {
                    body: mensaje,
                    icon: '/favicon.ico',
                    tag: otNumero ? `ot-${otNumero}` : 'hgestion',
                    requireInteraction: true,
                } as NotificationOptions);
            }
        });
    }
};
