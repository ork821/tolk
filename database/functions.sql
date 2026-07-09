-- Функции
CREATE OR REPLACE FUNCTION users.create_user(p_username TEXT, p_display_name TEXT, p_email TEXT)
    RETURNS TABLE
            (
                po_user_id      UUID,
                po_username     TEXT,
                po_display_name TEXT,
                po_email        TEXT
            )
AS
$$
BEGIN
    IF EXISTS (SELECT 1 FROM users.users u WHERE u.username = p_username AND u.deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Username already in usage';
    END IF;
    IF p_email IS NOT NULL
        AND EXISTS (SELECT 1 FROM users.users u WHERE u.email = p_email AND u.deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Email already in usage';
    END IF;

    RETURN QUERY INSERT INTO users.users (username, display_name, email)
        VALUES (p_username, p_display_name, p_email)
        RETURNING
            id as po_user_id,
            username as po_username,
            users.display_name as po_display_name,
            email as po_email;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Username or email already in usage';
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION users.get_user_by_username(p_username TEXT, p_user_id UUID DEFAULT NULL)
    RETURNS TABLE
            (
                po_user_id              UUID,
                po_username             TEXT,
                po_display_name         TEXT,
                po_email                TEXT,
                po_description          TEXT,
                po_avatar_url           TEXT,
                po_karma                BIGINT,
                po_subscribers_count      BIGINT,
                po_user_subscribes_count   BIGINT,
                po_group_subscribes_count BIGINT,
                po_is_subscribed        BOOLEAN,
                po_is_me                BOOLEAN
            )
AS
$$
BEGIN
    RETURN QUERY SELECT u.id                              as po_user_id,
                        u.username                        as po_username,
                        u.display_name                    as po_display_name,
                        u.email                           as po_email,
                        ufi.description                   as po_description,
                        ufi.avatar_url                    as po_avatar_url,
                        COALESCE(ufi.karma, 0)            as po_karma,
                        COALESCE(ufi.subscribers_count, 0)     as po_subscribers_count,
                        COALESCE(ufi.user_subscribes_count, 0)  as po_user_subscribes_count,
                        COALESCE(ufi.group_subscribes_count, 0) as po_group_subscribes_count,
                        CASE
                            WHEN p_user_id IS NULL THEN FALSE
                            ELSE EXISTS (
                                SELECT 1
                                FROM users.user_subscribe uf
                                WHERE uf.from_user_id = p_user_id
                                  AND uf.to_user_id = u.id
                                  AND uf.deleted_at IS NULL
                            )
                        END as po_is_subscribed,
                        CASE
                            WHEN p_user_id IS NULL THEN FALSE
                            ELSE p_user_id = u.id
                        END as po_is_me
                 FROM users.users u
                          LEFT JOIN users.profile_info as ufi
                                    ON u.id = ufi.user_id
                 WHERE u.username = p_username
                   AND u.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION users.get_users_metadata(p_usernames TEXT[], p_user_id UUID DEFAULT NULL)
    RETURNS TABLE
            (
                po_username      TEXT,
                po_is_subscribed BOOLEAN,
                po_is_me         BOOLEAN
            )
AS
$$
BEGIN
    RETURN QUERY SELECT u.username as po_username,
                        CASE
                            WHEN p_user_id IS NULL THEN FALSE
                            ELSE EXISTS (
                                SELECT 1
                                FROM users.user_subscribe uf
                                WHERE uf.from_user_id = p_user_id
                                  AND uf.to_user_id = u.id
                                  AND uf.deleted_at IS NULL
                            )
                        END as po_is_subscribed,
                        CASE
                            WHEN p_user_id IS NULL THEN FALSE
                            ELSE p_user_id = u.id
                        END as po_is_me
                 FROM users.users u
                 WHERE u.username = ANY (p_usernames)
                   AND u.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION users.get_user_by_id(p_user_id UUID)
    RETURNS TABLE
            (
                po_user_id              UUID,
                po_username             TEXT,
                po_display_name         TEXT,
                po_email                TEXT,
                po_description          TEXT,
                po_avatar_url           TEXT,
                po_karma                BIGINT,
                po_subscribers_count      BIGINT,
                po_user_subscribes_count   BIGINT,
                po_group_subscribes_count BIGINT,
                po_is_subscribed        BOOLEAN,
                po_is_me                BOOLEAN
            )
AS
$$
BEGIN
    RETURN QUERY SELECT u.id                              as po_user_id,
                        u.username                        as po_username,
                        u.display_name                    as po_display_name,
                        u.email                           as po_email,
                        ufi.description                   as po_description,
                        ufi.avatar_url                    as po_avatar_url,
                        COALESCE(ufi.karma, 0)            as po_karma,
                        COALESCE(ufi.subscribers_count, 0)     as po_subscribers_count,
                        COALESCE(ufi.user_subscribes_count, 0)  as po_user_subscribes_count,
                        COALESCE(ufi.group_subscribes_count, 0) as po_group_subscribes_count,
                        FALSE as po_is_subscribed,
                        TRUE as po_is_me
                 FROM users.users u
                          LEFT JOIN users.profile_info as ufi
                                    ON u.id = ufi.user_id
                 WHERE u.id = p_user_id
                   AND u.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Подписан ли userId На username
CREATE OR REPLACE FUNCTION users.is_user_subscribed(p_user_id UUID, p_target_username TEXT)
    RETURNS BOOLEAN
AS
$$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM users.users tu
                 JOIN users.user_subscribe uf ON tu.id = uf.to_user_id AND uf.from_user_id = p_user_id
        WHERE tu.username = p_target_username
          AND tu.deleted_at IS NULL
          AND uf.deleted_at IS NULL
    );
END;
$$ language plpgsql;


CREATE OR REPLACE FUNCTION users.get_user_subscribes(
    p_username TEXT,
    p_limit INT DEFAULT 20,
    p_last_created_at TIMESTAMPTZ DEFAULT NULL,
    p_last_username TEXT DEFAULT NULL,
    p_my_user_id UUID DEFAULT NULL
)
    RETURNS TABLE
            (
                po_username TEXT,
                po_display_name TEXT,
                po_avatar_url TEXT,
                is_subscribed BOOLEAN,
                po_created_at TIMESTAMPTZ
            )
AS
$$
BEGIN
    RETURN QUERY SELECT u.username,
                        u.display_name,
                        ufi.avatar_url,
                        CASE
                            WHEN p_my_user_id IS NULL THEN FALSE
                            ELSE EXISTS(
                                SELECT 1
                                FROM users.user_subscribe muf
                                WHERE muf.from_user_id = p_my_user_id
                                  AND muf.to_user_id = u.id
                                  AND muf.deleted_at IS NULL
                            )
                        END,
                        uf.created_at
                 FROM users.users tu
                          JOIN users.user_subscribe uf on tu.id = uf.from_user_id
                          JOIN users.users u ON u.id = uf.to_user_id
                          LEFT JOIN users.profile_info ufi ON u.id = ufi.user_id
                 WHERE tu.username = p_username
                   AND tu.deleted_at IS NULL
                   AND u.deleted_at IS NULL
                   AND uf.deleted_at IS NULL
                   AND (
                     p_last_created_at IS NULL
                         OR uf.created_at < p_last_created_at
                         OR (uf.created_at = p_last_created_at AND u.username > p_last_username)
                     )
                 ORDER BY uf.created_at DESC, u.username ASC
                 LIMIT p_limit;
END;
$$ language plpgsql;



CREATE OR REPLACE FUNCTION users.get_user_subscribers(
    p_username TEXT,
    p_limit INT DEFAULT 20,
    p_last_created_at TIMESTAMPTZ DEFAULT NULL,
    p_last_username TEXT DEFAULT NULL,
    p_my_user_id UUID DEFAULT NULL
)
    RETURNS TABLE
            (
                po_username   TEXT,
                po_display_name TEXT,
                po_avatar_url TEXT,
                is_subscribed BOOLEAN,
                po_created_at TIMESTAMPTZ
            )
AS
$$
    DECLARE 
        target_user_id UUID;
BEGIN
        SELECT u.id into target_user_id from users.users u where u.username = p_username AND u.deleted_at IS NULL;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'User not found';
        END IF;
        
    RETURN QUERY SELECT u.username,
                        u.display_name,
                        ufi.avatar_url,
                        CASE
                            WHEN p_my_user_id IS NULL THEN FALSE
                            ELSE EXISTS(select 1 from users.user_subscribe uf1 where uf1.from_user_id = p_my_user_id
                                                                         AND uf1.to_user_id = u.id
                                                                         AND uf1.deleted_at IS NULL)
                        END,
                        uf.created_at
                 FROM users.user_subscribe uf
                          JOIN users.users u ON u.id = uf.from_user_id
                          LEFT JOIN users.profile_info ufi ON u.id = ufi.user_id
                 WHERE uf.to_user_id = target_user_id 
                   AND u.deleted_at IS NULL
                   AND uf.deleted_at IS NULL
                   AND (
                     p_last_created_at IS NULL
                         OR uf.created_at < p_last_created_at
                         OR (uf.created_at = p_last_created_at AND u.username > p_last_username)
                     )
                 ORDER BY uf.created_at DESC, u.username ASC
                 LIMIT p_limit;
END;
$$ language plpgsql;



CREATE OR REPLACE FUNCTION users.get_user_group_subscribes(
    p_username TEXT,
    p_limit INT DEFAULT 20,
    p_last_created_at TIMESTAMPTZ DEFAULT NULL,
    p_last_alias TEXT DEFAULT NULL
)
    RETURNS TABLE
            (
                po_alias TEXT,
                po_created_at TIMESTAMPTZ
            )
AS
$$
BEGIN
    RETURN QUERY SELECT g.alias,
                        gf.created_at
                 FROM users.users tu
                          JOIN users.group_subscribe gf on tu.id = gf.from_user_id
                          JOIN groups.groups g ON g.id = gf.group_id
                 WHERE tu.username = p_username
                   AND tu.deleted_at IS NULL
                   AND g.deleted_at IS NULL
                   AND gf.deleted_at IS NULL
                   AND (
                     p_last_created_at IS NULL
                         OR gf.created_at < p_last_created_at
                         OR (gf.created_at = p_last_created_at AND g.alias > p_last_alias)
                     )
                 ORDER BY gf.created_at DESC, g.alias ASC
                 LIMIT p_limit;
END;
$$ language plpgsql;



CREATE OR REPLACE FUNCTION users.add_user_subscribe(p_from_user_id UUID, p_to_username TEXT) RETURNS VOID as
$$
DECLARE
    target_user_id UUID;
BEGIN
    SELECT id FROM users.users WHERE username = p_to_username AND deleted_at IS NULL INTO target_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target user not found';
    END IF;
    IF p_from_user_id = target_user_id THEN
        RAISE EXCEPTION 'User cannot subscribe to themselves';
    END IF;

    INSERT INTO users.user_subscribe (from_user_id, to_user_id)
    VALUES (p_from_user_id, target_user_id)
    ON CONFLICT DO NOTHING;

    IF FOUND THEN
        INSERT INTO users.profile_info AS pi (user_id, user_subscribes_count)
        VALUES (p_from_user_id, 1)
        ON CONFLICT (user_id) DO UPDATE SET user_subscribes_count = pi.user_subscribes_count + 1;

        INSERT INTO users.profile_info AS pi (user_id, subscribers_count)
        VALUES (target_user_id, 1)
        ON CONFLICT (user_id) DO UPDATE SET subscribers_count = pi.subscribers_count + 1;
    END IF;
END;
$$
    LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION users.remove_user_subscribe(p_from_user_id UUID, p_to_username TEXT) RETURNS VOID as
$$
DECLARE
    target_user_id UUID;
BEGIN
    SELECT id FROM users.users WHERE username = p_to_username INTO target_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target user not found';
    END IF;

    DELETE FROM users.user_subscribe uf WHERE uf.from_user_id = p_from_user_id AND uf.to_user_id = target_user_id;
    IF FOUND THEN
        INSERT INTO users.profile_info AS pi (user_id, user_subscribes_count)
        VALUES (p_from_user_id, 0)
        ON CONFLICT (user_id) DO UPDATE SET user_subscribes_count = GREATEST(pi.user_subscribes_count - 1, 0);

        INSERT INTO users.profile_info AS pi (user_id, subscribers_count)
        VALUES (target_user_id, 0)
        ON CONFLICT (user_id) DO UPDATE SET subscribers_count = GREATEST(pi.subscribers_count - 1, 0);
    END IF;
END;
$$
    LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION users.add_group_subscribe(p_from_user_id UUID, p_target_group_alias TEXT) RETURNS VOID as
$$
DECLARE
    target_group_id UUID;
BEGIN
    SELECT id FROM groups.groups WHERE alias = p_target_group_alias INTO target_group_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target group not found';
    END IF;

    INSERT INTO users.group_subscribe (from_user_id, group_id)
    VALUES (p_from_user_id, target_group_id)
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
        INSERT INTO users.profile_info AS pi (user_id, group_subscribes_count)
        VALUES (p_from_user_id, 1)
        ON CONFLICT (user_id) DO UPDATE SET group_subscribes_count = pi.group_subscribes_count + 1;

        INSERT INTO groups.group_info AS gi (group_id, subscribers_count)
        VALUES (target_group_id, 1)
        ON CONFLICT (group_id) DO UPDATE SET subscribers_count = gi.subscribers_count + 1;
    END IF;
END;
$$
    LANGUAGE plpgsql;



CREATE OR REPLACE FUNCTION users.remove_group_subscribe(p_from_user_id UUID, p_target_group_alias TEXT) RETURNS VOID as
$$
DECLARE
    target_group_id UUID;
BEGIN
    SELECT id FROM groups.groups WHERE alias = p_target_group_alias INTO target_group_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target group not found';
    END IF;

    DELETE FROM users.group_subscribe gf WHERE gf.from_user_id = p_from_user_id AND gf.group_id = target_group_id;
    IF FOUND THEN
        INSERT INTO users.profile_info AS pi (user_id, group_subscribes_count)
        VALUES (p_from_user_id, 0)
        ON CONFLICT (user_id) DO UPDATE SET group_subscribes_count = GREATEST(pi.group_subscribes_count - 1, 0);

        INSERT INTO groups.group_info AS gi (group_id, subscribers_count)
        VALUES (target_group_id, 0)
        ON CONFLICT (group_id) DO UPDATE SET subscribers_count = GREATEST(gi.subscribers_count - 1, 0);
    ELSE
        RAISE EXCEPTION 'Group subscribe info not found';
    END IF;
END;
$$
    LANGUAGE plpgsql;

-- Refresh tokens
CREATE OR REPLACE FUNCTION users.save_refresh_token(
    p_user_id UUID,
    p_token TEXT,
    p_expires_in_days INT DEFAULT 30, -- По умолчанию токен живет 30 дней
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
) RETURNS VOID AS
$$
BEGIN
    INSERT INTO users.refresh_tokens (user_id, token, expires_at, user_agent, ip_address)
    VALUES (p_user_id,
            p_token,
            NOW() + (p_expires_in_days || ' days')::INTERVAL,
            p_user_agent,
            p_ip_address);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION users.validate_refresh_token(p_token TEXT)
    RETURNS TABLE
            (
                po_user_id    UUID,
                po_is_revoked BOOLEAN,
                po_is_valid   BOOLEAN
            )
AS
$$
BEGIN
    RETURN QUERY
        SELECT user_id,
               revoked_at IS NOT NULL,
               revoked_at IS NULL AND expires_at > NOW()
        FROM users.refresh_tokens
        WHERE token = p_token
        LIMIT 1;

    -- Если токен не найден, возвращаем пустую строку (бекенд поймет это как FALSE и разлогинит юзера)
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION users.revoke_refresh_token(p_token TEXT)
    RETURNS BOOLEAN AS
$$
BEGIN
    UPDATE users.refresh_tokens
    SET revoked_at = NOW()
    WHERE token = p_token
      AND revoked_at IS NULL;

    RETURN FOUND; -- Вернет TRUE, если сессия была найдена и закрыта
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION users.revoke_all_refresh_tokens(
    p_user_id UUID,
    p_except_token TEXT DEFAULT NULL -- Токен текущего устройства, который нужно оставить живым
) RETURNS VOID AS
$$
BEGIN
    UPDATE users.refresh_tokens
    SET revoked_at = NOW()
    WHERE user_id = p_user_id
      AND revoked_at IS NULL
      AND (p_except_token IS NULL OR token != p_except_token);
END;
$$ LANGUAGE plpgsql;
-----

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
                po_is_new_user BOOLEAN
            )
AS
$$
DECLARE
    v_provider_id UUID;
    v_user_id     UUID;
    v_is_new      BOOLEAN := FALSE;
    v_username    TEXT;
BEGIN
    -- 1. Проверяем, существует ли провайдер
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
    SELECT u.id, u.username
    INTO v_user_id, v_username
    FROM users.user_auth_providers uap
             INNER JOIN users.users u ON u.id = uap.user_id
    WHERE uap.provider_id = v_provider_id
      AND uap.external_id = p_external_id;

    IF FOUND THEN
        RETURN QUERY SELECT v_user_id, v_username, FALSE;
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
            AND NOT EXISTS (SELECT 1 FROM users.users WHERE username = p_username AND deleted_at IS NULL) THEN
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
        ON CONFLICT (username) WHERE deleted_at IS NULL DO NOTHING
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

    RETURN QUERY SELECT v_user_id, v_username, v_is_new;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION groups.get_group_subscribers(p_alias TEXT)
    RETURNS TABLE
            (
                po_username TEXT
            )
AS
$$
BEGIN
    RETURN QUERY SELECT u.username
                 FROM groups.groups g
                          JOIN users.group_subscribe uf on g.id = uf.group_id
                          JOIN users.users u ON u.id = uf.from_user_id
                 WHERE g.alias = p_alias
                 ORDER BY uf.created_at DESC;
END;
$$ language plpgsql;


CREATE OR REPLACE FUNCTION main.create_post(
    p_id BIGINT,
    p_user_id UUID,
    p_parent_post_id BIGINT,
    p_title TEXT,
    p_content_type INT,
    p_content TEXT,
    p_comments_enabled BOOLEAN DEFAULT TRUE
)
    RETURNS TABLE
            (
                id             BIGINT,
                parent_post_id BIGINT,
                title          TEXT,
                content_type   INT,
                content        TEXT
            )
AS
$$
DECLARE
    v_parent_path ltree;
    v_new_path    ltree;
BEGIN
    -- 1. Формируем путь ltree
    IF p_parent_post_id IS NULL THEN
        -- Если это новый тред, путь = просто ID поста
        v_new_path := p_id::text::ltree;
    ELSE
        -- Запрашиваем путь родителя
        SELECT path
        INTO v_parent_path
        FROM main.posts
        WHERE main.posts.id = p_parent_post_id;

        -- Защита от "битых" ссылок
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent post % does not exist', p_parent_post_id;
        END IF;

        -- Склеиваем путь: путь_родителя || свой_id
        v_new_path := v_parent_path || p_id::text::ltree;
    END IF;

    -- 2. Создаем сам пост
    INSERT INTO main.posts (id, parent_post_id, path, title, content_type, content, comments_enabled)
    VALUES (p_id, p_parent_post_id, v_new_path, p_title, p_content_type, p_content, p_comments_enabled);

    -- 3. Создаем связь поста с пользователем
    INSERT INTO main.user_posts (post_id, user_id)
    VALUES (p_id, p_user_id);

    -- 4. Инициализируем статистику для НОВОГО поста (чтобы потом на него тоже могли отвечать)
    INSERT INTO main.post_stats (post_id)
    VALUES (p_id)
    ON CONFLICT (post_id) DO NOTHING;

    -- 5. Обновляем количество реплаев у РОДИТЕЛЬСКОГО поста (если он есть)
    IF p_parent_post_id IS NOT NULL THEN
        UPDATE main.post_stats
        SET replies_count = replies_count + 1
        WHERE post_id = p_parent_post_id;
    END IF;

    -- 6. Возвращаем результат
    -- Так как мы уже знаем все вставленные данные из входных параметров функции, 
    -- нам не нужно делать еще один SELECT из таблицы posts. Отдаем переменные напрямую!
    RETURN QUERY
        SELECT p_id,
               p_parent_post_id,
               p_title,
               p_content_type,
               p_content;

END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION main.update_post(p_id BIGINT, p_user_id UUID,
                                            p_title TEXT,
                                            p_content_type INT,
                                            p_content TEXT,
                                            p_comments_enabled BOOLEAN DEFAULT TRUE)
    RETURNS TABLE
            (
                id             BIGINT,
                parent_post_id BIGINT,
                title          TEXT,
                content_type   INT,
                content        TEXT
            )
AS
$$
BEGIN
    PERFORM 1
    FROM main.user_posts up
             JOIN main.posts p ON p.id = up.post_id
    WHERE up.user_id = p_user_id
      AND up.post_id = p_id
      AND p.deleted_at IS NULL
      AND p.created_at >= now() - interval '24 hours';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Update Permission denied';
    END IF;

    RETURN QUERY UPDATE main.posts p
        SET title = p_title,
            content_type = p_content_type,
            content = p_content,
            comments_enabled = p_comments_enabled,
            updated_at = now()
        WHERE p.id = p_id
            AND p.deleted_at IS NULL
            AND p.created_at >= now() - interval '24 hours'
        RETURNING
            p.id,
            p.parent_post_id,
            p.title,
            p.content_type,
            p.content;
END;
$$ language plpgsql;

CREATE OR REPLACE FUNCTION main.delete_post(p_post_id BIGINT, p_user_id UUID) RETURNS BOOLEAN AS
$$
DECLARE
    v_parent_id BIGINT;
    v_deleted   BOOLEAN;
BEGIN
    PERFORM 1
    FROM main.user_posts
    WHERE user_id = p_user_id
      AND post_id = p_post_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Delete Permission denied';
    END IF;

    -- Get parent ID before deletion to update stats
    SELECT parent_post_id INTO v_parent_id FROM main.posts WHERE id = p_post_id;

    UPDATE main.posts p
    SET deleted_at = now()
    WHERE p.id = p_post_id
      AND deleted_at IS NULL;
    v_deleted := FOUND;

    IF v_deleted AND v_parent_id IS NOT NULL THEN
        UPDATE main.post_stats
        SET replies_count = GREATEST(replies_count - 1, 0)
        WHERE post_id = v_parent_id;
    END IF;

    RETURN v_deleted;
END;
$$ language plpgsql;


CREATE OR REPLACE FUNCTION main.add_group_post(p_post_id BIGINT, p_group_alias TEXT) RETURNS BOOLEAN AS
$$
DECLARE
    target_group_id UUID;
BEGIN
    SELECT id FROM groups.groups WHERE alias = p_group_alias INTO target_group_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target group not found';
    END IF;
    -- Нужно учесть что группа или пост уже удалены (помечены)
    INSERT INTO main.group_posts (post_id, group_id)
    SELECT p.id, g.id
    FROM main.posts p
             CROSS JOIN groups.groups g
    WHERE p.id = p_post_id
      AND p.deleted_at IS NULL
      AND g.id = target_group_id
      AND g.deleted_at IS NULL
    -- Защита от дублей, если пост уже в этой группе
    ON CONFLICT (post_id, group_id) DO NOTHING;
    RETURN FOUND;
END;
$$ language plpgsql;

CREATE OR REPLACE FUNCTION main.delete_group_post(p_post_id BIGINT, p_group_alias TEXT) RETURNS BOOLEAN AS
$$
DECLARE
    target_group_id UUID;
BEGIN
    SELECT id FROM groups.groups WHERE alias = p_group_alias INTO target_group_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target group not found';
    END IF;

    DELETE
    FROM main.group_posts
    WHERE post_id = p_post_id
      AND group_id = target_group_id;
    RETURN FOUND;
END;
$$ language plpgsql;

-- Возвращет только оригинальные посты пользователя (без ответов)
CREATE OR REPLACE FUNCTION main.get_user_posts(p_username TEXT,
                                               p_limit INT DEFAULT 10,
                                               p_last_created_at TIMESTAMPTZ DEFAULT NULL,
                                               p_last_id BIGINT DEFAULT NULL)
    RETURNS TABLE
            (
                po_id                BIGINT,
                po_title             TEXT,
                po_content_type      INT,
                po_content           TEXT,
                po_parent_post_author_username    TEXT,
                po_parent_post_author_display_name    TEXT,
                po_user_username     TEXT,
                po_user_display_name TEXT,
                po_user_avatar_url   TEXT,
                po_comments_enabled  BOOLEAN,
                po_comments_count    BIGINT,
                po_replies_count     BIGINT,
                po_created_at        timestamptz,
                po_updated_at        timestamptz,
                po_deleted_at        timestamptz
            )
AS
$$
BEGIN
    RETURN QUERY SELECT p.id,
                        p.title,
                        p.content_type,
                        p.content,
                        NULL,
                        NULL,
                        u.username,
                        u.display_name,
                        ufi.avatar_url,
                        p.comments_enabled,
                        COALESCE(ps.comments_count, 0),
                        COALESCE(ps.replies_count, 0),
                        p.created_at,
                        p.updated_at,
                        NULL::timestamptz
                 FROM main.posts p
                          JOIN main.user_posts up ON up.post_id = p.id
                          JOIN users.users u on u.id = up.user_id
                          LEFT JOIN users.profile_info ufi ON u.id = ufi.user_id
                          LEFT JOIN main.post_stats ps on p.id = ps.post_id
                 WHERE u.username = p_username
                   AND u.deleted_at IS NULL
                   AND p.deleted_at IS NULL
                   AND p.parent_post_id IS NULL
                   AND (
                     p_last_created_at IS NULL
                         OR p_last_id IS NULL
                         OR (p.created_at, p.id) < (p_last_created_at, p_last_id)
                     )
                 -- Обязательно сортируем по двум полям, чтобы поддержать кортежное сравнение!
                 ORDER BY p.created_at DESC, p.id DESC
                 LIMIT p_limit;
END;
$$ language plpgsql;

-- Возвращет только оригинальные посты пользователя (без ответов)
CREATE OR REPLACE FUNCTION main.get_user_replies(p_username TEXT,
                                               p_limit INT DEFAULT 10,
                                               p_last_created_at TIMESTAMPTZ DEFAULT NULL,
                                               p_last_id BIGINT DEFAULT NULL)
    RETURNS TABLE
            (
                po_id                BIGINT,
                po_title             TEXT,
                po_content_type      INT,
                po_content           TEXT,
                po_parent_post_author_username    TEXT,
                po_parent_post_author_display_name    TEXT,
                po_user_username     TEXT,
                po_user_display_name TEXT,
                po_user_avatar_url   TEXT,
                po_comments_enabled  BOOLEAN,
                po_comments_count    BIGINT,
                po_replies_count     BIGINT,
                po_created_at        timestamptz,
                po_updated_at        timestamptz,
                po_deleted_at        timestamptz
            )
AS
$$
BEGIN
    RETURN QUERY SELECT p.id,
                        p.title,
                        p.content_type,
                        p.content,
                        pu.username,
                        pu.display_name,
                        u.username,
                        u.display_name,
                        ufi.avatar_url,
                        p.comments_enabled,
                        COALESCE(ps.comments_count, 0),
                        COALESCE(ps.replies_count, 0),
                        p.created_at,
                        p.updated_at,
                        NULL::timestamptz
                 FROM main.posts p
                        JOIN main.user_posts up ON up.post_id = p.id
                        JOIN users.users u on u.id = up.user_id
                        JOIN main.user_posts pup ON pup.post_id = p.parent_post_id
                        JOIN users.users pu on pu.id = pup.user_id
                        LEFT JOIN users.profile_info ufi ON u.id = ufi.user_id
                        LEFT JOIN main.post_stats ps on p.id = ps.post_id
                 WHERE u.username = p_username
                   AND u.deleted_at IS NULL
                   AND p.deleted_at IS NULL
                   AND p.parent_post_id IS NOT NULL
                   AND (
                     p_last_created_at IS NULL
                         OR p_last_id IS NULL
                         OR (p.created_at, p.id) < (p_last_created_at, p_last_id)
                     )
                 -- Обязательно сортируем по двум полям, чтобы поддержать кортежное сравнение!
                 ORDER BY p.created_at DESC, p.id DESC
                 LIMIT p_limit;
END;
$$ language plpgsql;

CREATE OR REPLACE FUNCTION main.get_user_reacted_posts(p_username TEXT,
                                                       p_limit INT DEFAULT 10,
                                                       p_last_created_at TIMESTAMPTZ DEFAULT NULL,
                                                       p_last_id BIGINT DEFAULT NULL)
    RETURNS TABLE
            (
                po_id                BIGINT,
                po_title             TEXT,
                po_content_type      INT,
                po_content           TEXT,
                po_parent_post_author_username    TEXT,
                po_parent_post_author_display_name    TEXT,
                po_user_username     TEXT,
                po_user_display_name TEXT,
                po_user_avatar_url   TEXT,
                po_comments_enabled  BOOLEAN,
                po_comments_count    BIGINT,
                po_replies_count     BIGINT,
                po_created_at        timestamptz,
                po_updated_at        timestamptz,
                po_deleted_at        timestamptz
            )
AS
$$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT u.id
    INTO v_user_id
    FROM users.users u
    WHERE u.username = p_username
      AND u.deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    RETURN QUERY
        WITH reacted_posts AS (
            SELECT DISTINCT pr.post_id
            FROM main.post_reactions pr
            WHERE pr.user_id = v_user_id
              AND pr.deleted_at IS NULL
        )
        SELECT p.id,
               p.title,
               p.content_type,
               p.content,
               pu.username,
               pu.display_name,
               u.username,
               u.display_name,
               ufi.avatar_url,
               p.comments_enabled,
               COALESCE(ps.comments_count, 0),
               COALESCE(ps.replies_count, 0),
               p.created_at,
               p.updated_at,
               NULL::timestamptz
        FROM reacted_posts rp
                 JOIN main.posts p ON p.id = rp.post_id
                 JOIN main.user_posts up ON up.post_id = p.id
                 JOIN users.users u on u.id = up.user_id
                 LEFT JOIN main.user_posts pup ON pup.post_id = p.parent_post_id
                 LEFT JOIN users.users pu on pu.id = pup.user_id AND pu.deleted_at IS NULL
                 LEFT JOIN users.profile_info ufi ON u.id = ufi.user_id
                 LEFT JOIN main.post_stats ps on p.id = ps.post_id
        WHERE u.deleted_at IS NULL
          AND p.deleted_at IS NULL
          AND (
            p_last_created_at IS NULL
                OR p_last_id IS NULL
                OR (p.created_at, p.id) < (p_last_created_at, p_last_id)
            )
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT p_limit;
END;
$$ language plpgsql;

CREATE OR REPLACE FUNCTION main.get_group_posts(p_alias TEXT,
                                                p_limit INT DEFAULT 10,
                                                p_last_created_at TIMESTAMPTZ DEFAULT NULL,
                                                p_last_id BIGINT DEFAULT NULL)
    RETURNS TABLE
            (
                po_id                BIGINT,
                po_title             TEXT,
                po_content_type      INT,
                po_content           TEXT,
                po_parent_post_id    BIGINT,
                po_user_username     TEXT,
                po_user_display_name TEXT,
                po_user_avatar_url   TEXT,
                po_comments_enabled  BOOLEAN,
                po_comments_count    BIGINT,
                po_replies_count     BIGINT,
                po_created_at        timestamptz,
                po_updated_at        timestamptz,
                po_deleted_at        timestamptz
            )
AS
$$
BEGIN
    RETURN QUERY SELECT p.id,
                        p.title,
                        p.content_type,
                        p.content,
                        p.parent_post_id,
                        u.username,
                        u.display_name,
                        ufi.avatar_url,
                        p.comments_enabled,
                        COALESCE(ps.comments_count, 0),
                        COALESCE(ps.replies_count, 0),
                        p.created_at,
                        p.updated_at,
                        NULL::timestamptz
                 FROM main.posts p
                          INNER JOIN main.group_posts gp ON p.id = gp.post_id
                          INNER JOIN groups.groups g ON g.id = gp.group_id
                          JOIN main.user_posts up ON up.post_id = p.id
                          JOIN users.users u on u.id = up.user_id
                          LEFT JOIN users.profile_info ufi ON u.id = ufi.user_id
                          LEFT JOIN main.post_stats ps on p.id = ps.post_id
                 WHERE g.alias = p_alias
                   AND g.deleted_at IS NULL
                   AND p.deleted_at IS NULL
                   AND (
                     p_last_created_at IS NULL
                         OR p_last_id IS NULL
                         OR (p.created_at, p.id) < (p_last_created_at, p_last_id)
                     )
                 -- Обязательно сортируем по двум полям, чтобы поддержать кортежное сравнение!
                 ORDER BY p.created_at DESC, p.id DESC
                 LIMIT p_limit;
END;
$$ language plpgsql;

CREATE OR REPLACE FUNCTION main.get_post(p_post_id BIGINT)
    RETURNS TABLE
            (
                po_id                BIGINT,
                po_title             TEXT,
                po_content_type      INT,
                po_content           TEXT,
                po_parent_post_author_username    TEXT,
                po_parent_post_author_display_name    TEXT,
                po_user_username     TEXT,
                po_user_display_name TEXT,
                po_user_avatar_url   TEXT,
                po_comments_enabled  BOOLEAN,
                po_comments_count    BIGINT,
                po_replies_count     BIGINT,
                po_created_at        timestamptz,
                po_updated_at        timestamptz,
                po_deleted_at        timestamptz
            )
AS
$$
BEGIN
    RETURN QUERY
        SELECT p.id,
               p.title,
               p.content_type,
               p.content,
               pu.username,
               pu.display_name,
               u.username,
               u.display_name,
               ufi.avatar_url,
               p.comments_enabled,
               COALESCE(ps.comments_count, 0),
               COALESCE(ps.replies_count, 0),
               p.created_at,
               p.updated_at,
               NULL::timestamptz
        FROM main.posts p
                 JOIN main.user_posts up ON up.post_id = p.id
                 JOIN users.users u on u.id = up.user_id
                JOIN main.user_posts pup ON pup.post_id = p.parent_post_id
                JOIN users.users pu on pu.id = pup.user_id
                 LEFT JOIN users.profile_info ufi ON u.id = ufi.user_id
                 LEFT JOIN main.post_stats ps on p.id = ps.post_id
        WHERE p.id = p_post_id
          AND p.deleted_at IS NULL;
END;
$$ language plpgsql;

CREATE OR REPLACE FUNCTION main.get_post_thread(p_post_id BIGINT)
    RETURNS TABLE
            (
                po_id                BIGINT,
                po_title             TEXT,
                po_content_type      INT,
                po_content           TEXT,
                po_parent_post_author_username    TEXT,
                po_parent_post_author_display_name    TEXT,
                po_user_username     TEXT,
                po_user_display_name TEXT,
                po_user_avatar_url   TEXT,
                po_comments_enabled  BOOLEAN,
                po_comments_count    BIGINT,
                po_replies_count     BIGINT,
                po_created_at        timestamptz,
                po_updated_at        timestamptz,
                po_deleted_at        timestamptz
            )
AS
$$
DECLARE
    v_target_path ltree;
BEGIN
    -- 1. Узнаем path нашего поста
    SELECT p.path
    INTO v_target_path
    FROM main.posts p
    WHERE p.id = p_post_id;

    -- Если пост удален или не существует, сразу выходим (возвращаем пустоту)
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- 2. Одним запросом достаем всех предков и сам пост!
    RETURN QUERY
        SELECT p.id,
               CASE WHEN p.deleted_at IS NULL THEN p.title ELSE '' END,
               CASE WHEN p.deleted_at IS NULL THEN p.content_type ELSE 0 END,
               CASE WHEN p.deleted_at IS NULL THEN p.content ELSE '' END,
               NULL,
               NULL,
               CASE WHEN p.deleted_at IS NULL THEN u.username ELSE '' END,
               CASE WHEN p.deleted_at IS NULL THEN u.display_name ELSE '' END,
               CASE WHEN p.deleted_at IS NULL THEN ufi.avatar_url ELSE NULL END,
               p.deleted_at IS NULL AND p.comments_enabled,
               CASE WHEN p.deleted_at IS NULL THEN COALESCE(ps.comments_count, 0) ELSE 0 END,
               CASE WHEN p.deleted_at IS NULL THEN COALESCE(ps.replies_count, 0) ELSE 0 END,
               p.created_at,
               p.updated_at,
               p.deleted_at
        FROM main.posts p
                 JOIN main.user_posts up ON up.post_id = p.id
                 JOIN users.users u on u.id = up.user_id
                 LEFT JOIN users.profile_info ufi ON u.id = ufi.user_id
                 LEFT JOIN main.post_stats ps on p.id = ps.post_id
        WHERE p.path @> v_target_path -- Магия ltree: достаем предков и сам узел
        ORDER BY p.path;
END;
$$ language plpgsql;

CREATE OR REPLACE FUNCTION main.add_post_reactions(p_post_id BIGINT, p_user_id UUID, p_reaction_name TEXT)
    RETURNS BOOLEAN AS
$$
DECLARE
    p_reaction_id UUID;
BEGIN
    SELECT id
    FROM main.reaction_types
    WHERE name = p_reaction_name
      AND is_active IS TRUE
      AND deleted_at IS NULL
    INTO p_reaction_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unknown reaction name';
    END IF;

    INSERT INTO main.post_reactions (post_id, user_id, reaction_id)
    SELECT p.id, p_user_id, p_reaction_id
    FROM main.posts p
    WHERE p.id = p_post_id
      AND p.deleted_at IS NULL
    ON CONFLICT (post_id, user_id, reaction_id) DO NOTHING;

    IF FOUND THEN
        INSERT INTO main.post_reaction_stats (post_id, reaction_id, count)
        VALUES (p_post_id, p_reaction_id, 1)
        ON CONFLICT (post_id, reaction_id) DO UPDATE
            SET count = main.post_reaction_stats.count + 1;

    END IF;

    RETURN FOUND;
END;
$$ language plpgsql;


CREATE OR REPLACE FUNCTION main.delete_post_reactions(p_post_id BIGINT, p_user_id UUID, p_reaction_name TEXT)
    RETURNS BOOLEAN AS
$$
DECLARE
    p_reaction_id UUID;
BEGIN
    SELECT id
    FROM main.reaction_types
    WHERE name = p_reaction_name
      AND is_active IS TRUE
      AND deleted_at IS NULL
    INTO p_reaction_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unknown reaction name';
    END IF;

    DELETE
    FROM main.post_reactions pr
    WHERE pr.post_id = p_post_id
      AND pr.user_id = p_user_id
      AND pr.reaction_id = p_reaction_id;
    IF FOUND THEN
        INSERT INTO main.post_reaction_stats (post_id, reaction_id, count)
        VALUES (p_post_id, p_reaction_id, 0)
        ON CONFLICT (post_id, reaction_id) DO UPDATE
            SET count = GREATEST(main.post_reaction_stats.count - 1, 0);

    END IF;

    RETURN FOUND;
END;
$$ language plpgsql;

CREATE OR REPLACE FUNCTION main.get_feed(p_limit INT DEFAULT 20,
                                         p_last_created_at TIMESTAMPTZ DEFAULT NULL,
                                         p_last_id BIGINT DEFAULT NULL)
    RETURNS TABLE
            (
                po_id                BIGINT,
                po_title             TEXT,
                po_content_type      INT,
                po_content           TEXT,
                po_parent_post_author_username    TEXT,
                po_parent_post_author_display_name    TEXT,
                po_user_username     TEXT,
                po_user_display_name TEXT,
                po_user_avatar_url   TEXT,
                po_comments_enabled  BOOLEAN,
                po_comments_count    BIGINT,
                po_replies_count     BIGINT,
                po_created_at        timestamptz,
                po_updated_at        timestamptz,
                po_deleted_at        timestamptz
            )
AS
$$
BEGIN
    RETURN QUERY SELECT p.id,
                        p.title,
                        p.content_type,
                        p.content,
                        pu.username,
                        pu.display_name,
                        u.username,
                        u.display_name,
                        ufi.avatar_url,
                        p.comments_enabled,
                        COALESCE(ps.comments_count, 0),
                        COALESCE(ps.replies_count, 0),
                        p.created_at,
                        p.updated_at,
                        NULL::timestamptz
                 FROM main.posts p
                          JOIN main.user_posts up ON up.post_id = p.id
                          JOIN users.users u on u.id = up.user_id
                        JOIN main.user_posts pup ON pup.post_id = p.parent_post_id
                        JOIN users.users pu on pu.id = pup.user_id
                          LEFT JOIN users.profile_info ufi ON u.id = ufi.user_id
                          LEFT JOIN main.post_stats ps on p.id = ps.post_id
                 WHERE u.deleted_at IS NULL
                   AND p.deleted_at IS NULL
                   AND (
                     p_last_created_at IS NULL
                         OR p_last_id IS NULL
                         OR (p.created_at, p.id) < (p_last_created_at, p_last_id)
                     )
                 ORDER BY p.created_at DESC, p.id DESC
                 LIMIT p_limit;
END;
$$ language plpgsql;

CREATE OR REPLACE FUNCTION main.sync_post_reaction_stats(p_limit INT DEFAULT 1000)
    RETURNS TABLE
            (
                po_processed_events BIGINT,
                po_affected_stats   BIGINT
            )
AS
$$
BEGIN
    -- Legacy async stats sync. Post reaction counters are currently updated synchronously
    -- in add_post_reactions/delete_post_reactions. New reaction mutations no longer write
    -- to post_reaction_events, so this function is kept only for old queued events or audit.
    RETURN QUERY
        WITH locked_events AS MATERIALIZED (
            SELECT id,
                   post_id,
                   reaction_id,
                   delta
            FROM main.post_reaction_events
            ORDER BY id
            LIMIT GREATEST(COALESCE(p_limit, 1000), 0)
            FOR UPDATE SKIP LOCKED
        ),
        aggregated AS (
            SELECT post_id,
                   reaction_id,
                   SUM(delta)::BIGINT AS delta_sum
            FROM locked_events
            GROUP BY post_id, reaction_id
        ),
        updated AS (
            UPDATE main.post_reaction_stats prs
            SET count = GREATEST(prs.count + a.delta_sum, 0)
            FROM aggregated a
            WHERE prs.post_id = a.post_id
              AND prs.reaction_id = a.reaction_id
            RETURNING prs.post_id, prs.reaction_id
        ),
        inserted AS (
            INSERT INTO main.post_reaction_stats (post_id, reaction_id, count)
            SELECT a.post_id,
                   a.reaction_id,
                   a.delta_sum
            FROM aggregated a
            WHERE a.delta_sum > 0
              AND NOT EXISTS (
                  SELECT 1
                  FROM updated u
                  WHERE u.post_id = a.post_id
                    AND u.reaction_id = a.reaction_id
              )
            ON CONFLICT (post_id, reaction_id) DO UPDATE
                SET count = GREATEST(main.post_reaction_stats.count + EXCLUDED.count, 0)
            RETURNING post_id, reaction_id
        ),
        deleted AS (
            DELETE FROM main.post_reaction_events pre
            USING locked_events le
            WHERE pre.id = le.id
            RETURNING pre.id
        )
        SELECT (SELECT COUNT(*) FROM deleted)::BIGINT,
               ((SELECT COUNT(*) FROM updated) + (SELECT COUNT(*) FROM inserted))::BIGINT;
END;
$$ language plpgsql;



CREATE OR REPLACE FUNCTION main.add_comment_reactions(p_comment_id BIGINT, p_user_id UUID, p_reaction_name TEXT)
    RETURNS BOOLEAN AS
$$
DECLARE
    p_reaction_id UUID;
BEGIN
    SELECT id
    FROM main.reaction_types
    WHERE name = p_reaction_name
      AND is_active IS TRUE
      AND deleted_at IS NULL
    INTO p_reaction_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unknown reaction name';
    END IF;

    INSERT INTO main.comment_reactions (comment_id, user_id, reaction_id)
    SELECT c.id, p_user_id, p_reaction_id
    FROM main.comments c
    WHERE c.id = p_comment_id
      AND c.deleted_at IS NULL
    ON CONFLICT (comment_id, user_id, reaction_id) DO NOTHING;

    IF FOUND THEN
        INSERT INTO main.comment_reaction_stats (comment_id, reaction_id, count)
        VALUES (p_comment_id, p_reaction_id, 1)
        ON CONFLICT (comment_id, reaction_id) DO UPDATE
            SET count = count + 1;
    END IF;

    RETURN FOUND;
END;
$$ language plpgsql;


CREATE OR REPLACE FUNCTION main.delete_comment_reactions(p_comment_id BIGINT, p_user_id UUID, p_reaction_name TEXT)
    RETURNS BOOLEAN AS
$$
DECLARE
    p_reaction_id UUID;
BEGIN
    SELECT id
    FROM main.reaction_types
    WHERE name = p_reaction_name
      AND is_active IS TRUE
      AND deleted_at IS NULL
    INTO p_reaction_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unknown reaction name';
    END IF;
    DELETE
    FROM main.comment_reactions cr
    WHERE cr.comment_id = p_comment_id
      AND cr.user_id = p_user_id
      AND cr.reaction_id = p_reaction_id;
    IF FOUND THEN
        INSERT INTO main.comment_reaction_stats (comment_id, reaction_id, count)
        VALUES (p_comment_id, p_reaction_id, 0)
        ON CONFLICT (comment_id, reaction_id) DO UPDATE
            SET count = GREATEST(count - 1, 0);
    END IF;

    RETURN FOUND;
END;
$$ language plpgsql;



CREATE OR REPLACE FUNCTION main.get_posts_permissions(p_post_ids BIGINT[], p_user_id UUID DEFAULT NULL)
    RETURNS TABLE
            (
                po_post_id     BIGINT,
                po_can_edit    BOOLEAN,
                po_can_delete  BOOLEAN
            )
AS
$$
BEGIN
    RETURN QUERY
        WITH requested_posts AS (
            SELECT DISTINCT unnest(p_post_ids) AS post_id
        )
        SELECT rp.post_id,
               p.id IS NOT NULL
                   AND p_user_id IS NOT NULL
                   AND up.user_id = p_user_id
                   AND p.created_at >= now() - interval '24 hours',
               p.id IS NOT NULL AND p_user_id IS NOT NULL AND up.user_id = p_user_id
        FROM requested_posts rp
                 LEFT JOIN main.posts p
                           ON p.id = rp.post_id
                          AND p.deleted_at IS NULL
                 LEFT JOIN main.user_posts up
                           ON up.post_id = p.id
                          AND p_user_id IS NOT NULL
                          AND up.user_id = p_user_id
        ORDER BY rp.post_id;
END;
$$ language plpgsql;


CREATE OR REPLACE FUNCTION main.get_posts_reactions(p_post_ids BIGINT[], p_user_id UUID DEFAULT NULL)
    RETURNS TABLE
            (
                po_post_id       BIGINT,
                po_reaction_name TEXT,
                po_count         BIGINT,
                po_is_selected   BOOLEAN
            )
AS
$$
BEGIN
    RETURN QUERY
        WITH requested_posts AS (
            SELECT DISTINCT unnest(p_post_ids) AS post_id
        )
        SELECT rp.post_id,
               rt.name,
               COALESCE(prs.count, 0),
               pr.user_id IS NOT NULL
        FROM requested_posts rp
                 CROSS JOIN main.reaction_types rt
                 LEFT JOIN main.post_reaction_stats prs
                           ON rt.id = prs.reaction_id AND prs.post_id = rp.post_id
                 LEFT JOIN main.post_reactions pr
                           ON p_user_id IS NOT NULL
                               AND rt.id = pr.reaction_id
                               AND pr.post_id = rp.post_id
                               AND pr.user_id = p_user_id
        WHERE rt.is_active IS TRUE
          AND rt.deleted_at IS NULL
        ORDER BY rp.post_id, rt.name;
END;
$$ language plpgsql;

CREATE OR REPLACE FUNCTION main.get_post_reactions(p_post_id BIGINT, p_user_id UUID DEFAULT NULL)
    RETURNS TABLE
            (
                po_reaction_name TEXT,
                po_count         BIGINT,
                po_is_selected   BOOLEAN
            )
AS
$$
BEGIN
    RETURN QUERY
        SELECT reactions.po_reaction_name,
               reactions.po_count,
               reactions.po_is_selected
        FROM main.get_posts_reactions(ARRAY[p_post_id], p_user_id) reactions
        WHERE reactions.po_post_id = p_post_id;
END;
$$ language plpgsql;


CREATE OR REPLACE FUNCTION main.get_comment_reactions(p_comment_id BIGINT)
    RETURNS TABLE
            (
                po_reaction_name TEXT,
                po_count         BIGINT
            )
AS
$$
BEGIN
    RETURN QUERY SELECT rt.name,
                        COALESCE(crs.count, 0)
                 FROM main.reaction_types rt
                          LEFT JOIN main.comment_reaction_stats crs
                                    ON rt.id = crs.reaction_id AND crs.comment_id = p_comment_id
                 WHERE rt.is_active IS TRUE
                   AND rt.deleted_at IS NULL;
END;
$$ language plpgsql;


CREATE OR REPLACE FUNCTION main.get_active_reactions()
    RETURNS TABLE
            (
                po_reaction_name TEXT
            )
AS
$$
BEGIN
    RETURN QUERY SELECT rt.name
                 FROM main.reaction_types rt
                 WHERE rt.is_active IS TRUE
                   AND rt.deleted_at IS NULL;
END;
$$ language plpgsql;


--- COMMENTS
CREATE OR REPLACE FUNCTION main.get_reply_comments(
    p_parent_comment_id BIGINT,
    p_limit INT DEFAULT 20,
    p_last_created_at TIMESTAMPTZ DEFAULT NULL,
    p_last_id BIGINT DEFAULT NULL
)
    RETURNS TABLE
            (
                po_id                  BIGINT,
                po_author_username     TEXT,
                po_author_display_name TEXT,
                po_author_avatar_url   TEXT,
                po_content_type        INT,
                po_content             TEXT,
                po_replies_count       INT,
                po_created_at          TIMESTAMPTZ,
                po_updated_at          TIMESTAMPTZ
            )
AS
$$
BEGIN

    RETURN QUERY
        SELECT c.id,
               u.username,
               u.display_name,
               ufi.avatar_url,
               c.content_type,
               c.content,
               c.replies_count,
               c.created_at,
               c.updated_at
        FROM main.comments c
                 INNER JOIN users.users u ON u.id = c.author_id
                 LEFT JOIN users.profile_info ufi ON u.id = ufi.user_id
        WHERE c.parent_comment_id = p_parent_comment_id
          AND c.deleted_at IS NULL
          AND (
            p_last_created_at IS NULL
                OR p_last_id IS NULL
                OR (c.created_at, c.id) < (p_last_created_at, p_last_id)
            )
        ORDER BY c.created_at DESC, c.id DESC
        LIMIT p_limit;

END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION main.get_post_comments(
    p_post_id BIGINT,
    p_limit INT DEFAULT 20,
    p_last_created_at TIMESTAMPTZ DEFAULT NULL,
    p_last_id BIGINT DEFAULT NULL
)
    RETURNS TABLE
            (
                po_id                  BIGINT,
                po_author_username     TEXT,
                po_author_display_name TEXT,
                po_author_avatar_url   TEXT,
                po_content_type        INT,
                po_content             TEXT,
                po_replies_count       INT,
                po_created_at          TIMESTAMPTZ,
                po_updated_at          TIMESTAMPTZ
            )
AS
$$
BEGIN

    RETURN QUERY
        SELECT c.id,
               u.username,
               u.display_name,
               ufi.avatar_url,
               c.content_type,
               c.content,
               c.replies_count,
               c.created_at,
               c.updated_at
        FROM main.comments c
                 INNER JOIN users.users u ON u.id = c.author_id
                 LEFT JOIN users.profile_info ufi ON u.id = ufi.user_id
        WHERE c.post_id = p_post_id
          AND c.parent_comment_id IS NULL
          AND c.deleted_at IS NULL
          AND (
            p_last_created_at IS NULL
                OR p_last_id IS NULL
                OR (c.created_at, c.id) < (p_last_created_at, p_last_id)
            )
        ORDER BY c.created_at DESC, c.id DESC
        LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION main.create_comment(p_post_id BIGINT,
                                               p_comment_id BIGINT,
                                               p_user_id UUID,
                                               p_content_type INT,
                                               p_content TEXT)
    RETURNS TABLE
            (
                po_id                BIGINT,
                po_content_type      INT,
                po_content           TEXT,
                po_parent_comment_id BIGINT,
                po_created_at        timestamptz,
                po_updated_at        timestamptz
            )
AS
$$
DECLARE
    v_new_path   ltree;
    v_created_at TIMESTAMPTZ;
    v_updated_at TIMESTAMPTZ;
BEGIN

    v_new_path := p_comment_id::text::ltree;

    INSERT INTO main.comments
        (id, post_id, author_id, content_type, content, parent_comment_id, path)
    SELECT p_comment_id, p.id, p_user_id, p_content_type, p_content, NULL, v_new_path
    FROM main.posts p
    WHERE p.id = p_post_id
      AND p.deleted_at IS NULL
      AND p.comments_enabled IS TRUE
    RETURNING main.comments.created_at, main.comments.updated_at
        INTO v_created_at, v_updated_at;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Post % does not exist or comments are disabled', p_post_id;
    END IF;

    INSERT INTO main.post_stats (post_id, comments_count)
    VALUES (p_post_id, 1)
    ON CONFLICT (post_id) DO UPDATE
        SET comments_count = main.post_stats.comments_count + 1;

    RETURN QUERY SELECT p_comment_id,
                        p_content_type,
                        p_content,
                        NULL::BIGINT,
                        v_created_at,
                        v_updated_at;
END;
$$ language plpgsql;

CREATE OR REPLACE FUNCTION main.create_reply_comment(
    p_comment_id BIGINT,
    p_user_id UUID,
    p_parent_comment_id BIGINT,
    p_content_type INT,
    p_content TEXT)
    RETURNS TABLE
            (
                po_id                BIGINT,
                po_content_type      INT,
                po_content           TEXT,
                po_parent_comment_id BIGINT,
                po_created_at        timestamptz,
                po_updated_at        timestamptz
            )
AS
$$
DECLARE
    v_parent_path    ltree;
    v_parent_post_id BIGINT;
    v_new_path       ltree;
    v_created_at     TIMESTAMPTZ;
    v_updated_at     TIMESTAMPTZ;
BEGIN

    SELECT c.path, c.post_id
    INTO v_parent_path, v_parent_post_id
    FROM main.comments c
             JOIN main.posts p ON p.id = c.post_id
    WHERE c.id = p_parent_comment_id
      AND c.deleted_at IS NULL
      AND p.deleted_at IS NULL
      AND p.comments_enabled IS TRUE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent comment id % not found', p_parent_comment_id;
    END IF;
    
    v_new_path := v_parent_path || p_comment_id::text::ltree;


    INSERT INTO main.comments
        (id, post_id, author_id, content_type, content, parent_comment_id, path)
        VALUES (p_comment_id, v_parent_post_id, p_user_id, p_content_type, p_content, p_parent_comment_id, v_new_path)
        RETURNING main.comments.created_at, main.comments.updated_at
            INTO v_created_at, v_updated_at;

    UPDATE main.comments
    SET replies_count = replies_count + 1
    WHERE id = p_parent_comment_id;

    RETURN QUERY SELECT p_comment_id,
                        p_content_type,
                        p_content,
                        p_parent_comment_id,
                        v_created_at,
                        v_updated_at;
END;
$$ language plpgsql;

CREATE OR REPLACE FUNCTION main.update_comment(p_comment_id BIGINT,
                                               p_user_id UUID,
                                               p_content_type INT,
                                               p_content TEXT)
    RETURNS TABLE
            (
                po_id                BIGINT,
                po_content_type      INT,
                po_content           TEXT,
                po_parent_comment_id BIGINT,
                po_created_at        timestamptz,
                po_updated_at        timestamptz
            )
AS
$$
BEGIN

    RETURN QUERY UPDATE main.comments SET
        content_type = p_content_type,
        content = p_content
        WHERE id = p_comment_id AND
              author_id = p_user_id AND
              deleted_at IS NULL
        RETURNING main.comments.id,
            main.comments.content_type,
            main.comments.content,
            main.comments.parent_comment_id,
            main.comments.created_at,
            main.comments.updated_at;
END;
$$ language plpgsql;

CREATE OR REPLACE FUNCTION main.delete_comment(p_comment_id BIGINT,
                                               p_user_id UUID)
    RETURNS BOOLEAN
AS
$$
DECLARE
    v_parent_comment_id BIGINT;
    v_post_id           BIGINT;
    v_deleted           BOOLEAN;
BEGIN

    UPDATE main.comments
    SET deleted_at = NOW()
    WHERE id = p_comment_id
      AND author_id = p_user_id
      AND deleted_at IS NULL
    RETURNING parent_comment_id, post_id
        INTO v_parent_comment_id, v_post_id;

    v_deleted := FOUND;

    IF v_deleted AND v_parent_comment_id IS NULL THEN
        UPDATE main.post_stats
        SET comments_count = GREATEST(comments_count - 1, 0)
        WHERE post_id = v_post_id;
    ELSIF v_deleted THEN
        UPDATE main.comments
        SET replies_count = GREATEST(replies_count - 1, 0)
        WHERE id = v_parent_comment_id;
    END IF;

    RETURN v_deleted;
END;

$$ language plpgsql;
