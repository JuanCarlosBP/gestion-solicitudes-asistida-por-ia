CREATE TABLE gestion.roles (
    nombre varchar(20) PRIMARY KEY,
    CONSTRAINT roles_conocidos CHECK (nombre IN ('SOLICITANTE','SUPERVISOR','AUDITOR','ADMINISTRADOR'))
);
INSERT INTO gestion.roles(nombre) VALUES ('SOLICITANTE'), ('SUPERVISOR'), ('AUDITOR'), ('ADMINISTRADOR');

CREATE TABLE gestion.usuarios (
    id uuid PRIMARY KEY,
    correo varchar(254) NOT NULL UNIQUE,
    nombre_visible varchar(120) NOT NULL,
    clave_hash varchar(255) NOT NULL,
    habilitado boolean NOT NULL DEFAULT true,
    intentos_fallidos integer NOT NULL DEFAULT 0 CHECK (intentos_fallidos >= 0),
    inicio_ventana timestamptz,
    bloqueado_hasta timestamptz,
    creado_en timestamptz NOT NULL,
    actualizado_en timestamptz NOT NULL,
    version bigint NOT NULL DEFAULT 0,
    CONSTRAINT correo_normalizado CHECK (correo = lower(btrim(correo)) AND length(correo) > 0),
    CONSTRAINT hash_argon2 CHECK (clave_hash LIKE '$argon2id$%'),
    CONSTRAINT intentos_coherentes CHECK ((intentos_fallidos = 0 AND inicio_ventana IS NULL AND bloqueado_hasta IS NULL) OR (intentos_fallidos > 0 AND inicio_ventana IS NOT NULL)),
    CONSTRAINT bloqueo_coherente CHECK (bloqueado_hasta IS NULL OR bloqueado_hasta > inicio_ventana),
    CONSTRAINT fechas_usuario CHECK (actualizado_en >= creado_en)
);
CREATE TABLE gestion.usuarios_roles (
    usuario_id uuid NOT NULL REFERENCES gestion.usuarios(id),
    rol varchar(20) NOT NULL REFERENCES gestion.roles(nombre),
    PRIMARY KEY (usuario_id, rol)
);
CREATE INDEX usuarios_roles_rol_idx ON gestion.usuarios_roles(rol);

CREATE TABLE gestion.sesiones_acceso (
    id uuid PRIMARY KEY,
    usuario_id uuid NOT NULL REFERENCES gestion.usuarios(id),
    familia_id uuid NOT NULL UNIQUE,
    token_actual uuid NOT NULL,
    creado_en timestamptz NOT NULL,
    expira_en timestamptz NOT NULL,
    revocado_en timestamptz,
    motivo_revocacion varchar(30),
    CONSTRAINT sesion_familia_unica UNIQUE(id, familia_id),
    CONSTRAINT fechas_sesion CHECK (expira_en > creado_en AND (revocado_en IS NULL OR revocado_en >= creado_en)),
    CONSTRAINT revocacion_sesion CHECK ((revocado_en IS NULL AND motivo_revocacion IS NULL) OR (revocado_en IS NOT NULL AND motivo_revocacion IN ('CIERRE','REUTILIZACION','USUARIO_DESHABILITADO','CADUCIDAD')))
);
CREATE INDEX sesiones_usuario_idx ON gestion.sesiones_acceso(usuario_id);
CREATE TABLE gestion.tokens_refresco (
    id uuid PRIMARY KEY,
    sesion_id uuid NOT NULL,
    familia_id uuid NOT NULL,
    secreto_hash bytea NOT NULL CHECK (octet_length(secreto_hash) = 32),
    estado varchar(10) NOT NULL CHECK (estado IN ('ACTIVO','USADO','REVOCADO')),
    creado_en timestamptz NOT NULL,
    expira_en timestamptz NOT NULL,
    usado_en timestamptz,
    reemplazo_id uuid REFERENCES gestion.tokens_refresco(id),
    revocado_en timestamptz,
    motivo_revocacion varchar(30),
    CONSTRAINT token_sesion_familia FOREIGN KEY(sesion_id, familia_id) REFERENCES gestion.sesiones_acceso(id, familia_id),
    CONSTRAINT token_sesion_unico UNIQUE(id, sesion_id),
    CONSTRAINT fechas_token CHECK (expira_en > creado_en AND (usado_en IS NULL OR usado_en >= creado_en) AND (revocado_en IS NULL OR revocado_en >= creado_en)),
    CONSTRAINT uso_token CHECK ((usado_en IS NULL AND reemplazo_id IS NULL) OR (usado_en IS NOT NULL AND reemplazo_id IS NOT NULL AND reemplazo_id <> id)),
    CONSTRAINT estado_token CHECK ((estado = 'ACTIVO' AND usado_en IS NULL AND revocado_en IS NULL) OR (estado = 'USADO' AND usado_en IS NOT NULL AND revocado_en IS NULL) OR (estado = 'REVOCADO' AND revocado_en IS NOT NULL)),
    CONSTRAINT revocacion_token CHECK ((revocado_en IS NULL AND motivo_revocacion IS NULL) OR (revocado_en IS NOT NULL AND motivo_revocacion IN ('CIERRE','REUTILIZACION','USUARIO_DESHABILITADO','CADUCIDAD')))
);
CREATE INDEX tokens_sesion_idx ON gestion.tokens_refresco(sesion_id);
CREATE INDEX tokens_familia_idx ON gestion.tokens_refresco(familia_id);
ALTER TABLE gestion.sesiones_acceso ADD CONSTRAINT token_actual_de_sesion
    FOREIGN KEY(token_actual, id) REFERENCES gestion.tokens_refresco(id, sesion_id) DEFERRABLE INITIALLY DEFERRED;

GRANT SELECT ON gestion.roles TO gestion_app;
GRANT SELECT, INSERT, UPDATE ON gestion.usuarios, gestion.sesiones_acceso, gestion.tokens_refresco TO gestion_app;
GRANT SELECT, INSERT ON gestion.usuarios_roles TO gestion_app;
COMMENT ON SCHEMA gestion IS 'Gestión de Solicitudes: base técnica e identidad';
