-- No reconstruye hechos anteriores ni duplica decisiones autoritativas de V5.
CREATE TABLE gestion.eventos_historial (
    id uuid PRIMARY KEY,
    tipo_recurso varchar(10) NOT NULL CHECK (tipo_recurso IN ('SOLICITUD','PROVEEDOR')),
    recurso_id uuid NOT NULL,
    solicitud_id uuid REFERENCES gestion.solicitudes(id),
    proveedor_id uuid REFERENCES gestion.proveedores(id),
    accion varchar(30) NOT NULL,
    actor_id uuid NOT NULL REFERENCES gestion.usuarios(id),
    actor_nombre_visible varchar(120) NOT NULL CHECK (char_length(btrim(actor_nombre_visible)) BETWEEN 1 AND 120),
    version_anterior bigint,
    version_resultante bigint NOT NULL CHECK (version_resultante >= 0),
    estado_anterior varchar(12),
    estado_resultante varchar(12) NOT NULL,
    ocurrido_en timestamptz NOT NULL,
    peticion_id uuid,
    CONSTRAINT historial_recurso CHECK (
      (tipo_recurso='SOLICITUD' AND solicitud_id IS NOT NULL AND recurso_id=solicitud_id AND proveedor_id IS NULL)
      OR (tipo_recurso='PROVEEDOR' AND proveedor_id IS NOT NULL AND recurso_id=proveedor_id AND solicitud_id IS NULL)),
    CONSTRAINT historial_transicion CHECK (
      (accion='PROVEEDOR_CREADO' AND tipo_recurso='PROVEEDOR' AND version_anterior IS NULL AND version_resultante=0 AND estado_anterior IS NULL AND estado_resultante='ACTIVO')
      OR (accion='BORRADOR_CREADO' AND tipo_recurso='SOLICITUD' AND version_anterior IS NULL AND version_resultante=0 AND estado_anterior IS NULL AND estado_resultante='BORRADOR')
      OR (version_anterior IS NOT NULL AND version_anterior>=0 AND version_resultante=version_anterior+1 AND estado_anterior IS NOT NULL AND (
        (accion='PROVEEDOR_MODIFICADO' AND tipo_recurso='PROVEEDOR' AND estado_anterior IN ('ACTIVO','INACTIVO') AND estado_resultante=estado_anterior)
        OR (accion='PROVEEDOR_DESACTIVADO' AND tipo_recurso='PROVEEDOR' AND estado_anterior='ACTIVO' AND estado_resultante='INACTIVO')
        OR (accion='PROVEEDOR_REACTIVADO' AND tipo_recurso='PROVEEDOR' AND estado_anterior='INACTIVO' AND estado_resultante='ACTIVO')
        OR (accion='BORRADOR_GUARDADO' AND tipo_recurso='SOLICITUD' AND estado_anterior='BORRADOR' AND estado_resultante='BORRADOR')
        OR (accion='SOLICITUD_PRESENTADA' AND tipo_recurso='SOLICITUD' AND estado_anterior='BORRADOR' AND estado_resultante='PRESENTADA')))),
    UNIQUE (tipo_recurso,recurso_id,version_resultante)
);
CREATE INDEX historial_recurso_fecha_idx ON gestion.eventos_historial(tipo_recurso,recurso_id,ocurrido_en DESC,id DESC);
CREATE INDEX historial_fecha_idx ON gestion.eventos_historial(ocurrido_en DESC,id DESC);
CREATE INDEX historial_actor_fecha_idx ON gestion.eventos_historial(actor_id,ocurrido_en DESC,id DESC);
CREATE INDEX historial_accion_fecha_idx ON gestion.eventos_historial(accion,ocurrido_en DESC,id DESC);
GRANT SELECT, INSERT ON gestion.eventos_historial TO gestion_app;
COMMENT ON TABLE gestion.eventos_historial IS 'Hechos nuevos desde V7, sin backfill ni decisiones duplicadas. App SELECT/INSERT; sin purga automática. Administradores DB pueden alterar datos; no es integridad criptográfica';
