# 📖 MANUAL DETALLADO DE REGLAS DE NEGOCIO H-GESTIÓN
## Parte 1: Reglas 1–55 | Fecha: 4 de Marzo de 2026

---

## 🛡️ I. EL PACTO DEL DÚO DINÁMICO (1-5)

### REGLA 1 — Rol del Socio Estratégico
- **Qué dice:** La IA no es una herramienta de ejecución; es un Arquitecto Intelectual que debe cuestionar, proponer mejoras y elevar la calidad de cada solución.
- **Por qué existe:** Héctor necesita un socio que piense más allá de la instrucción literal, detectando oportunidades y riesgos que él pueda no ver en el momento.
- **Dónde vive:** `DIRECTIVAS_DUO_DINAMICO.md` — Sección "Identidad del Socio".
- **Impacto:** Toda respuesta y código generado debe reflejar este nivel de análisis. Prohibido entregar código "que funcione" sin evaluar si es la mejor solución.

### REGLA 2 — Sincronización DDD
- **Qué dice:** Cada nuevo acuerdo operativo debe documentarse inmediatamente en el archivo DDD del proyecto.
- **Por qué existe:** Evitar la pérdida de contexto entre sesiones de trabajo. El DDD es la memoria persistente del equipo.
- **Dónde vive:** `DIRECTIVAS_DUO_DINAMICO.md` (local) + `C:\Users\HACel\.ag_global_rules\DIRECTIVAS_DUO_DINAMICO.md` (global backup).
- **Impacto:** Si no está en el DDD, no es oficial.

### REGLA 3 — La Cruda Realidad
- **Qué dice:** Prohibido ocultar limitaciones técnicas, dar rodeos o verdades a medias.
- **Por qué existe:** Héctor valora la objetividad más que la complacencia. Una respuesta evasiva genera más daño que una verdad incómoda.
- **Dónde vive:** DDD, Sección "Principios".
- **Impacto:** Si la IA no puede hacer algo, lo dice directamente con propuestas alternativas.

### REGLA 4 — Proactividad Trascendente
- **Qué dice:** Si la IA detecta una falla, mejora o automatización posible durante el trabajo, debe proponerla de inmediato, antes de que Héctor la solicite.
- **Por qué existe:** Un socio estratégico no espera instrucciones para lo obvio.
- **Dónde vive:** DDD, Sección "Principios".
- **Impacto:** Cada sesión debe incluir al menos una observación proactiva si aplica.

### REGLA 5 — Respuesta a Pregunta Expresa
- **Qué dice:** Toda pregunta directa de Héctor DEBE recibir una respuesta clara, directa e inmediata. Sin omisiones, sin desvíos.
- **Por qué existe:** Surgió de un incidente donde la IA desvió la conversación sin responder la pregunta original.
- **Dónde vive:** DDD, agregada en la sesión del 4 de marzo 2026.
- **Impacto:** Antes de cualquier otra acción, verificar si hay una pregunta pendiente sin responder.

---

## 🎨 II. ESTÁNDAR PREMIUM Y UX (6-15)

### REGLA 6 — Cero MVPs Genéricos
- **Qué dice:** La UI/UX debe proyectar nivel corporativo de última generación. Prohibidos los diseños planos, estilos por defecto de navegador, o prototipos simples.
- **Archivo fuente:** `index.css` (variables CSS globales) — Todo el sistema de diseño usa CSS custom properties.
- **Impacto técnico:** Todas las páginas usan variables como `--bg-main`, `--glass-border`, `--primary`, `--accent` para mantener consistencia dark-mode premium.

### REGLA 7 — Glassmorphism Institucional
- **Qué dice:** Todos los paneles y tarjetas de contenido usan la clase `glass-card` con efecto `backdrop-filter: blur()`.
- **Archivo fuente:** `index.css` — Clase `.glass-card`.
- **Evidencia:** Cada componente visible usa `className="glass-card"` — confirmado en las 16 páginas del proyecto.
- **Impacto visual:** Crea profundidad y transparencia profesional sobre fondos oscuros.

### REGLA 8 — Alta Legibilidad Industrial
- **Qué dice:** El diseño debe ser legible tanto bajo luz solar directa (técnicos en campo) como en entornos oscuros (oficinas).
- **Cómo se implementa:** Alto contraste entre texto (`--text-main: white/near-white`) y fondos oscuros (`--bg-main`). Fuentes con peso mínimo 600 para etiquetas.
- **Impacto:** Los técnicos acceden desde tablets/celulares bajo el sol. La legibilidad no es cosmética, es operativa.

### REGLA 9 — Animaciones de Entrada
- **Qué dice:** Cada componente que aparece en pantalla usa la clase `animate-fade` para transiciones suaves.
- **Archivo fuente:** `index.css` — `@keyframes fadeIn` + `.animate-fade`.
- **Evidencia:** Verificado en las 16 páginas: `<div className="animate-fade">`.
- **Impacto:** Elimina el "parpadeo" de carga brusca y da sensación de fluidez premium.

### REGLA 10 — Identidad de Franquicia en Gráficas
- **Qué dice:** Las barras, leyendas y etiquetas de calendario usan el `colorFondo` oficial de la franquicia y sus iniciales (ej: `[SR]` para Sushi Roll).
- **Archivo fuente:** `PreventivosPage.tsx` — Vista Semanal/Mensual/Anual del calendario.
- **Contexto:** Cada franquicia tiene un campo `colorFondo` en Firestore. El calendario extrae las iniciales del nombre automáticamente.
- **Impacto:** Identidad visual corporativa instantánea sin necesidad de leer texto pequeño.

### REGLA 11 — Inteligencia de Logos (Análisis de Píxeles)
- **Qué dice:** Al subir un logo, el sistema analiza los píxeles dominantes de la imagen para proponer automáticamente un color de fondo que garantice contraste estético.
- **Archivo fuente:** `FranquiciasPage.tsx`, líneas 74-121, función `analyzeLogo()`.
- **Cómo funciona:**
  1. Crea un `<canvas>` invisible y dibuja la imagen.
  2. Muestrea píxeles cada 40px (optimización de rendimiento).
  3. Ignora píxeles con alpha < 128 (transparentes).
  4. Calcula el color dominante promedio (R, G, B).
  5. Calcula luminancia: `(0.299*R + 0.587*G + 0.114*B) / 255`.
  6. Decide el fondo según luminancia (ver Regla 12).

### REGLA 12 — Fondo Adaptativo por Luminancia
- **Qué dice:** Logos claros (luminancia > 0.85) reciben fondo `#F1F5F9` (slate claro). Logos oscuros (luminancia < 0.15) reciben `#FFFFFF`. El resto recibe un 8% de su color dominante mezclado con 92% blanco.
- **Archivo fuente:** `FranquiciasPage.tsx`, líneas 109-118.
- **Fórmula del mix:** `mix(c) => Math.floor(c * 0.08 + 255 * 0.92)` seguido de conversión a HEX.
- **Impacto:** Elimina el "logo flotando en fondo blanco genérico". Cada marca tiene un marco visual personalizado.

### REGLA 13 — Tinta Negra Digital
- **Qué dice:** Las firmas en el `SignaturePad` deben lucir como tinta real profesional: fondo blanco puro, trazo negro `#000000`, lineWidth 2.5, lineCap y lineJoin `round`.
- **Archivo fuente:** `SignaturePad.tsx`, líneas 41-43.
- **Impacto:** En el PDF impreso, la firma parece hecha con bolígrafo real. Sin este filtro, las firmas digitales lucen como garabatos grises.

### REGLA 14 — Previsualización de Logo Premium
- **Qué dice:** En el catálogo de franquicias, el logo se muestra a 120x120px con bordes redondeados de 32px, padding interno de 16px y sombra profunda.
- **Archivo fuente:** `FranquiciasPage.tsx`, líneas 252-269.
- **CSS clave:** `borderRadius: '32px'`, `boxShadow: '0 12px 30px -8px rgba(0,0,0,0.4)'`, `padding: '16px'`.
- **Impacto:** El logo se ve como un ícono de app premium, no como una imagen pegada.

### REGLA 15 — Drill-Down Interactivo en Dashboard
- **Qué dice:** Cada barra y segmento de gráfica es clicable. Al hacer clic, se abre el `BIDrillDownModal` mostrando la lista de OTs que componen ese dato.
- **Archivo fuente:** `DashboardBIPage.tsx`, líneas 578+, onClick handlers en Bar/Doughnut/Line charts.
- **Componente:** `BIDrillDownModal.tsx` — Tabla con datos de OTs filtrados por el criterio seleccionado.
- **Impacto:** Los datos pasan de ser "números bonitos" a ser información accionable.

---

## 🔐 III. SEGURIDAD Y AUTENTICACIÓN (16-27)

### REGLA 16 — Autenticación Firebase JWT
- **Qué dice:** El login usa `signInWithEmailAndPassword` de Firebase Auth. Las sesiones se validan con JWT.
- **Archivo fuente:** `LoginPage.tsx`, línea 31. Hook: `useAuth.tsx`, línea 50 (`onAuthStateChanged`).
- **Impacto:** Seguridad delegada a la infraestructura de Google. No se manejan contraseñas en código propio.

### REGLA 17 — Email como Identidad Única
- **Qué dice:** El email es el identificador inalterable. Firebase Auth bloquea duplicidades.
- **Archivo fuente:** `LoginPage.tsx`, líneas 36-37 — error `auth/email-already-in-use`.
- **Impacto:** Imposible crear dos cuentas con el mismo correo, protegiendo contra suplantación.

### REGLA 18 — Contraseña Mínima 6 Caracteres
- **Qué dice:** Firebase rechaza contraseñas débiles con error `auth/weak-password`.
- **Archivo fuente:** `LoginPage.tsx`, líneas 45-46.
- **Impacto:** Seguridad básica de acceso sin necesidad de lógica custom de validación.

### REGLA 19 — Mensajes de Error Humanizados
- **Qué dice:** El login traduce 7 códigos de error de Firebase a mensajes claros en español.
- **Archivo fuente:** `LoginPage.tsx`, líneas 34-56 (switch completo).
- **Códigos cubiertos:** `email-already-in-use`, `invalid-email`, `invalid-credential`, `weak-password`, `wrong-password`, `user-not-found`, default.
- **Impacto:** El usuario nunca ve un error críptico en inglés.

### REGLA 20 — Jerarquía de 6 Roles
- **Qué dice:** Admin, Coordinador, Gerente, Supervisor, Tecnico, TecnicoExterno.
- **Archivo fuente:** `useAuth.tsx`, líneas 157-163 (flags booleanos) + `UsuariosPage.tsx`, línea 29 (array de roles).
- **Impacto:** Cada flag (`isAdmin`, `isCoordinador`, etc.) controla la visibilidad de menús, botones y datos.

### REGLA 21 — Dashboard por Rol
- **Qué dice:** Tras el login, el sistema redirige al dashboard específico del rol del usuario.
- **Archivo fuente:** `MainLayout.tsx` — lógica de routing condicional.
- **Impacto:** El Gerente ve "Solicitar OT", el Técnico ve "Mis Servicios", el Coordinador ve "Asignaciones". Sin confusión.

### REGLA 22 — Visibilidad Ciega (`sucursalesPermitidas`)
- **Qué dice:** Un usuario solo accede a datos de las sucursales en su array `sucursalesPermitidas`. Si contiene `'TODAS'`, tiene acceso universal (solo Admin/Coordinador).
- **Archivo fuente:** `useAuth.tsx`, línea 63; `UsuariosPage.tsx`, líneas 349, 358-366.
- **Impacto:** Un Gerente de Altabrisa nunca ve datos de Montejo. Segregación total de información.

### REGLA 23 — Gerente BA vs Gerente Sucursal
- **Qué dice:** El sistema distingue entre Gerente de alto nivel (multi-sucursal) y Gerente local (una sola sucursal).
- **Archivo fuente:** `useAuth.tsx`, líneas 160-161 — `isGerenteBA` vs `isGerenteSucursal`.
- **Lógica:** Si nombre incluye "BA" O tiene `'TODAS'` O tiene >1 sucursal = GerenteBA. Sino = GerenteSucursal.
- **Impacto:** Permite diferentes niveles de acceso dentro del mismo rol.

### REGLA 24 — Técnico Unificado
- **Qué dice:** `isTecnico` retorna `true` tanto para `Tecnico` como para `TecnicoExterno`.
- **Archivo fuente:** `useAuth.tsx`, línea 163.
- **Impacto:** Simplifica la lógica de campo: ambos tipos de técnico comparten la misma interfaz de ejecución.

### REGLA 25 — Persistencia de Sesión Mock (Dev)
- **Qué dice:** En modo desarrollo, el rol seleccionado se guarda en `localStorage('mockRole')`.
- **Archivo fuente:** `useAuth.tsx`, línea 148 (`localStorage.setItem`); línea 44 (`localStorage.getItem`).
- **Impacto:** Al recargar la página en desarrollo, no se pierde la sesión simulada.

### REGLA 26 — Fallback de Perfil Admin
- **Qué dice:** Si el email es `hhcelis@hgestion.com` y no existe documento en Firestore, el sistema crea un perfil Admin temporal en memoria.
- **Archivo fuente:** `useAuth.tsx`, líneas 56-64.
- **Impacto:** Héctor siempre puede acceder al sistema aunque la base de datos esté vacía o recién creada.

### REGLA 27 — Detección de Modo Offline
- **Qué dice:** Si Firestore retorna error `'unavailable'`, el sistema muestra "Sin conexión" y usa la caché local.
- **Archivo fuente:** `useAuth.tsx`, líneas 71-72.
- **Impacto:** Los técnicos en campo con señal intermitente no pierden acceso a datos cacheados.

---

## 👤 IV. GESTIÓN DE USUARIOS (28-35)

### REGLA 28 — Campos Mandatorios de Usuario
- **Qué dice:** Nombre completo, Email válido (con `@`) y Cliente asignado son requeridos.
- **Archivo fuente:** `UsuariosPage.tsx`, líneas 91-103.
- **Validaciones:** `!nombre.trim()`, `!email.includes('@')`, `!clienteId`.
- **Impacto:** No se puede crear un usuario incompleto que luego cause errores en cascada.

### REGLA 29 — Especialidad Obligatoria para TécnicoExterno
- **Qué dice:** Los técnicos subcontratados no pueden operar sin una especialidad técnica definida.
- **Archivo fuente:** `UsuariosPage.tsx`, líneas 107-110.
- **Opciones:** Aires, Cocción, Refrigeración, Agua, Generadores.
- **Impacto:** Garantiza que un TécnicoExterno solo reciba OTs de su competencia.

### REGLA 30 — Sucursal Obligatoria para Técnicos
- **Qué dice:** Todo Técnico debe tener al menos una sucursal asignada.
- **Archivo fuente:** `UsuariosPage.tsx`, líneas 111-114.
- **Impacto:** Sin sucursal, el técnico no aparece en las consultas de asignación del Coordinador.

### REGLA 31 — Limpieza de Campos por Rol
- **Qué dice:** Al cambiar de rol en el formulario, la especialidad se limpia automáticamente si el nuevo rol no es TecnicoExterno.
- **Archivo fuente:** `UsuariosPage.tsx`, línea 246 — `if (newRol !== 'TecnicoExterno') setEspecialidad(undefined)`.
- **Impacto:** Previene datos residuales inválidos (ej: un Coordinador con especialidad "Aires").

### REGLA 32 — Vinculación Supervisor-Técnico
- **Qué dice:** El campo `supervisorId` determina quién auditará las OTs del técnico.
- **Archivo fuente:** `UsuariosPage.tsx`, líneas 280-288. Consumido en `SupervisarPage.tsx`, línea 95.
- **Impacto:** El Supervisor solo ve OTs de SUS técnicos. Sin vínculo = OT invisible para supervisión.

### REGLA 33 — Vinculación Coordinador-Técnico
- **Qué dice:** El campo `coordinadorId` determina quién gestionará la agenda del técnico.
- **Archivo fuente:** `UsuariosPage.tsx`, líneas 290-299.
- **Impacto:** Estructura jerárquica para la distribución de carga de trabajo.

### REGLA 34 — Botones de Selección Masiva
- **Qué dice:** El panel de sucursales permite "TODAS" (verde) y "NINGUNA" (rojo) para gestión rápida de permisos.
- **Archivo fuente:** `UsuariosPage.tsx`, líneas 309-327.
- **Impacto:** Ahorro de tiempo al gestionar usuarios con acceso a muchas sucursales.

### REGLA 35 — Filtrado de Sucursales por Cliente
- **Qué dice:** Al seleccionar un cliente, solo se muestran sus sucursales en el panel de permisos. Si es `ADMIN`, se muestran todas.
- **Archivo fuente:** `UsuariosPage.tsx`, líneas 336-339.
- **Impacto:** Evita asignar accidentalmente sucursales de otro cliente a un usuario.

---

## 🏢 V. CATÁLOGOS MAESTROS (36-50)

### REGLA 36 — Razón Social Obligatoria (Clientes)
- **Qué dice:** Los clientes requieren Nombre Comercial y Razón Social.
- **Archivo fuente:** `ClientesPage.tsx`, líneas 51-59.
- **Impacto:** La razón social es necesaria para facturación y documentos legales.

### REGLA 37 — Cascada de Selects en Equipos
- **Qué dice:** Cliente → Franquicia → Sucursal. Cada dropdown se activa solo al seleccionar el anterior.
- **Archivo fuente:** `EquiposPage.tsx`, líneas 243-276. `disabled={!clienteId}` y `disabled={!franquiciaId}`.
- **Impacto:** Imposible crear un equipo asociado a una franquicia incorrecta.

### REGLA 38 — 5 Campos Obligatorios de Equipo
- **Qué dice:** Cliente, Franquicia, Sucursal, Familia y Nombre del equipo son requeridos.
- **Archivo fuente:** `EquiposPage.tsx`, líneas 74-94. Comentario explícito: `// REGLAS DE NEGOCIO: TODOS LOS CAMPOS SON REQUERIDOS`.
- **Impacto:** Garantiza la integridad del catálogo de activos para auditorías.

### REGLA 39 — 8 Familias de Equipo
- **Qué dice:** Las familias son: Aires, Cocción, Refrigeración, Cocina, Restaurante, Local, Agua, Generadores.
- **Archivo fuente:** `EquiposPage.tsx`, línea 29.
- **Impacto:** Clasificación estandarizada para filtros, reportes y asignación de especialistas.

### REGLA 40 — Franquicia Obligatoria con Cliente
- **Qué dice:** No se puede crear una franquicia sin asignarla a un cliente/empresa.
- **Archivo fuente:** `FranquiciasPage.tsx`, líneas 162-165.

### REGLA 41 — Nombre de Franquicia Obligatorio
- **Archivo fuente:** `FranquiciasPage.tsx`, líneas 166-169.

### REGLA 42 — Sitio Web Opcional pero Visible
- **Qué dice:** Si se registra un URL, aparece como enlace clicable con ícono `Globe` y `ExternalLink`.
- **Archivo fuente:** `FranquiciasPage.tsx`, líneas 330-364.

### REGLA 43 — Clipboard Paste para Logos (Ctrl+V)
- **Qué dice:** El modal de franquicias intercepta `onPaste` del portapapeles y acepta imágenes directas.
- **Archivo fuente:** `FranquiciasPage.tsx`, líneas 134-151, función `handlePaste`.
- **Cómo funciona:** Itera `clipboardData.items`, busca tipo `image/*`, convierte a File/Blob, genera ObjectURL y dispara `analyzeLogo`.

### REGLA 44 — Logo Upload a Firebase Storage
- **Qué dice:** Los logos se suben a `franquicias/logos/{timestamp}_{filename}`.
- **Archivo fuente:** `FranquiciasPage.tsx`, líneas 153-157.

### REGLA 45 — Color de Fondo Personalizable
- **Qué dice:** El campo HEX es editable manualmente además del valor auto-detectado.
- **Archivo fuente:** `FranquiciasPage.tsx`, líneas 457-470.

### REGLA 46 — Geolocalización Inquebrantable (Sucursales)
- **Qué dice:** No se puede crear una sucursal sin coordenadas GPS (Lat/Lng).
- **Archivo fuente:** `SucursalesPage.tsx`, líneas 105-108.
- **Mensaje:** "Las coordenadas geográficas son obligatorias para el mapa."

### REGLA 47 — Dirección Física Obligatoria
- **Archivo fuente:** `SucursalesPage.tsx`, líneas 101-104.

### REGLA 48 — Cascada Cliente → Franquicia en Sucursales
- **Qué dice:** Al cambiar cliente, se resetea franquicia. Solo se muestran franquicias del cliente.
- **Archivo fuente:** `SucursalesPage.tsx`, líneas 320, 330-336.

### REGLA 49 — Búsqueda en Google Maps (MapPicker)
- **Qué dice:** El botón "BUSCAR EN GOOGLE MAPS" abre un `MapPickerModal` que usa la dirección escrita para posicionar un marcador interactivo.
- **Archivo fuente:** `SucursalesPage.tsx`, líneas 355-368 + `MapPickerModal.tsx`.
- **Impacto:** Las coordenadas se pueden ajustar manualmente arrastrando el pin.

### REGLA 50 — Nomenclatura Interna de Sucursales
- **Qué dice:** Campo opcional para referencia interna del cliente (ej: `B-ALT-01`).
- **Archivo fuente:** `SucursalesPage.tsx`, líneas 347-350.
- **Impacto:** Facilita la comunicación entre Héctor y el cliente usando sus propios códigos.

---

## 📥 VI. IMPORTACIÓN MASIVA (51-56)

### REGLA 51 — Importador Blindado de Excel
- **Archivo fuente:** `ImportModal.tsx` (30KB, componente dedicado).
- **Qué hace:** Lee archivos `.xlsx`, parsea cada fila, valida contra datos reales de Firebase.

### REGLA 52 — Jerarquía de Verificación
- **Qué hace:** Cruza franquicias del Excel contra el catálogo de clientes en Firestore.

### REGLA 53 — Columna de Diagnóstico
- **Qué hace:** Agrega una columna visual "Diagnóstico" a cada fila: "✅ Apto" o "❌ Error: [detalle]".

### REGLA 54 — Alimentación de Catálogo In-Place
- **Qué hace:** Si una franquicia del Excel no existe, muestra botón "ALIMENTAR CATÁLOGO" para crearla sin cerrar el modal.

### REGLA 55 — Bloqueo por Fila No Apta
- **Qué dice:** El botón "IMPORTAR" se desactiva completamente si existe una sola fila con error de validación.
- **Impacto:** Garantiza importación 100% limpia o nada. Cero tolerancia a datos corruptos.
