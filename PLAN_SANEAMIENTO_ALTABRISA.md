# Plan de Saneamiento: Operación Rescate Altabrisa (Integridad 360°)

Héctor, he diseñado el plan definitivo para sanar las 95 OTs y los 65 equipos afectados, integrando tu solución de cruce con Bitácora y el diccionario de datos original.

### 🎯 Objetivos y Estrategias
1.  **Reconexión de Solicitante**: Asignar a "Gerente BP Altabrisa" (`empiiN18VlLXZlXq45i4`) como el solicitante de todas las 95 OTs en Altabrisa.
2.  **Normalización de IDs de Sucursal**: Cambiar los shortcodes `"BA"` por el ID real de Firebase (`21lgUGdfGA5OBjVMo1ee`).
3.  **Rescate de Identidad de Equipos**: Restaurar el nombre real de los 65 equipos de Altabrisa que se muestran como "Equipo sin nombre".
    - **Cruce de Datos**: Se usará el `idInterno` (ej. `BA-17`) para buscar en `restore_altabrisa_model.cjs` el nombre original (`BA-Nevera de pizza (1)`).
4.  **Saneamiento de OTs Correctivas**: Vincular las 5 OTs recientes (1021-1025) a sus dependencias reales basándose en el historial de creación del día de hoy.

### 🛡️ Medidas de Seguridad (Directrices Primarias)
- **Backup Previo**: Script genera `BACKUP_SANEAMIENTO_ALTABRISA.json`.
- **Dry-Run**: Muestra exactamente qué campo cambia de qué valor a qué valor.
- **Sin Altas/Bajas**: **Cero tolerancia a crear o borrar registros**. Solo se modifican campos existentes.

---

### Script de Ejecución Planeada
He preparado el script `src/scripts/saneamiento_supremo.cjs` con esta lógica.

**¿Deseas que ejecute el DRY-RUN ahora mismo para que revises los 94 cambios planeados antes de tocarlos en la base de datos?**
