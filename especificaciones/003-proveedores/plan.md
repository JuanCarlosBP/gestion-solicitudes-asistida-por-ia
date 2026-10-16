# Plan — 003 Proveedores

**Estado:** Aprobado por decisión humana AG-011
**Fuente:** [especificación](especificacion.md), autorización integral AG-011.

## Secuencia y escritores

Precondición/huellas → SDD y ADR → backend/frontend tras contrato → pruebas
enfocadas/regresión → Compose/E2E/CI/auditorías/docs → revisión independiente → cierre.
Un escritor por archivo: backend posee backend/**; frontend frontend/**;
coordinador docs/especificaciones/README/MEMORY/infraestructura/QA/CI.
Evidencias separadas por prefijo en AG-011. Revisor no corrige. No se presupone
aislamiento técnico por nombre de rol. Sin Git ni cambios en históricos protegidos.

## Diseño

Monolito modular Java 21/Spring existente. Paquete proveedores: dominio
(validación, fiscal, permisos, estados/versiones), aplicación (casos transaccionales
y puerto), persistencia (JdbcTemplate parametrizado), HTTP (DTO cerrado, controladores,
errores/OpenAPI). Reutilizar identidad, Clock, Security/CSRF. Sin JPA/Redis ni capas vacías.

V3 crea gestion.proveedores: UUID PK, tipo cerrado, denominacion varchar160,
pais_fiscal varchar2, identificador_fiscal y normalizado varchar64, contactos opcionales
varchar254/32, activo boolean, version bigint y fechas timestamptz. NOT NULL,
longitudes, país mayúsculo, versión no negativa, fechas coherentes y unique compuesto
incluyendo inactivos. Índices por activo/país y órdenes denominación/creación/actualización
con id. Grant SELECT/INSERT/UPDATE a gestion_app, sin DELETE/DDL.
Sin extensión nueva: contiene puede recorrer filas; 50.000 es previsión, no medición.

SQL UPDATE condicionado por id/version e incremento de versión. Restricción
PostgreSQL garantiza duplicado concurrente. No registrar SQL ni datos al traducir
error. Comprobar versión antes de no-op de estado; decisión atómica frente a carreras.
UUID/Clock servidor, eventos tras resultado persistido y sin duplicar modificaciones.
Contrato íntegro en especificación. Rechazar extras/internos/tipos inválidos y
coerciones inseguras de versión. LIKE con comodines escapados; sort en mapa cerrado.

Angular reutiliza guard/store/interceptor/XSRF. Tipos/servicio/listado/detalle/formulario
alta-edición. Rutas específicas antes de :id. Filtros query params, navegación,
paginación/orden, conservar entrada tras error, foco accesible y recarga tras conflicto.
Interpolación segura, sin innerHTML ni nuevas librerías visuales.

## Verificación y cierre

Unitarias Unicode/ISO/límites/permisos/estados/versiones; HTTP por operación/rol;
PostgreSQL con conexiones sincronizadas para carreras, migraciones/roles/logs.
Conservar regresión 001/002; adaptar solo expectativas actuales de rutas/tablas/V3,
nunca documentos cerrados ni evidencias históricas. Frontend servicio/componentes/
rutas/estados y doce pasos E2E con datos ficticios, sin trazas de credenciales.
Coordinador controla único conjunto Compose y preserva volumen existente.

Verify íntegro, tipos/lint/formato/tests/build, Docker sin caché, Compose
200/503/recuperación, sesiones/persistencia/Swagger/E2E, auditorías, actionlint,
enlaces/secretos acotados. Fallo → causa → corrección → prueba enfocada → regresión.
Máximo dos correcciones fallidas por problema, bloquear solo criterio afectado
mientras haya trabajo autorizado independiente. Reserva de treinta minutos para cierre.

Actualizar documentación técnica/seguridad/amenazas/OWASP parcial, índices, CI,
informe/CSV AG-011, validación y MEMORY. Huellas SHA-256 inicial/final sustituyen
Git con alcance temporal explícito. CI remota, aceptación/integración pendientes humanas.

Elección técnica: pais_fiscal usa varchar(2) con CHECK de dos letras mayúsculas
en lugar del char(2) propuesto para evitar padding; conserva el dominio exacto.
