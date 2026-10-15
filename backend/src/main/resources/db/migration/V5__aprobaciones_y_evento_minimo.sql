ALTER TABLE gestion.solicitudes DROP CONSTRAINT solicitudes_estado_check;
ALTER TABLE gestion.solicitudes ADD CONSTRAINT solicitudes_estado_check
    CHECK (estado IN ('BORRADOR','PRESENTADA','APROBADA','RECHAZADA'));
ALTER TABLE gestion.solicitudes DROP CONSTRAINT solicitud_presentacion;
ALTER TABLE gestion.solicitudes ADD CONSTRAINT solicitud_presentacion CHECK (
    (estado = 'BORRADOR' AND presentado_en IS NULL AND proveedor_denominacion IS NULL
      AND proveedor_pais_fiscal IS NULL AND proveedor_identificador_fiscal IS NULL AND proveedor_tipo IS NULL)
    OR (estado IN ('PRESENTADA','APROBADA','RECHAZADA') AND presentado_en IS NOT NULL
      AND proveedor_id IS NOT NULL AND supervisor_id IS NOT NULL AND supervisor_id <> autor_id
      AND total > 0 AND proveedor_denominacion IS NOT NULL AND proveedor_pais_fiscal IS NOT NULL
      AND proveedor_identificador_fiscal IS NOT NULL AND proveedor_tipo IS NOT NULL
      AND proveedor_tipo IN ('PERSONA_JURIDICA','PROFESIONAL'))
);

CREATE TABLE gestion.decisiones_solicitud (
    id uuid PRIMARY KEY,
    solicitud_id uuid NOT NULL UNIQUE REFERENCES gestion.solicitudes(id),
    actor_id uuid NOT NULL REFERENCES gestion.usuarios(id),
    actor_nombre_visible varchar(120) NOT NULL CHECK (char_length(btrim(actor_nombre_visible)) BETWEEN 1 AND 120),
    tipo varchar(10) NOT NULL CHECK (tipo IN ('APROBAR','RECHAZAR')),
    comentario varchar(500),
    motivo varchar(1000),
    decidido_en timestamptz NOT NULL,
    version_anterior bigint NOT NULL CHECK (version_anterior >= 0),
    version_resultante bigint NOT NULL CHECK (version_resultante = version_anterior + 1),
    peticion_id uuid NOT NULL,
    CONSTRAINT decision_texto CHECK (
      (tipo = 'APROBAR' AND motivo IS NULL AND (comentario IS NULL OR char_length(btrim(comentario)) BETWEEN 1 AND 500))
      OR (tipo = 'RECHAZAR' AND comentario IS NULL AND motivo IS NOT NULL AND char_length(btrim(motivo)) BETWEEN 10 AND 1000))
);
CREATE INDEX decisiones_actor_idx ON gestion.decisiones_solicitud(actor_id);
GRANT SELECT, INSERT ON gestion.decisiones_solicitud TO gestion_app;
COMMENT ON TABLE gestion.decisiones_solicitud IS 'Evento mínimo inmutable de decisión005; nombre del actor fotografiado. Historial avanzado pendiente007';

ALTER TABLE gestion.operaciones_idempotentes_solicitud
    DROP CONSTRAINT operaciones_idempotentes_solicitud_operacion_check;
ALTER TABLE gestion.operaciones_idempotentes_solicitud
    DROP CONSTRAINT operaciones_idempotentes_solicitud_resultado_estado_check;
ALTER TABLE gestion.operaciones_idempotentes_solicitud ADD COLUMN resultado_decidido_en timestamptz;
ALTER TABLE gestion.operaciones_idempotentes_solicitud ADD CONSTRAINT operacion_resultado_coherente CHECK (
    (operacion = 'PRESENTAR' AND resultado_estado = 'PRESENTADA' AND resultado_decidido_en IS NULL
      AND resultado_actualizado_en = resultado_presentado_en)
    OR (operacion IN ('APROBAR','RECHAZAR') AND resultado_decidido_en IS NOT NULL
      AND resultado_actualizado_en = resultado_decidido_en AND resultado_decidido_en >= resultado_presentado_en
      AND ((operacion = 'APROBAR' AND resultado_estado = 'APROBADA') OR (operacion = 'RECHAZAR' AND resultado_estado = 'RECHAZADA')))
);
COMMENT ON TABLE gestion.operaciones_idempotentes_solicitud IS 'Idempotencia local004/005, PK usuario+clave compartida; resultado original inmutable. Sin expiración ni purga automática; política pendiente006/007/008';
