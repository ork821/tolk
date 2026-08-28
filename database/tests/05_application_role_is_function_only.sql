SELECT NOT (
    rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls
) AS app_role_is_unprivileged
FROM pg_catalog.pg_roles
WHERE rolname = :'app_user'
\gset

\if :app_role_is_unprivileged
\else
    \echo 'Application role has administrative attributes'
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
    \echo 'Application role inherits another role'
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
    \echo 'Application role owns objects in an application schema'
    SELECT 1 / 0;
\endif

SET ROLE :"app_user";

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class relation
        JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
        CROSS JOIN (
            VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
                   ('TRUNCATE'), ('REFERENCES'), ('TRIGGER'), ('MAINTAIN')
        ) privilege(name)
        WHERE namespace.nspname IN ('main', 'users', 'groups')
          AND relation.relkind IN ('r', 'p', 'v', 'm', 'f')
          AND has_table_privilege(current_user, relation.oid, privilege.name)
    ) THEN
        RAISE EXCEPTION 'Application role has direct table privileges';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_catalog.pg_attribute attribute
        JOIN pg_catalog.pg_class relation ON relation.oid = attribute.attrelid
        JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
        CROSS JOIN (
            VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('REFERENCES')
        ) privilege(name)
        WHERE namespace.nspname IN ('main', 'users', 'groups')
          AND relation.relkind IN ('r', 'p', 'v', 'm', 'f')
          AND attribute.attnum > 0
          AND NOT attribute.attisdropped
          AND has_column_privilege(
              current_user,
              relation.oid,
              attribute.attnum,
              privilege.name
          )
    ) THEN
        RAISE EXCEPTION 'Application role has direct column privileges';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_catalog.pg_class relation
        JOIN pg_catalog.pg_namespace namespace ON namespace.oid = relation.relnamespace
        CROSS JOIN (VALUES ('USAGE'), ('SELECT'), ('UPDATE')) privilege(name)
        WHERE namespace.nspname IN ('main', 'users', 'groups')
          AND relation.relkind = 'S'
          AND has_sequence_privilege(current_user, relation.oid, privilege.name)
    ) THEN
        RAISE EXCEPTION 'Application role has direct sequence privileges';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_catalog.pg_namespace namespace
        WHERE namespace.nspname IN ('main', 'users', 'groups', 'public')
          AND has_schema_privilege(current_user, namespace.oid, 'CREATE')
    ) THEN
        RAISE EXCEPTION 'Application role can create objects in an application schema';
    END IF;

    BEGIN
        PERFORM 1 FROM users.users LIMIT 1;
        RAISE EXCEPTION 'Direct SELECT unexpectedly succeeded';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    BEGIN
        INSERT INTO main.reaction_types (name) VALUES ('acl-test');
        RAISE EXCEPTION 'Direct INSERT unexpectedly succeeded';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    BEGIN
        UPDATE users.users SET username = username WHERE FALSE;
        RAISE EXCEPTION 'Direct UPDATE unexpectedly succeeded';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    BEGIN
        DELETE FROM users.users WHERE FALSE;
        RAISE EXCEPTION 'Direct DELETE unexpectedly succeeded';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    BEGIN
        TRUNCATE users.users;
        RAISE EXCEPTION 'Direct TRUNCATE unexpectedly succeeded';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;

    BEGIN
        CREATE TABLE main.acl_probe (id INTEGER);
        RAISE EXCEPTION 'CREATE TABLE unexpectedly succeeded';
    EXCEPTION WHEN insufficient_privilege THEN
        NULL;
    END;
END
$$;

SELECT count(*) >= 0 AS approved_function_is_executable
FROM main.get_active_reactions()
\gset

\if :approved_function_is_executable
\else
    \echo 'Application role cannot execute approved functions'
    SELECT 1 / 0;
\endif

RESET ROLE;
