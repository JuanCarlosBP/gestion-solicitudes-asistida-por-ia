-- El esquema y el rol migrador se preparan con permisos de administración
-- antes de arrancar. La aplicación no puede ejecutar DDL ni leer el historial.
REVOKE ALL ON SCHEMA gestion FROM PUBLIC;
GRANT USAGE ON SCHEMA gestion TO gestion_app;
COMMENT ON SCHEMA gestion IS 'Estructura técnica de Gestión de Solicitudes; sin tablas de negocio';
