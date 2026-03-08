/* eslint-disable no-restricted-globals */
// Firebase Cloud Messaging Service Worker
// Este archivo debe estar en /public/firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
    authDomain: "h-gestion-dev.firebaseapp.com",
    projectId: "h-gestion-dev",
    storageBucket: "h-gestion-dev.firebasestorage.app",
    messagingSenderId: "198928689880",
    appId: "1:198928689880:web:7f90dcd33e710fcc7505ad",
});

const messaging = firebase.messaging();

// Manejar notificaciones en segundo plano
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Mensaje en background:', payload);
    const { title, body, icon } = payload.notification || {};

    const notificationTitle = title || 'H-GESTIÓN';
    const notificationOptions = {
        body: body || 'Tienes una nueva notificación',
        icon: icon || '/favicon.ico',
        badge: '/favicon.ico',
        tag: payload.data?.otId || 'hgestion-bg',
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200],
        data: payload.data,
        actions: [
            { action: 'open', title: 'Ver detalles' },
            { action: 'dismiss', title: 'Cerrar' }
        ]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manejar clic en la notificación
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    // Abrir la app o enfocar la ventana existente
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            return clients.openWindow('/');
        })
    );
});
