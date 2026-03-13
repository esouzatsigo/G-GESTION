/**
 * useAndroidBackButton
 * 
 * Intercepta el botón físico "Atrás" de Android (via Capacitor) y lo traduce
 * en navegación interna de la app. El técnico siempre navega hacia atrás
 * dentro de la app; solo puede salir con el botón Home o cambiando de app.
 * 
 * Si ya está en la pantalla raíz ('/'), el botón físico NO hace nada
 * (no cierra la app), obligando al usuario a usar Home para salir.
 */
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const useAndroidBackButton = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        let listenerHandle: (() => void) | null = null;

        const setupListener = async () => {
            try {
                // Importación dinámica para que no falle en web/browser
                const { App } = await import('@capacitor/app');

                // Registrar el listener del botón físico
                const handle = await App.addListener('backButton', () => {
                    const currentHash = window.location.hash;
                    const currentPath = currentHash.replace('#', '') || '/';

                    // Si estamos en la raíz o en login → no hacer nada (no salir)
                    if (currentPath === '/' || currentPath === '/login' || currentPath === '') {
                        // Consumir el evento sin hacer nada → la app permanece abierta
                        return;
                    }

                    // En cualquier otra pantalla → navegar atrás dentro de la app
                    navigate(-1);
                });

                // handle.remove es la función para des-registrar
                listenerHandle = () => handle.remove();
            } catch {
                // No es un entorno Capacitor (web browser), ignorar silenciosamente
            }
        };

        setupListener();

        return () => {
            if (listenerHandle) listenerHandle();
        };
    }, [navigate, location]);
};
