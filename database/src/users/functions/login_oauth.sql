CREATE OR REPLACE FUNCTION users.login_oauth(
    p_provider_name TEXT,
    p_external_id TEXT,
    p_username TEXT,
    p_email TEXT,
    p_display_name TEXT,
    p_avatar_url TEXT
)
    RETURNS TABLE
            (
                po_user_id     UUID,
                po_username    TEXT,
                po_is_new_user BOOLEAN,
                po_deleted_at  TIMESTAMPTZ
            )
AS
$$
DECLARE
    v_provider_id UUID;
    v_user_id     UUID;
    v_is_new      BOOLEAN := FALSE;
    v_deleted_at  TIMESTAMPTZ;
    v_username    TEXT;
BEGIN
    -- 1. Проверяем, сущесет ли провайдер
    SELECT id
    INTO v_provider_id
    FROM users.auth_providers
    WHERE name = p_provider_name
      AND is_active IS TRUE
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Provider % is not supported or currently disabled', p_provider_name;
    END IF;

    -- 2. ИЩЕМ СУЩЕСТВУЮЩУЮ ПРИВЯЗКУ (INNER JOIN и правильное расположение INTO)
    SELECT u.id, u.username, u.deleted_at
    INTO v_user_id, v_username, v_deleted_at
    FROM users.user_auth_providers uap
             INNER JOIN users.users u ON u.id = uap.user_id
    WHERE uap.provider_id = v_provider_id
      AND uap.external_id = p_external_id;

    IF FOUND THEN
        RETURN QUERY SELECT v_user_id, v_username, FALSE, v_deleted_at;
        RETURN;
    END IF;

    -- 3. Если провайдер новый, но email уже принадлежит активному пользователю, привязываем провайдера к нему.
    IF p_email IS NOT NULL THEN
        SELECT u.id, u.username
        INTO v_user_id, v_username
        FROM users.users u
        WHERE u.email = p_email
          AND u.deleted_at IS NULL;
    END IF;

    -- 4. РЕГИСТРАЦИЯ НОВОГО ПОЛЬЗОВАТЕЛЯ
    IF v_user_id IS NULL THEN
        v_is_new := TRUE;

        -- Определяем желаемый username (проверяем, не занят ли он)
        IF p_username IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM users.users WHERE username = p_username) THEN
            v_username := p_username;
        ELSE
            -- Если не передали или уже занят кем-то - генерируем случайный
            v_username := 'user_' || substr(md5(random()::text), 1, 10);
        END IF;

        -- Безопасный INSERT. Если в ту же миллисекунду кто-то займет этот username, 
        -- DO NOTHING спасет нас от ошибки, и v_user_id останется NULL.
        INSERT INTO users.users (username, display_name, email)
        VALUES (v_username,
                COALESCE(p_display_name, p_username, 'Anonymous'), -- Защита от NOT NULL
                p_email)
        ON CONFLICT (username) DO NOTHING
        RETURNING id INTO v_user_id;

        -- Fallback на случай жесткого Race Condition (если имя заняли прямо перед INSERT)
        IF v_user_id IS NULL THEN
            v_username := 'user_' || substr(md5(random()::text), 1, 10);

            INSERT INTO users.users (username, display_name, email)
            VALUES (v_username, COALESCE(p_display_name, p_username, 'Anonymous'), p_email)
            RETURNING id INTO v_user_id;
        END IF;

        -- Инициализируем профиль
        INSERT INTO users.profile_info (user_id, avatar_url) VALUES (v_user_id, p_avatar_url);
    END IF;

    -- 5. СОЗДАЕМ ПРИВЯЗКУ ПРОВАЙДЕРА
    INSERT INTO users.user_auth_providers (user_id, provider_id, external_id, email)
    VALUES (v_user_id, v_provider_id, p_external_id, p_email);

    RETURN QUERY SELECT v_user_id, v_username, v_is_new, NULL::TIMESTAMPTZ;
END;
$$ LANGUAGE plpgsql;
