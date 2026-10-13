-- Valores ficticios, exclusivos de contenedores desechables de prueba.
CREATE ROLE gestion_migracion LOGIN PASSWORD 'migracion-ficticia-prueba' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE gestion_app LOGIN PASSWORD 'aplicacion-ficticia-prueba' NOSUPERUSER NOCREATEDB NOCREATEROLE;
REVOKE ALL ON DATABASE gestion FROM PUBLIC;
GRANT CONNECT ON DATABASE gestion TO gestion_migracion, gestion_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA gestion AUTHORIZATION gestion_migracion;
