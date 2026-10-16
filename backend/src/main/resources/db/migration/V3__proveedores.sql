CREATE TABLE gestion.proveedores (
    id uuid PRIMARY KEY,
    tipo varchar(20) NOT NULL CHECK (tipo IN ('PERSONA_JURIDICA', 'PROFESIONAL')),
    denominacion varchar(160) NOT NULL CHECK (char_length(denominacion) BETWEEN 1 AND 160),
    pais_fiscal varchar(2) NOT NULL CHECK (pais_fiscal ~ '^[A-Z]{2}$'),
    identificador_fiscal varchar(64) NOT NULL CHECK (char_length(identificador_fiscal) BETWEEN 3 AND 64),
    identificador_fiscal_normalizado varchar(64) NOT NULL CHECK (char_length(identificador_fiscal_normalizado) BETWEEN 3 AND 64),
    correo_contacto varchar(254),
    telefono_contacto varchar(32),
    activo boolean NOT NULL DEFAULT true,
    version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
    creado_en timestamptz NOT NULL,
    actualizado_en timestamptz NOT NULL,
    CONSTRAINT proveedor_fiscal_unico UNIQUE (pais_fiscal, identificador_fiscal_normalizado),
    CONSTRAINT proveedor_fechas CHECK (actualizado_en >= creado_en)
);
CREATE INDEX proveedores_estado_pais_idx ON gestion.proveedores (activo, pais_fiscal);
CREATE INDEX proveedores_denominacion_idx ON gestion.proveedores (denominacion, id);
CREATE INDEX proveedores_creacion_idx ON gestion.proveedores (creado_en, id);
CREATE INDEX proveedores_actualizacion_idx ON gestion.proveedores (actualizado_en, id);
GRANT SELECT, INSERT, UPDATE ON gestion.proveedores TO gestion_app;
COMMENT ON TABLE gestion.proveedores IS 'Catálogo de proveedores con baja lógica y versión optimista';
