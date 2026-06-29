#!/bin/sh
set -eu

: "${POSTGRES_DB:=tolk}"
: "${APP_DB_USER:=backend}"
: "${APP_DB_PASSWORD:?APP_DB_PASSWORD is required}"

psql -v ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    -v app_user="$APP_DB_USER" \
    -v app_password="$APP_DB_PASSWORD" \
    -v db_name="$POSTGRES_DB" <<'SQL'
SELECT format('CREATE ROLE %I WITH LOGIN', :'app_user')
WHERE NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles
    WHERE rolname = :'app_user'
)
\gexec

ALTER ROLE :"app_user" WITH LOGIN PASSWORD :'app_password';
GRANT CONNECT ON DATABASE :"db_name" TO :"app_user";

CREATE SCHEMA IF NOT EXISTS main;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS groups;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA main, users, groups, public TO :"app_user";

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA main, users, groups TO :"app_user";
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA main, users, groups TO :"app_user";
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA main, users, groups TO :"app_user";

ALTER DEFAULT PRIVILEGES IN SCHEMA main, users, groups
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :"app_user";

ALTER DEFAULT PRIVILEGES IN SCHEMA main, users, groups
GRANT EXECUTE ON FUNCTIONS TO :"app_user";

ALTER DEFAULT PRIVILEGES IN SCHEMA main, users, groups
GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO :"app_user";

ALTER ROLE :"app_user" SET search_path TO main, users, groups, public;
SQL
