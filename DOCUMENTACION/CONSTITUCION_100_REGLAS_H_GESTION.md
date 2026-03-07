# 🏛️ CONSTITUCIÓN OPERATIVA H-GESTIÓN: LAS 100 LEYES
## Compilación Maestra Definitiva (DDD v3.0)
### Fecha: 4 de Marzo de 2026

> **Fuente:** Análisis exhaustivo de 16 páginas, 7 componentes, 2 servicios, 1 hook de autenticación, 2 generadores PDF, 3 conversaciones históricas, 2 manuales de reglas previos, y el archivo DDD vigente.

---

## 🛡️ I. EL PACTO DEL DÚO DINÁMICO (META-REGLAS 1-5)

1. **Rol del Socio Estratégico:** La IA opera como Arquitecto de Innovación. No es un ejecutor de código; debe cuestionar, proponer y elevar cada solución.
2. **Sincronización DDD:** Cada acuerdo nuevo debe quedar documentado inmediatamente en el archivo `DIRECTIVAS_DUO_DINAMICO.md` del proyecto.
3. **La Cruda Realidad:** Prohibido ocultar limitaciones técnicas, dar respuestas evasivas o verdades a medias. La veracidad es la regla de oro.
4. **Proactividad Trascendente:** Si la IA detecta una falla, mejora o automatización posible, debe proponerla *antes* de que Héctor la mencione.
5. **Respuesta a Pregunta Expresa:** Toda pregunta directa del usuario DEBE recibir una respuesta clara, directa e inmediata. Sin omisiones.
5.1. **⚡ SUPREMACÍA UX (LA REGLA MÁS IMPORTANTE):** SIEMPRE privilegiar la Experiencia de Usuario. Cada decisión técnica, cada línea de código, debe evaluarse primero bajo el lente de "¿Esto mejora la experiencia del usuario?". La IA debe estar constante y permanentemente ideando cómo mejorar la UX. Esta directriz prevalece sobre cualquier otra consideración técnica.
5.2. **🧠 ROL DE CABEZA PENSANTE:** La IA actúa como un Socio Estratégico y no como un ejecutor de código ("pica código"). Es su obligación proponer constantemente acotaciones sobre nuevas herramientas, librerías o formas disruptivas de mostrar información para mejorar la UX. Cada interacción es una oportunidad para elevar el estándar del sistema.

---

## 🎨 II. ESTÁNDAR PREMIUM Y UX (REGLAS 6-15)

> ⚡ **DIRECTRIZ SUPREMA:** La UX es la prioridad #1 del sistema. Toda funcionalidad, mejora o corrección debe medirse primero por su impacto en la experiencia del usuario final. Si no mejora la UX, se replantea.

6. **Cero MVPs Genéricos:** La UI/UX debe proyectar nivel corporativo de última generación. Prohibidos los diseños planos o simples.
7. **Glassmorphism Institucional:** Todos los paneles y tarjetas usan `glass-card` con `backdrop-filter: blur()` para un efecto premium consistente.
8. **Alta Legibilidad Industrial:** El diseño debe ser legible tanto bajo luz solar directa como en entornos oscuros industriales.
9. **Animaciones de Entrada:** Cada componente que aparece usa la clase `animate-fade` para transiciones suaves.
10. **Identidad de Franquicia en Gráficas:** Las barras, leyendas y etiquetas del calendario usan el `colorFondo` oficial de la franquicia y sus iniciales (ej. `[SR]`).
11. **Inteligencia de Logos (Análisis de Píxeles):** Al subir un logo de franquicia, el sistema analiza los píxeles dominantes para proponer automáticamente un color de fondo que garantice contraste. (`FranquiciasPage.tsx:74-121`)
12. **Fondo Adaptativo por Luminancia:** Logos claros (luminancia > 0.85) reciben fondo `#F1F5F9`. Logos oscuros (luminancia < 0.15) reciben fondo blanco puro. El resto recibe un 8% de su color dominante mezclado con 92% blanco.
13. **Tinta Negra Digital:** Filtro algorítmico obligatorio en el `SignaturePad` para que las firmas en pantalla táctil luzcan como tinta real profesional (fondo blanco, trazo negro #000, lineWidth 2.5). (`SignaturePad.tsx:41-43`)
14. **Previsualización de Logo Premium:** En el catálogo de franquicias, el logo se muestra a 120x120px con bordes redondeados de 32px y sombra profunda. (`FranquiciasPage.tsx:252-269`)
15. **Drill-Down Interactivo en Dashboard:** Cada barra y segmento de gráfica es clicable. Al hacer clic, se abre el `BIDrillDownModal` mostrando la lista exacta de OTs que componen ese dato.

---

## 🔐 III. SEGURIDAD, ACCESO Y AUTENTICACIÓN (REGLAS 16-27)

16. **Autenticación Firebase JWT:** El sistema usa `signInWithEmailAndPassword` de Firebase Auth. Las sesiones se validan con JWT y expiran por inactividad.
17. **Validación de Identidad Única (Email):** El email es el ID inalterable. Firebase Auth bloquea duplicidades con error `auth/email-already-in-use`. (`LoginPage.tsx:36-37`)
18. **Contraseña Mínima 6 Caracteres:** Firebase rechaza contraseñas débiles con error `auth/weak-password`. (`LoginPage.tsx:45-46`)
19. **Mensajes de Error Humanizados:** El login traduce los códigos de error de Firebase a mensajes claros en español para el usuario (7 casos distintos). (`LoginPage.tsx:34-56`)
20. **Jerarquía de 6 Roles:** Admin, Coordinador, Gerente, Supervisor, Técnico, TécnicoExterno. Cada uno tiene permisos y vistas distintas. (`useAuth.tsx:29,157-163`)
21. **Dashboard por Rol (Redirección Automática):** Tras el login, el sistema carga el perfil y redirige al dashboard específico del rol.
22. **Visibilidad Ciega (`sucursalesPermitidas`):** Un perfil solo ve datos de las sucursales listadas en su array. Si contiene `'TODAS'`, acceso universal (solo Admin). (`useAuth.tsx:63`)
23. **Gerente BA vs Gerente Sucursal:** El sistema distingue entre un Gerente de alto nivel (con acceso a múltiples sucursales) y un Gerente local (una sola sucursal). (`useAuth.tsx:160-161`)
24. **Técnico Unificado:** `isTecnico` es `true` para rol `Tecnico` y `TecnicoExterno`, unificando la lógica de campo. (`useAuth.tsx:163`)
25. **Persistencia de Sesión Mock (Dev):** En modo desarrollo, el rol seleccionado se guarda en `localStorage('mockRole')` para mantener la sesión entre recargas. (`useAuth.tsx:148`)
26. **Fallback de Perfil Admin:** Si el email es `hhcelis@hgestion.com` y no existe documento en Firestore, el sistema crea un perfil Admin temporal en memoria. (`useAuth.tsx:56-64`)
27. **Detección de Modo Offline:** Si Firestore retorna error `'unavailable'`, el sistema muestra mensaje de "Sin conexión" y usa la caché local. (`useAuth.tsx:71-72`)

---

## 👤 IV. GESTIÓN DE USUARIOS (REGLAS 28-35)

28. **Campos Mandatorios de Usuario:** Nombre completo, Email válido (con `@`) y Cliente asignado son requeridos para crear cualquier perfil. (`UsuariosPage.tsx:91-103`)
29. **Especialidad Obligatoria para TécnicoExterno:** El sistema no permite guardar un perfil `TecnicoExterno` sin una especialidad seleccionada (Aires, Cocción, Refrigeración, Agua, Generadores). (`UsuariosPage.tsx:107-110`)
30. **Sucursal Obligatoria para Técnicos:** Todo Técnico (interno o externo) debe tener al menos una sucursal asignada en su array. (`UsuariosPage.tsx:111-114`)
31. **Limpieza de Campos por Rol:** Al cambiar el rol, el sistema limpia automáticamente la especialidad si el nuevo rol no es TecnicoExterno. (`UsuariosPage.tsx:246`)
32. **Vinculación Supervisor-Técnico:** Cada técnico puede tener un `supervisorId` asignado, que determina quién auditará sus OTs. (`UsuariosPage.tsx:280-288`)
33. **Vinculación Coordinador-Técnico:** Cada técnico puede tener un `coordinadorId` asignado, que determina quién gestionará su agenda. (`UsuariosPage.tsx:290-299`)
34. **Botones de Selección Masiva:** El panel de sucursales permite "TODAS" y "NINGUNA" para gestión rápida de permisos. (`UsuariosPage.tsx:309-327`)
35. **Filtrado de Sucursales por Cliente:** Al seleccionar un cliente, solo se muestran las sucursales de ese cliente en el panel de permisos. (`UsuariosPage.tsx:336-339`)

---

## 🏢 V. CATÁLOGOS MAESTROS (REGLAS 36-50)

36. **Razón Social Obligatoria:** Los clientes requieren Nombre Comercial y Razón Social para facturación. (`ClientesPage.tsx:51-59`)
37. **Cascada de Selects en Equipos:** Cliente → Franquicia → Sucursal. Cada dropdown se activa solo al seleccionar el anterior, previniendo asociaciones inválidas. (`EquiposPage.tsx:243-276`)
38. **5 Campos Obligatorios de Equipo:** Cliente, Franquicia, Sucursal, Familia y Nombre son requeridos. (`EquiposPage.tsx:74-94`)
39. **8 Familias de Equipo:** Aires, Cocción, Refrigeración, Cocina, Restaurante, Local, Agua, Generadores. (`EquiposPage.tsx:29`)
40. **Franquicia Obligatoria con Cliente:** No se puede crear una franquicia sin asignarla a un cliente/empresa. (`FranquiciasPage.tsx:162-165`)
41. **Nombre de Franquicia Obligatorio:** El campo nombre se valida antes de guardar. (`FranquiciasPage.tsx:166-169`)
42. **Sitio Web Opcional pero Visible:** Si se registra un URL, aparece como link clicable en la tarjeta con ícono de Globe. (`FranquiciasPage.tsx:330-364`)
43. **Clipboard Paste para Logos (Ctrl+V):** El modal de franquicias intercepta el evento paste del portapapeles y acepta imágenes directamente. (`FranquiciasPage.tsx:134-151`)
44. **Logo Upload a Firebase Storage:** Los logos se suben a `franquicias/logos/` con un timestamp único. (`FranquiciasPage.tsx:153-157`)
45. **Color de Fondo Personalizable:** Además del auto-detectado, el Admin puede ingresar manualmente un código HEX para el fondo del logo. (`FranquiciasPage.tsx:457-470`)
46. **Geolocalización Inquebrantable:** No se puede crear una sucursal sin coordenadas GPS (Lat/Lng). (`SucursalesPage.tsx:105-108`)
47. **Dirección Física Obligatoria:** El campo de dirección es `required` para toda sucursal nueva. (`SucursalesPage.tsx:101-104`)
48. **Cascada Cliente → Franquicia en Sucursales:** La franquicia se filtra por el cliente seleccionado. (`SucursalesPage.tsx:330-336`)
49. **Búsqueda Inteligente en Google Maps:** El botón "BUSCAR EN GOOGLE MAPS" lanza un `MapPickerModal` que utiliza la dirección escrita para posicionar el marcador, permitiendo ajuste manual de coordenadas. (`SucursalesPage.tsx:355-368`)
50. **Nomenclatura Interna de Sucursales:** Campo opcional para referencia interna (ej: `B-ALT-01`). (`SucursalesPage.tsx:347-350`)

---

## 📥 VI. IMPORTACIÓN MASIVA (REGLAS 51-56)

51. **Importador Blindado de Excel:** El sistema valida cada fila del Excel antes de permitir la carga masiva. (`ImportModal.tsx`)
52. **Jerarquía de Verificación:** El importador valida que franquicias del Excel pertenezcan al cliente correcto.
53. **Columna de Diagnóstico:** El importador muestra una columna dinámica indicando "Apto" o error específico por fila.
54. **Alimentación de Catálogo In-Place:** Si falta una franquicia, se puede crear sin cerrar el modal de importación.
55. **Bloqueo por Fila No Apta:** El botón "IMPORTAR" se desactiva si existe una sola fila con error de validación.
56. **Importación Disponible para Sucursales y Equipos:** Ambos catálogos tienen botón "IMPORTAR EXCEL" en su header. (`SucursalesPage.tsx:153-155`, `EquiposPage.tsx:134-136`)

---

## 📋 VII. CICLO DE VIDA DE LA OT (REGLAS 57-75)

57. **Origen Dual de OTs:** Las OTs nacen de un reporte de falla (Correctivo) o de la proyección del Plan Preventivo 2026 (Preventivo). (`dataService.ts:120-131, 133-168`)
58. **Consecutivo Atómico (runTransaction):** El folio se obtiene mediante una transacción atómica de Firestore que garantiza unicidad incluso con concurrencia. (`dataService.ts:95-111`)
59. **Contadores Separados por Tipo:** Correctivos usan el campo `otNumber` (inicio: 1000). Preventivos usan `preventiveOtNumber` (inicio: 1). (`dataService.ts:99-100`)
60. **Prefijo Contable 'P-':** Los mantenimientos preventivos se identifican visualmente con el prefijo "P-" en toda la UI. (`MisServiciosPage.tsx:71`)
61. **Timestamp Automático de Solicitud:** Al crear una OT, `fechas.solicitada` se inicializa con `new Date().toISOString()`. (`dataService.ts:127`)
62. **Flujo Causal de Catálogo:** El gerente debe seleccionar Familia de equipo primero para filtrar los activos de su sucursal específica. (`SolicitarOTPage.tsx`)
63. **Foto de Evidencia Inicial Obligatoria:** No se puede enviar un ticket correctivo sin al menos 1 fotografía. (`SolicitarOTPage.tsx:56`)
64. **Descripción de Falla Obligatoria:** Campo `required` en el formulario de solicitud.
65. **Justificación de Servicio Obligatoria:** Campo `required` en el formulario de solicitud.
66. **Asignación Tripartita Obligatoria:** El Coordinador debe definir: Técnico Responsable, Prioridad (ALTA/MEDIA/BAJA) y Fecha+Hora programada para cambiar el estatus a "Asignada". (`CoordinadorDashboard.tsx:101-113`)
67. **Selector de Técnicos Filtrado:** Solo muestra usuarios con rol `Tecnico` o `TecnicoExterno`. (`CoordinadorDashboard.tsx:75`)
68. **Fecha Programada Obligatoria:** El Coordinador no puede dejar la cita en blanco. (`CoordinadorDashboard.tsx:106-109`)
69. **Hora Programada Obligatoria:** El Coordinador no puede dejar la hora en blanco. (`CoordinadorDashboard.tsx:110-113`)
70. **Registro ISO de Asignación:** Al asignar, se graba `fechas.asignada` en ISO con el timestamp exacto. (`CoordinadorDashboard.tsx:122`)
71. **Programación Compuesta:** La fecha y hora se combinan como `${fecha}T${hora}:00`. (`CoordinadorDashboard.tsx:123`)
72. **GPS de Llegada:** Al marcar "Llegada a Sitio", el sistema captura lat/lng del dispositivo y las graba en `coordsLlegada`. (`MisServiciosPage.tsx:124-129`)
73. **Fallback de GPS por Antena:** Si el GPS falla, el sistema permite registrar la llegada sin coordenadas, usando la hora del servidor como respaldo. (`MisServiciosPage.tsx:136-143`)
74. **Timestamp de Llegada:** Se graba `fechas.llegada` en ISO. (`MisServiciosPage.tsx:129`)
75. **Ventana de 30 Días:** El técnico solo ve OTs de los últimos 30 días por defecto para mantener la bandeja limpia. (`MisServiciosPage.tsx:47-49`)

---

## 🔧 VIII. EJECUCIÓN TÉCNICA EN SITIO (REGLAS 76-86)

76. **Auto-Guardado Anti-Crisis (1.5s):** El sistema guarda automáticamente descripción y repuestos a Firebase cada 1.5 segundos de inactividad de tecleo. (`EjecucionServicioPage.tsx`)
77. **Foto ANTES Obligatoria (Correctivas):** El técnico no puede avanzar sin subir una foto del estado previo a la reparación.
78. **Foto DESPUÉS Obligatoria (Correctivas):** El técnico no puede concluir sin subir una foto del resultado.
79. **Descripción del Servicio Obligatoria (Correctivas):** Campo `required` para el cierre técnico. (`EjecucionServicioPage.tsx:124`)
80. **Firma Digital del Técnico Obligatoria:** Sin firma, no se puede concluir el paso técnico.
81. **Flexibilidad Preventiva:** El sistema exceptúa las fotos y descripción obligatoria para OTs de tipo Preventivo, adaptándose a la naturaleza del mantenimiento programado.
82. **Bloqueo Post-Firma Técnico:** Una vez que el técnico firma, los campos de fotos, descripción y repuestos se deshabilitan (`disabled`). Su contenido ya no puede alterarse. (`EjecucionServicioPage.tsx:178`)
83. **Estatus Intermedio "Pendiente Firma Cliente":** Tras el cierre técnico, la OT pasa a `'Concluida. Pendiente Firma Cliente'`.
84. **Comentarios del Cliente Obligatorios (Correctivas):** El cliente debe dejar un comentario para que el cierre final sea válido.
85. **Firma Digital del Cliente Obligatoria:** Sin firma del receptor, la OT no se cierra.
86. **Cámara Nativa con Visor en Vivo:** El `CameraModal` solicita permisos `getUserMedia`, ofrece visor de video en tiempo real, cambio entre cámara frontal/trasera, y captura en JPEG al 85% de calidad. (`CameraModal.tsx:19-48, 59-78`)

---

## 🔍 IX. SUPERVISIÓN Y AUDITORÍA (REGLAS 87-93)

87. **Jerarquía de Supervisión:** Un Supervisor solo ve OTs de técnicos que tienen su ID en `supervisorId`. El Admin es omnipresente. (`SupervisarPage.tsx`)
88. **Facultad de Rechazo:** El Supervisor puede devolver una OT al estado "Asignada" si la calidad de evidencia o descripción es insuficiente.
89. **Cierre Definitivo (Inmutabilidad):** Al hacer clic en "TERMINAR", la OT cambia a estatus `'Terminada'` y se graba fecha/hora exacta del cierre corporativo. Ya no puede ser editada en la interfaz estándar.
90. **Auto-Generación de PDF:** Al cerrar la OT, el sistema dispara automáticamente la descarga del PDF oficial. (`SupervisarPage.tsx`)
91. **Bitácora de Auditoría por OT:** Cada cambio en la OT genera un registro en la colección `bitacora` con: usuario, fecha, campo modificado, valor anterior y valor nuevo. (`dataService.ts:207-251`)
92. **Campos Auditados:** descripcionFalla, justificacion, prioridad, tecnicoId, descripcionServicio, repuestosUtilizados, fechas.programada. (`dataService.ts:215-218`)
93. **Timestamp Automático en Updates:** Todo `updateWorkOrder` añade un campo `updatedAt` con la fecha del servidor. (`dataService.ts:204`)

---

## 📅 X. MANTENIMIENTO PREVENTIVO (REGLAS 94-100)

94. **Plan Estático 2026:** El sistema carga un plan de preventivos desde la colección `planPreventivo2026`. Es una proyección que se vuelve dinámica al migrarse a DB.
95. **Proyección Trimestral (90 Días):** El calendario preventivo siempre muestra una ventana de 3 meses para anticipación logística.
96. **Conversión Preventivo → OT Real:** Un preventivo proyectado NO es una OT. El Coordinador debe presionar "Confirmar y Generar OT" para que aparezca en la bandeja del técnico. (`dataService.ts:133-168`)
97. **Generación Masiva de OTs:** Se pueden generar OTs preventivas para todos los equipos de una sucursal en una sola operación atómica. (`dataService.ts:133-168`)
98. **Detección de Duplicados:** El sistema consulta OTs existentes por `preventivoPlanId` para evitar generar OTs duplicadas para el mismo evento. (`dataService.ts:170-174`)
99. **Bitácora de Calendario:** Todo movimiento de fecha o mes en el plan preventivo genera un registro en `bitacoraPreventivos2026` con nombre de usuario, fecha y detalles de cambio. (`dataService.ts:258-301`)
100. **Regla de Un Solo Paso Atrás (Undo):** Solo se permite revertir el último cambio registrado en la bitácora de preventivos. La reversión restaura los campos a su estado anterior y elimina el registro de auditoría. (`dataService.ts:304-319`)

---

## 📊 BONUS: INTELIGENCIA DE NEGOCIO (XI)

101. **Factor de Mantenimiento (Semáforo):** Preventivo > Correctivo = Verde (Salud). Correctivo > Preventivo = Rojo (Crisis Reactiva).
102. **Umbral de Saturación (50%):** Alarma visual si la carga técnica supera el 50% de la capacidad promedio.
103. **Kardex: Filtros Combinados de 7 Dimensiones:** Búsqueda por texto, Sucursal, Estatus, Técnico, Prioridad, Tipo, y Rango de Fechas simultáneamente. (`KardexPage.tsx:116-132`)
104. **Ordenamiento Bidireccional:** El Kardex permite ordenar por número de OT en forma ascendente o descendente. (`KardexPage.tsx:129-132`)
105. **Deep Linking por URL:** El Kardex soporta parámetros `?id=` y `?ot=` en la URL para abrir directamente una OT específica. (`KardexPage.tsx:102-114`)
106. **Permisos de Edición por Rol y Estado:** La función `canEditField` controla granularmente qué campos puede tocar cada rol según el estatus de la OT. (`KardexPage.tsx:191-211`)
107. **Visibilidad del Botón Editar por Rol:** `shouldShowEditControl` oculta el lápiz de edición según el rol y el avance de la OT (ej: el Gerente solo edita OTs en "Pendiente"). (`KardexPage.tsx:213-226`)
108. **Fallback de Cliente por Sucursal:** Si el PDF no encuentra el cliente por `ot.clienteId`, intenta obtenerlo a través de `sucursal.clienteId`. (`KardexPage.tsx:144-147`)
109. **Diagnóstico de Datos Faltantes para PDF:** Si faltan datos maestros (Cliente, Sucursal o Equipo), el sistema notifica exactamente cuáles faltan. (`KardexPage.tsx:161-165`)
110. **Reporte Ejecutivo PDF Landscape:** El `generateExecutiveReport` crea un PDF corporativo en modo landscape con los 5 insights del dashboard y el Factor de Mantenimiento con color dinámico (rojo/verde). (`generateExecutiveReport.ts`)

---

> *"La Cruda Realidad y el Apego a la Veracidad es lo Único que nos Hace Libres."*
> **- Héctor A. Celis L.**
