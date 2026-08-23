CREATE OR REPLACE FUNCTION users.validate_provider(
    p_provider_name TEXT
)
    RETURNS TABLE
            (
                po_is_active BOOLEAN,
                po_is_found  BOOLEAN
            )
AS
$$
DECLARE
    v_is_active BOOLEAN DEFAULT FALSE;
    v_is_found  BOOLEAN DEFAULT FALSE;
BEGIN
    SELECT ap.is_active
    INTO v_is_active
    FROM users.auth_providers ap
    WHERE ap.name = p_provider_name
      AND ap.deleted_at IS NULL;
    -- Не забываем про удаленных провайдеров!

    -- Перехватываем системную переменную FOUND до того, как выполним следующий запрос
    v_is_found := FOUND;

    -- Для RETURNS TABLE нужно использовать RETURN QUERY
    RETURN QUERY SELECT COALESCE(v_is_active, FALSE), v_is_found;
END;
$$ LANGUAGE plpgsql;
