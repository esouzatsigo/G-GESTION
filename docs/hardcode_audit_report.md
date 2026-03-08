# Auditoría de Hardcode - H-GESTION

Este reporte detalla los valores "hardcoded" (código duro) encontrados en la aplicación que deberían ser dinámicos o configurables.

## Caso Crítico: Boston's Pizza

Se han detectado múltiples referencias estáticas a "Boston's" que explican por qué algunos cambios en el catálogo de franquicias no se reflejan uniformemente.

| Archivo | Línea | Contenido | Observación |
| :--- | :--- | :--- | :--- |
| `LoginPage.tsx` | 102 | `Sistema de Mantenimiento Boston's & Co.` | Texto estático en el pie de página de login. |
| `RoleSelectionPage.tsx` | 59 | `title: 'Gerente Boston\'s'` | Rol de prueba con nombre específico de sucursal. |
| `PreventivosPage.tsx` | 84, 101, 117, 133 | `txtPDF: 'Camp Bostons'` | **Error detectado**: Aquí dice "Bostons" sin apóstrofe, lo que genera inconsistencia en los reportes PDF. |
| `MainLayout.tsx` | 207 | `H-GESTION` (Logo) | Aunque es el nombre del sistema, si se requiere personalización por cliente, debería ser dinámico. |
| `useAuth.tsx` | 98-106 | Usuarios Mock (ivango, gerente.ba, etc.) | Usuarios de prueba con correos de `@bpt.com` y nombres como `GERENTE BA`. |

## Otros Hardcodes Detectados

### 1. Especialidades de Técnicos
En `UsuariosPage.tsx` (Línea 48):
```typescript
const especialidades: User['especialidad'][] = ['Aires', 'Coccion', 'Refrigeracion', 'Cocina', 'Restaurante', 'Local', 'Agua', 'Generadores'];
```
Estas especialidades están fijas en el código. Si el cliente requiere una nueva (ej. "Electricidad"), requiere un cambio de código.

### 2. Roles del Sistema
En `UsuariosPage.tsx` (Línea 47):
```typescript
const roles: UserRole[] = ['Admin', 'Coordinador', 'Gerente', 'Supervisor', 'Tecnico', 'TecnicoExterno'];
```
Los roles están limitados por una constante local.

### 3. Configuración de Folios
En `dataService.ts` (Línea 157):
```typescript
const defaultValue = tipo === 'Correctivo' ? 1000 : 1;
```
El folio inicial (1000) está fijo.

## Respuesta Fundamentada: Problema de Etiquetas de Franquicia

**Pregunta**: ¿Por qué si actualicé "BOSTONS PIZZA" a "Boston's Pizza" sigue apareciendo el nombre anterior en algunas etiquetas?

**Análisis**:
1.  **Transformación CSS**: En `SucursalesPage.tsx` (Línea 371), la etiqueta de franquicia tiene `textTransform: 'uppercase'`. Esto convierte cualquier entrada ("Boston's Pizza") en "BOSTON'S PIZZA".
2.  **Inconsistencia de Datos**: En `PreventivosPage.tsx`, se encontró el texto `'Camp Bostons'` (sin apóstrofe). Si el usuario está viendo reportes preventivos o listas derivadas de esta configuración, verá la versión sin el cambio.
3.  **Relación de IDs**: Si el cambio se hizo en el *nombre* de la franquicia pero existen múltiples registros de franquicia (ej. un duplicado con ID distinto), es posible que las sucursales sigan apuntando al registro "viejo" o inconsistente.

**Acción Correctiva**:
- Eliminar `textTransform: 'uppercase'` de los badges para respetar el casing elegido por el usuario.
- Unificar todos los registros de "Boston's Pizza" bajo un mismo ID y nombre corregido.
