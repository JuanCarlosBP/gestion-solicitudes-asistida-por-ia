-- Evolución aditiva: no recalcula hashes ni altera resultados confirmados 004/005.
ALTER TABLE gestion.operaciones_idempotentes_solicitud
    ADD COLUMN version_huella smallint NOT NULL DEFAULT 1 CHECK (version_huella IN (1,2)),
    ADD COLUMN recurso_id uuid,
    ADD COLUMN proveedor_id uuid REFERENCES gestion.proveedores(id),
    ADD COLUMN estado_http smallint NOT NULL DEFAULT 200 CHECK (estado_http IN (200,201)),
    ADD COLUMN resultado_json jsonb;
UPDATE gestion.operaciones_idempotentes_solicitud SET recurso_id=solicitud_id;
ALTER TABLE gestion.operaciones_idempotentes_solicitud
    ALTER COLUMN recurso_id SET NOT NULL,
    ALTER COLUMN solicitud_id DROP NOT NULL,
    ALTER COLUMN resultado_numero DROP NOT NULL,
    ALTER COLUMN resultado_presentado_en DROP NOT NULL,
    ALTER COLUMN resultado_moneda DROP NOT NULL,
    ALTER COLUMN resultado_total DROP NOT NULL,
    DROP CONSTRAINT operaciones_idempotentes_solicitud_resultado_version_check,
    DROP CONSTRAINT operacion_resultado_coherente;
ALTER TABLE gestion.operaciones_idempotentes_solicitud
    ADD CONSTRAINT operacion_version_no_negativa CHECK (resultado_version >= 0),
    ADD CONSTRAINT operacion_resultado_coherente CHECK (
        (operacion IN ('PRESENTAR','APROBAR','RECHAZAR')
         AND solicitud_id IS NOT NULL AND recurso_id=solicitud_id AND proveedor_id IS NULL
         AND estado_http=200 AND resultado_json IS NULL AND resultado_numero IS NOT NULL
         AND resultado_presentado_en IS NOT NULL AND resultado_moneda IS NOT NULL AND resultado_moneda='EUR'
         AND resultado_total IS NOT NULL AND resultado_total>0 AND resultado_version>0
         AND ((operacion='PRESENTAR' AND resultado_estado='PRESENTADA' AND resultado_decidido_en IS NULL
               AND resultado_actualizado_en=resultado_presentado_en)
              OR (operacion IN ('APROBAR','RECHAZAR') AND resultado_decidido_en IS NOT NULL
                  AND resultado_actualizado_en=resultado_decidido_en AND resultado_decidido_en>=resultado_presentado_en
                  AND ((operacion='APROBAR' AND resultado_estado='APROBADA')
                       OR (operacion='RECHAZAR' AND resultado_estado='RECHAZADA')))))
        OR (operacion='CREAR_BORRADOR' AND version_huella=2 AND solicitud_id IS NOT NULL
            AND recurso_id=solicitud_id AND proveedor_id IS NULL AND estado_http=201
            AND resultado_estado='BORRADOR' AND resultado_version=0 AND resultado_numero IS NOT NULL
            AND resultado_presentado_en IS NULL AND resultado_decidido_en IS NULL
            AND resultado_moneda IS NULL AND resultado_total IS NULL
            AND resultado_json IS NOT NULL AND jsonb_typeof(resultado_json)='object')
        OR (operacion IN ('CREAR_PROVEEDOR','DESACTIVAR_PROVEEDOR','REACTIVAR_PROVEEDOR')
            AND version_huella=2 AND proveedor_id IS NOT NULL AND recurso_id=proveedor_id
            AND solicitud_id IS NULL AND resultado_numero IS NULL AND resultado_presentado_en IS NULL
            AND resultado_decidido_en IS NULL AND resultado_moneda IS NULL AND resultado_total IS NULL
            AND resultado_json IS NOT NULL AND jsonb_typeof(resultado_json)='object'
            AND ((operacion='CREAR_PROVEEDOR' AND estado_http=201 AND resultado_estado='ACTIVO' AND resultado_version=0)
                 OR (operacion='DESACTIVAR_PROVEEDOR' AND estado_http=200 AND resultado_estado='INACTIVO')
                 OR (operacion='REACTIVAR_PROVEEDOR' AND estado_http=200 AND resultado_estado='ACTIVO'))));
CREATE INDEX operaciones_recurso_idx ON gestion.operaciones_idempotentes_solicitud(recurso_id);

-- Solo roles y habilitación vigentes; estabiliza su autorización hasta commit.
CREATE FUNCTION gestion.roles_para_operacion(identificador uuid)
RETURNS TABLE(rol varchar)
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,gestion AS $$
    SELECT r.rol FROM gestion.usuarios u JOIN gestion.usuarios_roles r ON r.usuario_id=u.id
    WHERE u.id=identificador AND u.habilitado FOR SHARE OF u,r
$$;
REVOKE ALL ON FUNCTION gestion.roles_para_operacion(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION gestion.roles_para_operacion(uuid) TO gestion_app;
COMMENT ON TABLE gestion.operaciones_idempotentes_solicitud IS 'Resultados inmutables transversales006; ámbito usuario+clave, huellas1 legado y2 canónica. SELECT/INSERT solamente. Sin purga automática; archivo/tombstone y retención jurídica pendientes007/008';
