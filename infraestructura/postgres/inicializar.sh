#!/bin/sh
set -eu
# Variables de entorno como valores psql citados, sin concatenación de SQL.
psql --set ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set app_password="$APP_PASSWORD" --set migration_password="$MIGRATION_PASSWORD" <<'SQL'
CREATE ROLE gestion_migracion LOGIN PASSWORD :'migration_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE gestion_app LOGIN PASSWORD :'app_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
REVOKE ALL ON DATABASE gestion FROM PUBLIC;
GRANT CONNECT ON DATABASE gestion TO gestion_migracion, gestion_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA gestion AUTHORIZATION gestion_migracion;
SQL
