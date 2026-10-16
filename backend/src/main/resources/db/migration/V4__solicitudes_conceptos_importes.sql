CREATE SEQUENCE gestion.numero_solicitud_seq MINVALUE 1 MAXVALUE 999999 NO CYCLE;
CREATE TABLE gestion.solicitudes (
    id uuid PRIMARY KEY,
    numero varchar(15) NOT NULL UNIQUE CHECK (numero ~ '^SOL-[0-9]{4}-[0-9]{6}$'),
    autor_id uuid NOT NULL REFERENCES gestion.usuarios(id),
    proveedor_id uuid REFERENCES gestion.proveedores(id),
    supervisor_id uuid REFERENCES gestion.usuarios(id),
    asunto varchar(160) NOT NULL CHECK (char_length(btrim(asunto)) BETWEEN 3 AND 160),
    descripcion varchar(2000),
    moneda varchar(3) NOT NULL CHECK (moneda = 'EUR'),
    estado varchar(12) NOT NULL CHECK (estado IN ('BORRADOR','PRESENTADA')),
    total numeric(15,2) NOT NULL CHECK (total BETWEEN 0 AND 9999999999999.99),
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    proveedor_denominacion varchar(160),
    proveedor_pais_fiscal varchar(2),
    proveedor_identificador_fiscal varchar(64),
    proveedor_tipo varchar(20),
    creado_en timestamptz NOT NULL,
    actualizado_en timestamptz NOT NULL,
    presentado_en timestamptz,
    CONSTRAINT solicitud_fechas CHECK (actualizado_en >= creado_en AND (presentado_en IS NULL OR (presentado_en >= creado_en AND presentado_en <= actualizado_en))),
    CONSTRAINT solicitud_presentacion CHECK (
      (estado = 'BORRADOR' AND presentado_en IS NULL AND proveedor_denominacion IS NULL AND proveedor_pais_fiscal IS NULL AND proveedor_identificador_fiscal IS NULL AND proveedor_tipo IS NULL)
      OR (estado = 'PRESENTADA' AND presentado_en IS NOT NULL AND proveedor_id IS NOT NULL AND supervisor_id IS NOT NULL AND supervisor_id <> autor_id AND total > 0 AND proveedor_denominacion IS NOT NULL AND proveedor_pais_fiscal IS NOT NULL AND proveedor_identificador_fiscal IS NOT NULL AND proveedor_tipo IS NOT NULL AND proveedor_tipo IN ('PERSONA_JURIDICA','PROFESIONAL')))
);
CREATE TABLE gestion.conceptos_solicitud (
    id uuid PRIMARY KEY,
    solicitud_id uuid NOT NULL REFERENCES gestion.solicitudes(id),
    descripcion varchar(300) NOT NULL CHECK (char_length(btrim(descripcion)) BETWEEN 1 AND 300),
    cantidad numeric(15,3) NOT NULL CHECK (cantidad > 0),
    unidad varchar(12) NOT NULL CHECK (unidad IN ('UNIDAD','HORA','DIA','MES','KILOGRAMO','LITRO','METRO','SERVICIO')),
    precio_unitario numeric(15,4) NOT NULL CHECK (precio_unitario > 0),
    importe_linea numeric(15,2) NOT NULL CHECK (importe_linea BETWEEN 0 AND 9999999999999.99 AND importe_linea = round(cantidad * precio_unitario, 2)),
    posicion integer NOT NULL CHECK (posicion > 0),
    UNIQUE (solicitud_id, posicion)
);
CREATE TABLE gestion.operaciones_idempotentes_solicitud (
    usuario_id uuid NOT NULL REFERENCES gestion.usuarios(id),
    clave uuid NOT NULL,
    solicitud_id uuid NOT NULL REFERENCES gestion.solicitudes(id),
    operacion varchar(20) NOT NULL CHECK (operacion = 'PRESENTAR'),
    huella varchar(64) NOT NULL CHECK (huella ~ '^[0-9a-f]{64}$'),
    resultado_numero varchar(15) NOT NULL,
    resultado_estado varchar(12) NOT NULL CHECK (resultado_estado = 'PRESENTADA'),
    resultado_version bigint NOT NULL CHECK (resultado_version > 0),
    resultado_actualizado_en timestamptz NOT NULL,
    resultado_presentado_en timestamptz NOT NULL,
    resultado_moneda varchar(3) NOT NULL CHECK (resultado_moneda = 'EUR'),
    resultado_total numeric(15,2) NOT NULL CHECK (resultado_total > 0),
    creado_en timestamptz NOT NULL,
    expira_en timestamptz,
    PRIMARY KEY (usuario_id, clave),
    CHECK (expira_en IS NULL OR expira_en > creado_en)
);
CREATE INDEX solicitudes_autor_actualizacion_idx ON gestion.solicitudes(autor_id, actualizado_en DESC, id);
CREATE INDEX solicitudes_supervisor_estado_idx ON gestion.solicitudes(supervisor_id, estado, actualizado_en DESC, id);
CREATE INDEX solicitudes_proveedor_idx ON gestion.solicitudes(proveedor_id);
CREATE INDEX solicitudes_estado_actualizacion_idx ON gestion.solicitudes(estado, actualizado_en DESC, id);
CREATE INDEX solicitudes_actualizacion_idx ON gestion.solicitudes(actualizado_en DESC, id);
CREATE INDEX solicitudes_creacion_idx ON gestion.solicitudes(creado_en, id);
CREATE INDEX solicitudes_importe_idx ON gestion.solicitudes(total, id);
CREATE INDEX operaciones_solicitud_idx ON gestion.operaciones_idempotentes_solicitud(solicitud_id);
GRANT USAGE, SELECT ON SEQUENCE gestion.numero_solicitud_seq TO gestion_app;
GRANT SELECT, INSERT, UPDATE ON gestion.solicitudes TO gestion_app;
GRANT SELECT, INSERT, DELETE ON gestion.conceptos_solicitud TO gestion_app;
GRANT SELECT, INSERT ON gestion.operaciones_idempotentes_solicitud TO gestion_app;

-- Bloquea las referencias actuales sin conceder modificación de roles a la aplicación.
CREATE FUNCTION gestion.supervisor_para_presentacion(identificador uuid)
RETURNS TABLE(id uuid, nombre_visible varchar, habilitado boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, gestion AS $$
    SELECT u.id, u.nombre_visible, u.habilitado
    FROM gestion.usuarios u JOIN gestion.usuarios_roles r ON r.usuario_id = u.id
    WHERE u.id = identificador AND r.rol = 'SUPERVISOR'
    FOR SHARE OF u, r
$$;
REVOKE ALL ON FUNCTION gestion.supervisor_para_presentacion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION gestion.supervisor_para_presentacion(uuid) TO gestion_app;
COMMENT ON TABLE gestion.operaciones_idempotentes_solicitud IS 'Presentación local004; resultado original inmutable. Sin expiración ni purga automática; política pendiente006/007/008';
