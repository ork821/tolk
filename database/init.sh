#!/bin/sh
set -eu

: "${POSTGRES_DB:=tolk}"
: "${APP_DB_USER:=backend}"
: "${APP_DB_PASSWORD:?APP_DB_PASSWORD is required}"

if [ "$APP_DB_USER" = "$POSTGRES_USER" ]; then
    echo "APP_DB_USER must not match POSTGRES_USER" >&2
    exit 1
fi

psql -v ON_ERROR_STOP=1 \
    --username "$POSTGRES_USER" \
    --dbname "$POSTGRES_DB" \
    -v app_user="$APP_DB_USER" \
    -v app_password="$APP_DB_PASSWORD" \
    -v db_name="$POSTGRES_DB" <<'SQL'
SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles
    WHERE rolname = :'app_user'
) AS app_role_exists
\gset

\if :app_role_exists
    SELECT NOT (
        rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls
    ) AS app_role_attributes_are_safe
    FROM pg_catalog.pg_roles
    WHERE rolname = :'app_user'
    \gset

    \if :app_role_attributes_are_safe
    \else
        \echo 'APP_DB_USER has administrative role attributes'
        SELECT 1 / 0;
    \endif

    SELECT NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_auth_members membership
        JOIN pg_catalog.pg_roles member ON member.oid = membership.member
        WHERE member.rolname = :'app_user'
    ) AS app_role_has_no_memberships
    \gset

    \if :app_role_has_no_memberships
    \else
        \echo 'APP_DB_USER inherits another role'
        SELECT 1 / 0;
    \endif

    SELECT NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_attribute attribute
        JOIN pg_catalog.pg_class relation ON relation.oid = attribute.attrelid
        JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
        CROSS JOIN LATERAL pg_catalog.aclexplode(attribute.attacl) privilege
        WHERE namespace.nspname IN ('main', 'users', 'groups')
          AND attribute.attnum > 0
          AND NOT attribute.attisdropped
          AND privilege.grantee IN (
              0,
              (SELECT role.oid FROM pg_catalog.pg_roles role WHERE role.rolname = :'app_user')
          )
          AND privilege.privilege_type IN ('SELECT', 'INSERT', 'UPDATE', 'REFERENCES')
    ) AS app_role_has_no_column_privileges
    \gset

    \if :app_role_has_no_column_privileges
    \else
        \echo 'APP_DB_USER has direct column privileges'
        SELECT 1 / 0;
    \endif

    SELECT NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_shdepend dependency
        JOIN pg_catalog.pg_roles owner ON owner.oid = dependency.refobjid
        CROSS JOIN LATERAL pg_catalog.pg_identify_object(
            dependency.classid,
            dependency.objid,
            dependency.objsubid
        ) object
        WHERE dependency.dbid = (
                  SELECT database.oid
                  FROM pg_catalog.pg_database database
                  WHERE database.datname = current_database()
              )
          AND dependency.refclassid = 'pg_catalog.pg_authid'::regclass
          AND dependency.deptype = 'o'
          AND owner.rolname = :'app_user'
          AND (
              object.schema IN ('main', 'users', 'groups')
              OR (
                  object.type = 'schema'
                  AND object.name IN ('main', 'users', 'groups')
              )
          )
    ) AS app_role_owns_no_application_objects
    \gset

    \if :app_role_owns_no_application_objects
    \else
        \echo 'APP_DB_USER owns objects in an application schema'
        SELECT 1 / 0;
    \endif

\else
    SELECT format(
        'CREATE ROLE %I WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS',
        :'app_user'
    )
    \gexec
\endif

ALTER ROLE :"app_user" WITH LOGIN PASSWORD :'app_password';
GRANT CONNECT ON DATABASE :"db_name" TO :"app_user";

CREATE SCHEMA IF NOT EXISTS main;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS groups;

REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA main, users, groups TO :"app_user";

REVOKE ALL ON ALL TABLES IN SCHEMA main, users, groups FROM :"app_user";
REVOKE ALL ON ALL SEQUENCES IN SCHEMA main, users, groups FROM :"app_user";
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA main, users, groups TO :"app_user";

ALTER DEFAULT PRIVILEGES IN SCHEMA main, users, groups
REVOKE ALL ON TABLES FROM :"app_user";

ALTER DEFAULT PRIVILEGES IN SCHEMA main, users, groups
GRANT EXECUTE ON FUNCTIONS TO :"app_user";

ALTER DEFAULT PRIVILEGES IN SCHEMA main, users, groups
REVOKE ALL ON SEQUENCES FROM :"app_user";

SELECT format(
    'ALTER FUNCTION %I.%I(%s) SECURITY DEFINER SET search_path = pg_catalog, main, users, groups, public',
    n.nspname,
    p.proname,
    pg_get_function_identity_arguments(p.oid)
)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('main', 'users', 'groups')
\gexec

ALTER ROLE :"app_user" SET search_path TO main, users, groups;
SQL
