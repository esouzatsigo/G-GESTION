import { initializeApp, getApp, getApps } from "firebase/app";
import { initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getMessaging, isSupported } from "firebase/messaging";

// ============================================
// CONFIGURACIONES DE PROYECTOS FIREBASE
// ============================================

export const FIREBASE_PROJECTS = {
  BPT_GROUP: {
    // Proyecto Original (dev)
    config: {
      apiKey: "AIzaSyCmQL7Tw4EcoAw2eLX1JlvhfXbiHm7UQaw",
      authDomain: "h-gestion-dev.firebaseapp.com",
      projectId: "h-gestion-dev",
      storageBucket: "h-gestion-dev.firebasestorage.app",
      messagingSenderId: "198928689880",
      appId: "1:198928689880:web:7f90dcd33e710fcc7505ad",
    },
    displayName: "BPT GROUP",
    domains: ["bpt.com", "t-sigo.com", "hgestion.com"]
  },
  TEST_BPT: {
    // Proyecto Nuevo (test)
    config: {
      apiKey: "AIzaSyDkeNR7V2PKZaF5cDjhaUiPfU47PTwRwSM",
      authDomain: "h-gestion-testbpt.firebaseapp.com",
      projectId: "h-gestion-testbpt",
      storageBucket: "h-gestion-testbpt.firebasestorage.app",
      messagingSenderId: "385439061540",
      appId: "1:385439061540:web:95c1461abd46400724eab1",
      measurementId: "G-4VQGLN5WRB"
    },
    displayName: "TEST BPT",
    domains: ["test.bpt.com"]
  }
};

// ============================================
// INICIALIZACIÓN DINÁMICA
// ============================================

// El proyecto por defecto donde aterriza todo el mundo al cargar la página (LOBBY)
const DEFAULT_PROJECT = "BPT_GROUP";

export const initFirebaseProject = (projectKey: string) => {
  const pKey = FIREBASE_PROJECTS[projectKey as keyof typeof FIREBASE_PROJECTS] ? projectKey : DEFAULT_PROJECT;
  const config = FIREBASE_PROJECTS[pKey as keyof typeof FIREBASE_PROJECTS].config;
  
  // Guardamos la preferencia
  if (typeof window !== 'undefined') {
     localStorage.setItem('hgestion_project_key', pKey);
  }

  // Inicializamos o recuperamos la app 'DEFAULT' con la config seleccionada
  let app;
  if (!getApps().length) {
      app = initializeApp(config);
  } else {
      // Si la app ya existe, pero queremos reconectarla a otro proyecto (Swap)
      // En Firebase JS Web v9+, no se puede "borrar" una app por defecto fácilmente. 
      // La estrategia general para SPAs es forzar un reload limpio (window.location.reload)
      // para recargar con el proyecto correcto en localStorage, por lo que aquí asumimos
      // que si ya hay una, es la correcta para el ciclo de vida de esta página.
      app = getApp();
  }

  // Verificar la config cargada (debug)
  console.log(`[Firebase] App conectada a: ${app.options.projectId}`);

  return { app, pKey };
};

// Determinar el proyecto a cargar al arranque base
const savedProjectKey = typeof window !== 'undefined' ? localStorage.getItem('hgestion_project_key') || DEFAULT_PROJECT : DEFAULT_PROJECT;
const { app } = initFirebaseProject(savedProjectKey);

// ============================================
// SERVICIOS EXPORTADOS
// ============================================

export const db = initializeFirestore(app, { cacheSizeBytes: CACHE_SIZE_UNLIMITED });
export const auth = getAuth(app);
export const storage = getStorage(app);

// FCM (Push Notifications) async init
export const messagingPromise = isSupported().then(supported => {
  if (supported) return getMessaging(app);
  console.warn('FCM no soportado en este navegador');
  return null;
});

// Helper para Forzar un Reload de Proyecto (Cambio de Contexto)
// Helper para Forzar un Reload de Proyecto (Cambio de Contexto)
export const switchFirebaseProject = /* async */ (newProjectKey: string) => {
   if (typeof window !== 'undefined') {
       const current = localStorage.getItem('hgestion_project_key');
       if (current !== newProjectKey) {
           console.log(`[Firebase] Swapping project: ${current} -> ${newProjectKey}`);
           localStorage.setItem('hgestion_project_key', newProjectKey);
           
           // Limpieza de estados anteriores agresiva
           localStorage.removeItem('hgestion_light_user');
           localStorage.removeItem('hgestion_active_cliente');
           localStorage.removeItem('hgestion_active_cliente_name');
           
           // No borrar IndexedDb de forma asíncrona aquí porque detiene el thread de Vite en reload y da race conditions.
           // Vite en reload es muy agresivo con IndexedDb a medias.
           
           console.log("[Firebase] Storage limpiado, recargando en 300ms...");
           
           setTimeout(() => {
               // Forzar la recarga limpia en la ruta raíz para evitar fallos de router
               window.location.href = '/T-GESTION-Lite/'; 
           }, 300);
       }
   }
};

export const getActiveProjectKey = () => typeof window !== 'undefined' ? localStorage.getItem('hgestion_project_key') || DEFAULT_PROJECT : DEFAULT_PROJECT;
