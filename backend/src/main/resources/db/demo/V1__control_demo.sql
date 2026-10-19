-- Control operativo independiente: no forma parte de V1–V7 de negocio ni se recicla.
REVOKE ALL ON SCHEMA demo FROM PUBLIC;
CREATE TABLE demo.espacios (
    id varchar(32) PRIMARY KEY CHECK (id ~ '^ag016_demo_[0-9]{2}$'),
    generacion uuid NOT NULL,
    estado varchar(16) NOT NULL CHECK (estado IN ('PREPARANDO','LISTO','RESERVADO','DRENANDO','RECICLABLE','BLOQUEADO')),
    reserva_id uuid UNIQUE,
    cookie_hash varchar(64) UNIQUE CHECK (cookie_hash ~ '^[a-f0-9]{64}$'),
    expira_en timestamptz,
    bytes bigint NOT NULL DEFAULT 0 CHECK (bytes >= 0),
    CHECK ((reserva_id IS NULL AND cookie_hash IS NULL AND expira_en IS NULL)
        OR (reserva_id IS NOT NULL AND cookie_hash IS NOT NULL AND expira_en IS NOT NULL)),
    CHECK (estado <> 'RESERVADO' OR reserva_id IS NOT NULL)
);
CREATE TABLE demo.eventos (
    id uuid PRIMARY KEY,
    espacio varchar(32) NOT NULL REFERENCES demo.espacios(id),
    generacion uuid NOT NULL,
    tipo varchar(32) NOT NULL,
    instante timestamptz NOT NULL
);
CREATE INDEX eventos_instante_idx ON demo.eventos(instante);
GRANT USAGE ON SCHEMA demo TO ag016_control_app;
GRANT SELECT, UPDATE ON demo.espacios TO ag016_control_app;
GRANT SELECT, INSERT ON demo.eventos TO ag016_control_app;
COMMENT ON TABLE demo.eventos IS 'Eventos operativos conservados al reciclar bases ficticias; aplicación sin UPDATE/DELETE';
