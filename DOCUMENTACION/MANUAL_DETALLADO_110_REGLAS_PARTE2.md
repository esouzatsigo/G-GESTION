# 📖 MANUAL DETALLADO DE REGLAS DE NEGOCIO H-GESTIÓN
## Parte 2: Reglas 56–110 | Fecha: 4 de Marzo de 2026

---

## 📋 VII. CICLO DE VIDA DE LA OT (56-75)

### REGLA 56 — Importación para Sucursales y Equipos
- **Qué dice:** Ambos catálogos tienen botón "IMPORTAR EXCEL" en su header.
- **Archivos fuente:** `SucursalesPage.tsx:153-155`, `EquiposPage.tsx:134-136`.

### REGLA 57 — Origen Dual de OTs
- **Qué dice:** Las OTs nacen de un reporte de falla (Correctivo) o de la proyección del Plan Preventivo 2026 (Preventivo).
- **Archivos fuente:** `SolicitarOTPage.tsx` (Correctivos) y `dataService.ts:133-168` (Preventivos masivos).
- **Diferencia clave:** Correctivo = Gerente reporta falla. Preventivo = Sistema genera automáticamente desde el plan.

### REGLA 58 — Consecutivo Atómico (`runTransaction`)
- **Qué dice:** El folio de OT se obtiene mediante una transacción atómica de Firestore.
- **Archivo fuente:** `dataService.ts`, líneas 95-111.
- **Cómo funciona:** `runTransaction` lee el contador actual, lo incrementa y lo guarda en una operación indivisible. Si dos usuarios crean OTs simultáneamente, Firestore serializa las transacciones.
- **Documento Firestore:** `config/counters` — campos `otNumber` y `preventiveOtNumber`.
- **Impacto:** Imposibilidad matemática de folios duplicados, incluso bajo concurrencia.

### REGLA 59 — Contadores Separados por Tipo
- **Qué dice:** Correctivos arrancan en 1000 (campo `otNumber`). Preventivos arrancan en 1 (campo `preventiveOtNumber`).
- **Archivo fuente:** `dataService.ts`, líneas 99-100.
- **Impacto:** Los folios P-1, P-2... son distinguibles de #1001, #1002... para auditorías contables.

### REGLA 60 — Prefijo Contable 'P-'
- **Qué dice:** Los preventivos se muestran como `P-{número}` en toda la UI.
- **Archivo fuente:** `MisServiciosPage.tsx`, línea 71: `ot.tipo === 'Preventivo' ? 'P-${ot.numero}' : '#${ot.numero}'`.
- **También en:** `BitacoraPage.tsx`, línea 43 y 91.

### REGLA 61 — Timestamp Automático de Solicitud
- **Qué dice:** Al crear una OT, `fechas.solicitada` se llena con `new Date().toISOString()`.
- **Archivo fuente:** `dataService.ts`, línea 127 y `SolicitarOTPage.tsx`, línea 96.
- **Impacto:** Registro legal del momento exacto del reporte, invulnerable a manipulación.

### REGLA 62 — Flujo Causal de Catálogo
- **Qué dice:** El gerente debe seleccionar Familia de equipo primero para filtrar los activos.
- **Archivo fuente:** `SolicitarOTPage.tsx`, líneas 57-60.
- **Impacto:** Reduce errores de selección en sucursales con 50+ equipos.

### REGLA 63 — Foto de Evidencia Inicial Obligatoria
- **Qué dice:** No se puede enviar un ticket correctivo sin al menos 1 foto.
- **Archivo fuente:** `SolicitarOTPage.tsx`, líneas 73-76. Validación: `tempFiles.length === 0`.
- **Impacto:** Obliga al Gerente a documentar visualmente la falla antes de solicitar servicio.

### REGLA 64 — Descripción de Falla Obligatoria
- **Archivo fuente:** `SolicitarOTPage.tsx`, líneas 65-68.

### REGLA 65 — Justificación de Servicio Obligatoria
- **Archivo fuente:** `SolicitarOTPage.tsx`, líneas 69-72.
- **Impacto:** Fuerza al Gerente a explicar POR QUÉ necesita el servicio, no solo QUÉ pasó.

### REGLA 66 — Asignación Tripartita Obligatoria
- **Qué dice:** El Coordinador debe definir: Técnico, Prioridad y Fecha+Hora programada.
- **Archivo fuente:** `CoordinadorDashboard.tsx`, líneas 101-113.
- **Impacto:** Una OT no puede pasar a "Asignada" sin los tres datos.

### REGLA 67 — Selector de Técnicos Filtrado
- **Qué dice:** Solo muestra usuarios con rol `Tecnico` o `TecnicoExterno`.
- **Archivo fuente:** `CoordinadorDashboard.tsx`, línea 75: `where('rol', 'in', ['Tecnico', 'TecnicoExterno'])`.

### REGLA 68 — Fecha Programada Obligatoria
- **Archivo fuente:** `CoordinadorDashboard.tsx`, líneas 106-109.

### REGLA 69 — Hora Programada Obligatoria
- **Archivo fuente:** `CoordinadorDashboard.tsx`, líneas 110-113.

### REGLA 70 — Registro ISO de Asignación
- **Qué dice:** Al asignar, `fechas.asignada` se graba con `new Date().toISOString()`.
- **Archivo fuente:** `CoordinadorDashboard.tsx`, línea 122.

### REGLA 71 — Programación Compuesta
- **Qué dice:** La fecha/hora se combinan como `${fecha}T${hora}:00`.
- **Archivo fuente:** `CoordinadorDashboard.tsx`, línea 123.
- **Impacto:** Formato ISO completo para ordenamiento y comparaciones precisas.

### REGLA 72 — GPS de Llegada
- **Qué dice:** Al marcar "Llegada a Sitio", se capturan lat/lng del dispositivo.
- **Archivo fuente:** `MisServiciosPage.tsx`, líneas 124-129.
- **Campo Firestore:** `coordsLlegada: { lat, lng }`.
- **Impacto:** Prueba geográfica de presencia en sitio.

### REGLA 73 — Fallback de GPS por Antena
- **Qué dice:** Si el GPS falla, el sistema permite registrar la llegada sin coordenadas, usando hora del servidor.
- **Archivo fuente:** `MisServiciosPage.tsx`, líneas 136-143.
- **Mensaje:** "No se pudo obtener el GPS. Se registrará la llegada basada en antena/red."
- **Impacto:** No bloquea al técnico en campo por fallas de hardware GPS.

### REGLA 74 — Timestamp de Llegada
- **Archivo fuente:** `MisServiciosPage.tsx`, línea 129: `'fechas.llegada': new Date().toISOString()`.

### REGLA 75 — Ventana de 30 Días
- **Qué dice:** El técnico solo ve OTs de los últimos 30 días por defecto.
- **Archivo fuente:** `MisServiciosPage.tsx`, líneas 47-49.
- **Excepción:** Si hay un término de búsqueda, se ignora el filtro de 30 días. (líneas 70-74).

---

## 🔧 VIII. EJECUCIÓN EN SITIO (76-86)

### REGLA 76 — Auto-Guardado Anti-Crisis (1.5 Segundos)
- **Qué dice:** `descripcionServicio` y `repuestosUtilizados` se guardan automáticamente a Firebase tras 1.5s de inactividad de tecleo.
- **Archivo fuente:** `EjecucionServicioPage.tsx`, líneas 62-77.
- **Implementación:** `setTimeout` de 1500ms con `clearTimeout` en cleanup. Compara valores actuales vs estado local para evitar escrituras innecesarias.
- **Impacto:** Si el técnico pierde señal o cierra la app accidentalmente, sus últimas notas están a salvo.

### REGLA 77 — Foto ANTES Obligatoria (Solo Correctivas)
- **Archivo fuente:** `EjecucionServicioPage.tsx`, líneas 129-132.
- **Condición:** `!fotoAntesUrl && !isPreventivo`.

### REGLA 78 — Foto DESPUÉS Obligatoria (Solo Correctivas)
- **Archivo fuente:** `EjecucionServicioPage.tsx`, líneas 133-136.

### REGLA 79 — Descripción del Servicio Obligatoria (Solo Correctivas)
- **Archivo fuente:** `EjecucionServicioPage.tsx`, líneas 125-128.
- **Condición:** `!descripcionTecnica.trim() && !isPreventivo`.

### REGLA 80 — Firma Digital del Técnico Obligatoria
- **Archivo fuente:** `EjecucionServicioPage.tsx`, líneas 137-140.
- **Sin excepción:** Aplica tanto a Correctivas como Preventivas.

### REGLA 81 — Flexibilidad Preventiva
- **Qué dice:** Para OTs tipo `Preventivo`, se exceptúan las fotos y descripción obligatoria.
- **Archivo fuente:** `EjecucionServicioPage.tsx`, línea 122: `const isPreventivo = ot.tipo === 'Preventivo'`.
- **Impacto:** Los preventivos rutinarios no requieren evidencia fotográfica exhaustiva, agilizando la operación.

### REGLA 82 — Bloqueo Post-Firma Técnico
- **Qué dice:** Tras la firma técnica, los campos de fotos, descripción y repuestos se deshabilitan.
- **Archivo fuente:** `EjecucionServicioPage.tsx`, línea 218: `const isLocked = ot.estatus === 'Concluida. Pendiente Firma Cliente' || ot.estatus === 'Concluida' || ot.estatus === 'Terminada'`.
- **Flag `isLocked`:** Controla `disabled` en inputs y oculta botón "REPETIR" en fotos (línea 236).
- **Impacto:** La evidencia no puede ser alterada después de que el técnico firmó su parte.

### REGLA 83 — Estatus Intermedio "Pendiente Firma Cliente"
- **Archivo fuente:** `EjecucionServicioPage.tsx`, línea 148.
- **Estatus:** `'Concluida. Pendiente Firma Cliente'`.
- **Impacto:** Permite que el técnico entregue el equipo y el cliente firme en su propio tiempo.

### REGLA 84 — Comentarios del Cliente Obligatorios (Solo Correctivas)
- **Archivo fuente:** `EjecucionServicioPage.tsx`, líneas 179-182.
- **Condición:** `!comentariosCliente.trim() && ot.tipo !== 'Preventivo'`.

### REGLA 85 — Firma Digital del Cliente Obligatoria
- **Archivo fuente:** `EjecucionServicioPage.tsx`, líneas 183-186.
- **Sin excepción:** Aplica a todos los tipos de OT.
- **Impacto legal:** La firma del receptor valida la conformidad del servicio prestado.

### REGLA 86 — Cámara Nativa con Visor en Vivo
- **Archivo fuente:** `CameraModal.tsx`, líneas 19-48 (startCamera), 59-78 (takePhoto).
- **Características:** Solicita permisos `getUserMedia`, resolución ideal 1280x720, captura JPEG al 85%, cambio frontal/trasera (`facingMode`), flip horizontal en selfie.
- **Impacto:** Experiencia de cámara nativa sin depender del selector de archivos del SO.

---

## 🔍 IX. SUPERVISIÓN Y AUDITORÍA (87-93)

### REGLA 87 — Jerarquía de Supervisión
- **Qué dice:** Un Supervisor solo ve OTs de técnicos que tienen su ID en `supervisorId`.
- **Archivo fuente:** `SupervisarPage.tsx`, líneas 91-97.
- **Lógica:** `const reportsToMe = user?.id === tech?.supervisorId || user?.rol === 'Admin'`.
- **Impacto:** Segregación total de responsabilidades de supervisión.

### REGLA 88 — Filtro de Técnicos por Supervisor
- **Qué dice:** El dropdown de filtro de técnicos muestra solo los que reportan al supervisor actual.
- **Archivo fuente:** `SupervisarPage.tsx`, línea 180: `.filter(u => user?.rol === 'Admin' || u.supervisorId === user?.id)`.

### REGLA 89 — Cierre Definitivo (Inmutabilidad)
- **Qué dice:** Al hacer clic en "TERMINAR" y confirmar, la OT cambia a estatus `'Terminada'` con fecha/hora exacta.
- **Archivo fuente:** `SupervisarPage.tsx`, líneas 120-151, función `handleFinalize`.
- **Confirmación:** Requiere `window.confirm("¿Autorizar el CIERRE definitivo de esta OT?")`.
- **Campos grabados:** `fechas.terminada` (ISO), `fechas.terminadaFecha` (dd/mm/yyyy), `fechas.terminadaHora` (HH:mm).
- **Impacto:** Registro cerrado. No editable por ningún rol en la interfaz estándar.

### REGLA 90 — Auto-Generación de PDF al Cerrar
- **Qué dice:** Inmediatamente después de marcar "Terminada", el sistema genera y descarga el PDF.
- **Archivo fuente:** `SupervisarPage.tsx`, línea 143: `await handleDownloadPdf(updatedOT)`.
- **Secuencia:** Primero graba en DB → Luego genera PDF con datos actualizados.

### REGLA 91 — Bitácora de Auditoría por OT
- **Qué dice:** Cada cambio genera un registro en la colección `bitacora`.
- **Archivo fuente:** `dataService.ts`, líneas 190-196 (`logBitacora` y `addBitacoraEntry`).
- **Estructura:** `{ otId, otNumero, fecha, usuarioId, usuarioNombre, accion, campo, valorAnterior, valorNuevo }`.

### REGLA 92 — Campos Auditados
- **Qué dice:** Se rastrean cambios en: `descripcionFalla`, `justificacion`, `prioridad`, `tecnicoId`, `descripcionServicio`, `repuestosUtilizados`, `fechas.programada`.
- **Archivo fuente:** `dataService.ts`, líneas 215-218.

### REGLA 93 — Timestamp en Updates
- **Qué dice:** Todo `updateWorkOrder` añade `updatedAt`.
- **Archivo fuente:** `dataService.ts`, línea 204: `{ ...data, updatedAt: new Date().toISOString() }`.

---

## 📅 X. MANTENIMIENTO PREVENTIVO (94-100)

### REGLA 94 — Plan Estático 2026
- **Qué dice:** El plan preventivo se carga desde `planPreventivo2026` en Firestore. Es una proyección estática.
- **Archivo fuente:** `dataService.ts`, líneas 253-256, `getPlanPreventivo()`.

### REGLA 95 — Proyección Trimestral (90 Días)
- **Qué dice:** El calendario siempre muestra una ventana de 3 meses.
- **Archivo fuente:** `PreventivosPage.tsx` — lógica de renderizado de vistas.

### REGLA 96 — Conversión Preventivo → OT Real
- **Qué dice:** Un preventivo proyectado NO es una OT hasta que el Coordinador confirma la generación.
- **Archivo fuente:** `dataService.ts`, líneas 133-168, `createMassivePreventiveOTs()`.
- **Datos auto-generados:** `tipo: 'Preventivo'`, `estatus: 'Asignada'`, `prioridad: 'BAJA'`, `solicitanteId: 'SYSTEM_PLANNER'`.

### REGLA 97 — Generación Masiva de OTs
- **Qué dice:** Se generan OTs para todos los equipos de una sucursal en una operación.
- **Archivo fuente:** `dataService.ts`, líneas 139-167.
- **Implementación:** `Promise.all(equipmentIds.map(...))` — cada equipo obtiene su propio folio atómico.

### REGLA 98 — Detección de Duplicados
- **Qué dice:** Antes de generar, se consultan OTs existentes con `preventivoPlanId` igual al evento.
- **Archivo fuente:** `dataService.ts`, líneas 170-174, `getExistingOTsForEvent()`.
- **Impacto:** Evita crear 2x OTs para el mismo equipo en el mismo evento preventivo.

### REGLA 99 — Bitácora de Calendario Preventivo
- **Qué dice:** Todo cambio en el plan preventivo genera registro en `bitacoraPreventivos2026`.
- **Archivo fuente:** `dataService.ts`, líneas 258-301, `updatePreventivoPlan()`.
- **Campos auditados:** `mes`, `fechas`, `sucursalId`, `franquiciaId`, `txtPDF`.

### REGLA 100 — Undo de Un Solo Paso
- **Qué dice:** Solo se permite revertir el último cambio. La reversión restaura valores anteriores y elimina el registro de audit.
- **Archivo fuente:** `dataService.ts`, líneas 304-319, `undoPreventivoChange()`.
- **Implementación:** Lee `detalles[].anterior` del audit entry, aplica `updateDoc`, luego `deleteDoc` del registro.

---

## 📊 XI. INTELIGENCIA DE NEGOCIO — BONUS (101-110)

### REGLA 101 — Factor de Mantenimiento (Semáforo)
- **Qué dice:** Preventivo > Correctivo = Verde (salud operativa). Correctivo > Preventivo = Rojo (crisis reactiva).
- **Archivo fuente:** `DashboardBIPage.tsx` (cálculo del factor) + `generateExecutiveReport.ts` (color dinámico en PDF).

### REGLA 102 — Umbral de Saturación (50%)
- **Qué dice:** Alerta visual si la carga supera el 50% de la capacidad promedio.
- **Archivo fuente:** `DashboardBIPage.tsx` — sección Smart Insights "Carga".

### REGLA 103 — Filtros Combinados 7D en Kardex
- **Qué dice:** Búsqueda por texto, Sucursal, Estatus, Técnico, Prioridad, Tipo y Rango de Fechas simultáneamente.
- **Archivo fuente:** `KardexPage.tsx`, líneas 116-132.
- **Impacto:** Análisis multidimensional sin herramientas externas.

### REGLA 104 — Ordenamiento Bidireccional
- **Qué dice:** El Kardex permite ordenar por número de OT ascendente o descendente.
- **Archivo fuente:** `KardexPage.tsx`, líneas 129-132.

### REGLA 105 — Deep Linking por URL
- **Qué dice:** Soporte para `?id=` (ID de document) y `?ot=` (número) en la URL.
- **Archivo fuente:** `KardexPage.tsx`, líneas 102-114.
- **Impacto:** Se puede compartir un link directo a una OT específica.

### REGLA 106 — Permisos de Edición por Rol y Estado (`canEditField`)
- **Qué dice:** Función que controla granularmente qué campos puede tocar cada rol según estatus.
- **Archivo fuente:** `KardexPage.tsx`, líneas 191-211.
- **Admin:** Puede todo, siempre.
- **Coordinador:** Solo `prioridad`, `tecnicoId`, `fechas.programada` y solo si la OT no ha llegado a sitio.
- **Gerente:** Solo `descripcionFalla`, `justificacion`, `fotosGerente`, `equipoId`, `familia` y solo en "Pendiente".
- **Técnico:** No puede editar nada en Kardex.

### REGLA 107 — Visibilidad del Botón Editar (`shouldShowEditControl`)
- **Archivo fuente:** `KardexPage.tsx`, líneas 213-226.
- **Gerente:** Solo ve el lápiz en OTs "Pendiente".
- **Coordinador:** Lo ve en "Pendiente" y "Asignada".
- **Admin:** Siempre visible.

### REGLA 108 — Fallback de Cliente por Sucursal
- **Qué dice:** Si el PDF no encuentra el cliente por `ot.clienteId`, intenta obtenerlo via `sucursal.clienteId`.
- **Archivo fuente:** `KardexPage.tsx`, líneas 144-147.
- **Impacto:** Previene PDFs vacíos por inconsistencias de datos históricos.

### REGLA 109 — Diagnóstico de Datos Faltantes para PDF
- **Qué dice:** Si faltan datos maestros, el sistema notifica exactamente cuáles faltan.
- **Archivo fuente:** `KardexPage.tsx`, líneas 161-165.
- **Mensaje tipo:** "No se pudo generar el PDF: Faltan datos maestros (Cliente, Equipo)."

### REGLA 110 — Reporte Ejecutivo PDF Landscape
- **Qué dice:** `generateExecutiveReport` crea un PDF corporativo en modo landscape con los 5 insights del dashboard.
- **Archivo fuente:** `generateExecutiveReport.ts`.
- **Características:** Título corporativo, bloques de insight con formato JSON decodificado, bloque de volumen con color dinámico (rojo si factor negativo, verde si positivo).

---

## 🔒 REGLA TRANSVERSAL: BITÁCORA DE ACCESO RESTRINGIDO
- **Qué dice:** Solo Admin y Coordinador pueden consultar la Bitácora del Sistema.
- **Archivo fuente:** `BitacoraPage.tsx`, líneas 16 y 32-39.
- **Si no autorizado:** Muestra pantalla "ACCESO RESTRINGIDO" con ícono `AlertTriangle`.
- **Límite de registros:** Últimos 100 eventos, ordenados por `otNumero` descendente.

---

> *"La Cruda Realidad y el Apego a la Veracidad es lo Único que nos Hace Libres."*
> **— Héctor A. Celis L. | Constitución H-GESTIÓN v3.0**
