# 📔 Directrices Primarias de Operación - H-GESTION

Este documento contiene las reglas de negocio inmutables para la operación y mantenimiento del sistema H-GESTION, con especial énfasis en la integridad de datos y seguridad.

## 🚨 Reglas de Oro para Base de Datos
1. **Autorización Obligatoria**: TODO cambio a la base de datos (Firestore u otros) debe ser expresamente autorizado por el usuario Hector Alejandro Celis L. antes de su ejecución.
2. **Previsión de Impacto (Backup/Dry-run)**: Antes de cualquier modificación a la base de datos, es obligatorio realizar:
   - Un **dry-run** (simulación del cambio sin impacto real).
   - O un **backup previo** de, al menos, el rango de datos involucrados en la actualización.
3. **Reversibilidad Garantizada**: Toda afectación a la base de datos debe poder ser revertida o recuperada si fuera necesario. Se debe contar con los scripts o procesos de restauración listos antes de ejecutar el cambio.
4. **Auditabilidad**: Cada modificación debe ser registrada detallando qué se cambió, por qué y el estado previo/posterior.

## 🔐 Identidad y Seguridad
1. **Identidad Veraz**: El sistema siempre debe mostrar la identidad real del usuario (Empresa sobre Nombre) en el encabezado.
2. **Aislamiento Multi-tenant**: Prohibido el acceso o visualización de datos de otros clientes (clienteId) a menos que se trate de un Admin General en modo impersonación autorizado.
3. **Cero Tolerancia a Fantasmas**: No permitir residuos de sesiones anteriores o datos de localStorage que contradigan la "Verdad Técnica" de Firestore.
17. **Auditoría de Acero**: Toda auditoría es PROFUNDA y debe incluir todo lo posible para dar resultados precisos, completos y confiables. No se aceptan análisis superficiales ("Cabeza de chorlito").
18. **Estimación de Tiempo**: Si cualquier tarea, análisis o generación de planes se estima que tomará más de 3 minutos, se debe informar al usuario el tiempo estimado antes de proceder.

---
*Cualquier código o script generado debe cumplir estrictamente con estas directrices.*
