DO $$
DECLARE
    v_security_definer BOOLEAN;
    v_config TEXT[];
BEGIN
    SELECT p.prosecdef, p.proconfig
    INTO v_security_definer, v_config
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'main'
      AND p.proname = 'create_post';

    IF NOT v_security_definer THEN
        RAISE EXCEPTION 'migration function main.create_post is not SECURITY DEFINER';
    END IF;

    IF NOT v_config @> ARRAY['search_path=pg_catalog, main, users, groups, public'] THEN
        RAISE EXCEPTION 'migration function main.create_post has an unsafe search_path: %', v_config;
    END IF;

END
$$;

SELECT has_function_privilege(
    :'app_user',
    'main.create_post(bigint,uuid,bigint,integer,text,boolean,text)',
    'EXECUTE'
) AS app_user_can_execute_create_post
\gset

\if :app_user_can_execute_create_post
\else
    \echo 'Application role cannot execute migration function main.create_post'
    SELECT 1 / 0;
\endif
