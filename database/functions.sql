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
DECLARE
    v_username TEXT := lower(p_username);
BEGIN
    IF EXISTS (SELECT 1 FROM users.users u WHERE u.username = v_username) THEN
        RAISE EXCEPTION 'Username already in usage';
    END IF;
    IF p_email IS NOT NULL
        AND EXISTS (SELECT 1 FROM users.users u WHERE u.email = p_email AND u.deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Email already in usage';
    END IF;

    RETURN QUERY INSERT INTO users.users (username, display_name, email)
        VALUES (v_username, p_display_name, p_email)
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


CREATE OR REPLACE FUNCTION users.restore_user(
    p_user_id UUID,
    p_expected_deleted_at TIMESTAMPTZ
)
    RETURNS BOOLEAN
AS
$$
DECLARE
    v_restored BOOLEAN;
BEGIN
    UPDATE users.users
    SET deleted_at = NULL,
        updated_at = NOW()
    WHERE id = p_user_id
      AND deleted_at = p_expected_deleted_at
      AND username IS NOT NULL
    RETURNING TRUE INTO v_restored;

    RETURN COALESCE(v_restored, FALSE);
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION users.delete_user(p_user_id UUID)
    RETURNS TIMESTAMPTZ
AS
$$
DECLARE
    v_deleted_at TIMESTAMPTZ;
BEGIN
    UPDATE users.users
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_user_id
      AND deleted_at IS NULL
    RETURNING deleted_at INTO v_deleted_at;

    IF v_deleted_at IS NULL THEN
        RETURN NULL;
    END IF;

    UPDATE users.auth_session_tokens token
    SET revoked_at = v_deleted_at
    FROM users.auth_sessions session
    WHERE token.session_id = session.id
      AND session.user_id = p_user_id
      AND token.revoked_at IS NULL;

    UPDATE users.auth_sessions
    SET revoked_at = v_deleted_at,
        revoked_reason = 'account_deleted'
    WHERE user_id = p_user_id
      AND revoked_at IS NULL;

    RETURN v_deleted_at;
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

CREATE OR REPLACE FUNCTION users.search_users(p_query TEXT,
                                              p_limit INT DEFAULT 20,
                                              p_user_id UUID DEFAULT NULL)
    RETURNS TABLE
            (
                po_username              TEXT,
                po_display_name          TEXT,
                po_avatar_url            TEXT,
                po_subscribers_count     BIGINT,
                po_is_subscribed         BOOLEAN,
                po_is_me                 BOOLEAN
            )
AS
$$
DECLARE
    v_query TEXT := lower(btrim(p_query));
BEGIN
    IF v_query IS NULL OR length(v_query) < 2 THEN
        RETURN;
    END IF;

    RETURN QUERY
        SELECT u.username,
               u.display_name,
               ufi.avatar_url,
               COALESCE(ufi.subscribers_count, 0),
               CASE
                   WHEN p_user_id IS NULL THEN FALSE
                   ELSE EXISTS (
                       SELECT 1
                       FROM users.user_subscribe us
                       WHERE us.from_user_id = p_user_id
                         AND us.to_user_id = u.id
                         AND us.deleted_at IS NULL
                   )
               END,
               CASE
                   WHEN p_user_id IS NULL THEN FALSE
                   ELSE p_user_id = u.id
               END
        FROM users.users u
                 LEFT JOIN users.profile_info ufi ON ufi.user_id = u.id
        WHERE u.deleted_at IS NULL
          AND (
            u.username = v_query
                OR u.username LIKE v_query || '%'
                OR lower(u.display_name) = v_query
                OR similarity(u.display_name, p_query) > 0.2
            )
        ORDER BY
            CASE
                WHEN u.username = v_query THEN 0
                WHEN u.username LIKE v_query || '%' THEN 1
                WHEN lower(u.display_name) = v_query THEN 2
                ELSE 3
            END,
            similarity(u.display_name, p_query) DESC,
            COALESCE(ufi.subscribers_count, 0) DESC,
            u.username
        LIMIT LEAST(GREATEST(p_limit, 1), 50);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION users.update_profile_info(p_user_id UUID,
                                                     p_display_name TEXT DEFAULT NULL,
                                                     p_description TEXT DEFAULT NULL,
                                                     p_avatar_url TEXT DEFAULT NULL)
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
                po_group_subscribes_count BIGINT
            )
AS
$$
BEGIN
    IF p_display_name IS NOT NULL THEN
        UPDATE users.users u
        SET display_name = p_display_name,
            updated_at = NOW()
        WHERE u.id = p_user_id
          AND u.deleted_at IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'User % not found', p_user_id;
        END IF;
    ELSE
        PERFORM 1
        FROM users.users u
        WHERE u.id = p_user_id
          AND u.deleted_at IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'User % not found', p_user_id;
        END IF;
    END IF;

    IF p_description IS NOT NULL OR p_avatar_url IS NOT NULL THEN
        INSERT INTO users.profile_info (user_id, description, avatar_url)
        VALUES (p_user_id, p_description, p_avatar_url)
        ON CONFLICT (user_id) DO UPDATE
            SET description = COALESCE(p_description, users.profile_info.description),
                avatar_url = COALESCE(p_avatar_url, users.profile_info.avatar_url);
    END IF;

    RETURN QUERY
        SELECT u.id,
               u.username,
               u.display_name,
               u.email,
               ufi.description,
               ufi.avatar_url,
               COALESCE(ufi.karma, 0),
               COALESCE(ufi.subscribers_count, 0),
               COALESCE(ufi.user_subscribes_count, 0),
               COALESCE(ufi.group_subscribes_count, 0)
        FROM users.users u
                 LEFT JOIN users.profile_info ufi ON ufi.user_id = u.id
        WHERE u.id = p_user_id
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
$$ LANGUAGE plpgsql;


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
$$ LANGUAGE plpgsql;



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
$$ LANGUAGE plpgsql;



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
$$ LANGUAGE plpgsql;



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
CREATE OR REPLACE FUNCTION users.create_auth_session(
    p_user_id UUID,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
) RETURNS UUID AS
$$
DECLARE
    v_session_id UUID;
BEGIN
    INSERT INTO users.auth_sessions (user_id, user_agent, last_ip_address, last_used_at)
    VALUES (p_user_id, p_user_agent, p_ip_address, NOW())
    RETURNING id INTO v_session_id;

    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION users.save_refresh_token(
    p_session_id UUID,
    p_token_hash TEXT,
    p_expires_in_days INT DEFAULT 30
) RETURNS VOID AS
$$
BEGIN
    INSERT INTO users.auth_session_tokens (session_id, token_hash, expires_at)
    VALUES (p_session_id,
            p_token_hash,
            NOW() + (p_expires_in_days || ' days')::INTERVAL);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION users.rotate_refresh_token(
    p_previous_token_hash TEXT,
    p_new_token_hash TEXT,
    p_expires_in_days INT DEFAULT 30,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
)
    RETURNS TABLE
            (
                po_user_id             UUID,
                po_is_rotated          BOOLEAN,
                po_should_revoke_all  BOOLEAN
            )
AS
$$
DECLARE
    v_user_id              UUID;
    v_session_id           UUID;
    v_revoked_at           TIMESTAMPTZ;
    v_expires_at           TIMESTAMPTZ;
    v_session_revoked_at   TIMESTAMPTZ;
    v_old_token_id         UUID;
    v_new_token_id         UUID;
BEGIN
    IF p_expires_in_days <= 0 THEN
        RAISE EXCEPTION 'Refresh token lifetime must be greater than zero';
    END IF;

    -- Lock the old token so concurrent refresh requests cannot rotate it twice.
    SELECT s.user_id, s.id, t.id, t.revoked_at, t.expires_at, s.revoked_at
    INTO v_user_id, v_session_id, v_old_token_id, v_revoked_at, v_expires_at, v_session_revoked_at
    FROM users.auth_session_tokens t
    INNER JOIN users.auth_sessions s ON s.id = t.session_id
    WHERE t.token_hash = p_previous_token_hash
    FOR UPDATE OF t, s;

    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, FALSE;
        RETURN;
    END IF;

    -- A revoked token means token reuse. The caller can revoke all sessions.
    IF v_revoked_at IS NOT NULL THEN
        RETURN QUERY SELECT v_user_id, FALSE, TRUE;
        RETURN;
    END IF;

    IF v_session_revoked_at IS NOT NULL THEN
        RETURN QUERY SELECT v_user_id, FALSE, FALSE;
        RETURN;
    END IF;

    IF v_expires_at <= NOW() THEN
        RETURN QUERY SELECT v_user_id, FALSE, FALSE;
        RETURN;
    END IF;

    UPDATE users.auth_session_tokens
    SET revoked_at = NOW()
    WHERE id = v_old_token_id;

    INSERT INTO users.auth_session_tokens (session_id, token_hash, expires_at)
    VALUES (
        v_session_id,
        p_new_token_hash,
        NOW() + (p_expires_in_days || ' days')::INTERVAL)
    RETURNING id INTO v_new_token_id;

    UPDATE users.auth_session_tokens
    SET replaced_by_id = v_new_token_id
    WHERE id = v_old_token_id;

    UPDATE users.auth_sessions s
    SET last_used_at = NOW(),
        user_agent = COALESCE(p_user_agent, user_agent),
        last_ip_address = COALESCE(p_ip_address, last_ip_address)
    WHERE id = v_session_id;

    RETURN QUERY SELECT v_user_id, TRUE, FALSE;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION users.validate_refresh_token(p_token_hash TEXT)
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
        SELECT s.user_id,
               t.revoked_at IS NOT NULL,
               t.revoked_at IS NULL AND t.expires_at > NOW() AND s.revoked_at IS NULL
        FROM users.auth_session_tokens t
        INNER JOIN users.auth_sessions s ON s.id = t.session_id
        WHERE t.token_hash = p_token_hash
        LIMIT 1;

    -- Если токен не найден, возвращаем пустую строку (бекенд поймет это как FALSE и разлогинит юзера)
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION users.revoke_refresh_token(p_token_hash TEXT)
    RETURNS BOOLEAN AS
$$
DECLARE
    v_session_id UUID;
    v_revoked   BOOLEAN;
BEGIN
    UPDATE users.auth_session_tokens
    SET revoked_at = NOW()
    WHERE token_hash = p_token_hash
      AND revoked_at IS NULL
    RETURNING session_id INTO v_session_id;

    v_revoked := FOUND;

    IF v_revoked THEN
        UPDATE users.auth_sessions
        SET revoked_at = NOW(),
            revoked_reason = 'logout'
        WHERE id = v_session_id
          AND revoked_at IS NULL;
    END IF;

    RETURN v_revoked; -- Вернет TRUE, если сессия была найдена и закрыта
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION users.revoke_all_refresh_tokens(
    p_user_id UUID,
    p_except_token_hash TEXT DEFAULT NULL -- Hash токена текущего устройства, который нужно оставить живым
) RETURNS VOID AS
$$
BEGIN
    UPDATE users.auth_session_tokens t
    SET revoked_at = NOW()
    FROM users.auth_sessions s
    WHERE t.session_id = s.id
      AND s.user_id = p_user_id
      AND t.revoked_at IS NULL
      AND (p_except_token_hash IS NULL OR t.token_hash != p_except_token_hash);

    UPDATE users.auth_sessions s
    SET revoked_at = NOW(),
        revoked_reason = 'revoked_all'
    WHERE s.user_id = p_user_id
      AND s.revoked_at IS NULL
      AND (
          p_except_token_hash IS NULL
          OR NOT EXISTS (
              SELECT 1
              FROM users.auth_session_tokens t
              WHERE t.session_id = s.id
                AND t.token_hash = p_except_token_hash
                AND t.revoked_at IS NULL
          )
      );
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
    p_content_type INT,
    p_content TEXT,
    p_comments_enabled BOOLEAN DEFAULT TRUE,
    p_title TEXT DEFAULT NULL
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

        IF nlevel(v_parent_path) >= 50 THEN
            RAISE EXCEPTION 'Maximum post thread depth exceeded'
                USING ERRCODE = '22023';
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
                                            p_content_type INT,
                                            p_content TEXT,
                                            p_comments_enabled BOOLEAN DEFAULT TRUE,
                                            p_title TEXT DEFAULT NULL)
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
                po_parent_post_author_deleted_at  TIMESTAMPTZ,
                po_user_username     TEXT,
                po_user_display_name TEXT,
                po_user_avatar_url   TEXT,
                po_user_deleted_at   TIMESTAMPTZ,
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
                        NULL::timestamptz,
                        u.username,
                        u.display_name,
                        ufi.avatar_url,
                        u.deleted_at,
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
                po_parent_post_author_deleted_at  TIMESTAMPTZ,
                po_user_username     TEXT,
                po_user_display_name TEXT,
                po_user_avatar_url   TEXT,
                po_user_deleted_at   TIMESTAMPTZ,
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
                        pu.deleted_at,
                        u.username,
                        u.display_name,
                        ufi.avatar_url,
                        u.deleted_at,
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
                po_parent_post_author_deleted_at  TIMESTAMPTZ,
                po_user_username     TEXT,
                po_user_display_name TEXT,
                po_user_avatar_url   TEXT,
                po_user_deleted_at   TIMESTAMPTZ,
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
               pu.deleted_at,
               u.username,
               u.display_name,
               ufi.avatar_url,
               u.deleted_at,
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
                 LEFT JOIN users.users pu on pu.id = pup.user_id
                 LEFT JOIN users.profile_info ufi ON u.id = ufi.user_id
                 LEFT JOIN main.post_stats ps on p.id = ps.post_id
        WHERE p.deleted_at IS NULL
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
                po_parent_post_author_deleted_at  TIMESTAMPTZ,
                po_user_username     TEXT,
                po_user_display_name TEXT,
                po_user_avatar_url   TEXT,
                po_user_deleted_at   TIMESTAMPTZ,
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
               pu.deleted_at,
               u.username,
               u.display_name,
               ufi.avatar_url,
               u.deleted_at,
               p.comments_enabled,
               COALESCE(ps.comments_count, 0),
               COALESCE(ps.replies_count, 0),
               p.created_at,
               p.updated_at,
               NULL::timestamptz
        FROM main.posts p
                 JOIN main.user_posts up ON up.post_id = p.id
                 JOIN users.users u on u.id = up.user_id
                 LEFT JOIN main.user_posts pup ON pup.post_id = p.parent_post_id
                 LEFT JOIN users.users pu on pu.id = pup.user_id
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
                po_parent_post_author_deleted_at  TIMESTAMPTZ,
                po_user_username     TEXT,
                po_user_display_name TEXT,
                po_user_avatar_url   TEXT,
                po_user_deleted_at   TIMESTAMPTZ,
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
               NULL::timestamptz,
               CASE WHEN p.deleted_at IS NULL THEN u.username ELSE '' END,
               CASE WHEN p.deleted_at IS NULL THEN u.display_name ELSE '' END,
               CASE WHEN p.deleted_at IS NULL THEN ufi.avatar_url ELSE NULL END,
               u.deleted_at,
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
    v_was_active BOOLEAN;
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

    SELECT EXISTS(
        SELECT 1
        FROM main.post_reactions pr
        WHERE pr.post_id = p_post_id
          AND pr.user_id = p_user_id
          AND pr.reaction_id = p_reaction_id
          AND pr.deleted_at IS NULL
    )
    INTO v_was_active;

    INSERT INTO main.post_reactions (post_id, user_id, reaction_id)
    SELECT p.id, p_user_id, p_reaction_id
    FROM main.posts p
    WHERE p.id = p_post_id
      AND p.deleted_at IS NULL
    ON CONFLICT (post_id, user_id, reaction_id) DO UPDATE
        SET deleted_at = NULL,
            updated_at = CASE
                WHEN main.post_reactions.deleted_at IS NULL THEN main.post_reactions.updated_at
                ELSE NOW()
            END;

    IF FOUND AND NOT v_was_active THEN
        INSERT INTO main.post_reaction_stats (post_id, reaction_id, count)
        VALUES (p_post_id, p_reaction_id, 1)
        ON CONFLICT (post_id, reaction_id) DO UPDATE
            SET count = main.post_reaction_stats.count + 1;

    END IF;

    RETURN FOUND OR v_was_active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, main, users, groups, public;


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

    UPDATE main.post_reactions pr
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE pr.post_id = p_post_id
      AND pr.user_id = p_user_id
      AND pr.reaction_id = p_reaction_id
      AND pr.deleted_at IS NULL;
    IF FOUND THEN
        INSERT INTO main.post_reaction_stats (post_id, reaction_id, count)
        VALUES (p_post_id, p_reaction_id, 0)
        ON CONFLICT (post_id, reaction_id) DO UPDATE
            SET count = GREATEST(main.post_reaction_stats.count - 1, 0);

    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, main, users, groups, public;

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
                po_parent_post_author_deleted_at  TIMESTAMPTZ,
                po_user_username     TEXT,
                po_user_display_name TEXT,
                po_user_avatar_url   TEXT,
                po_user_deleted_at   TIMESTAMPTZ,
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
                        pu.deleted_at,
                        u.username,
                        u.display_name,
                        ufi.avatar_url,
                        u.deleted_at,
                        p.comments_enabled,
                        COALESCE(ps.comments_count, 0),
                        COALESCE(ps.replies_count, 0),
                        p.created_at,
                        p.updated_at,
                        NULL::timestamptz
                 FROM main.posts p
                          JOIN main.user_posts up ON up.post_id = p.id
                          JOIN users.users u on u.id = up.user_id
                          LEFT JOIN main.user_posts pup ON pup.post_id = p.parent_post_id
                          LEFT JOIN users.users pu on pu.id = pup.user_id
                          LEFT JOIN users.profile_info ufi ON u.id = ufi.user_id
                          LEFT JOIN main.post_stats ps on p.id = ps.post_id
                 WHERE p.deleted_at IS NULL
                   AND (
                     p_last_created_at IS NULL
                         OR p_last_id IS NULL
                         OR (p.created_at, p.id) < (p_last_created_at, p_last_id)
                     )
                 ORDER BY p.created_at DESC, p.id DESC
                 LIMIT p_limit;
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
        INSERT INTO main.comment_reaction_stats as crs (comment_id, reaction_id, count)
        VALUES (p_comment_id, p_reaction_id, 1)
        ON CONFLICT (comment_id, reaction_id) DO UPDATE
            SET count = crs.count + 1;
    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, main, users, groups, public;


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
        INSERT INTO main.comment_reaction_stats as crs (comment_id, reaction_id, count)
        VALUES (p_comment_id, p_reaction_id, 0)
        ON CONFLICT (comment_id, reaction_id) DO UPDATE
            SET count = GREATEST(crs.count - 1, 0);
    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, main, users, groups, public;



CREATE OR REPLACE FUNCTION main.get_posts_permissions(p_post_ids BIGINT[], p_user_id UUID DEFAULT NULL)
    RETURNS TABLE
            (
                po_post_id     BIGINT,
                po_can_update  BOOLEAN,
                po_can_delete  BOOLEAN,
                po_can_reply   BOOLEAN
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
               p.id IS NOT NULL AND p_user_id IS NOT NULL AND up.user_id = p_user_id,
               p.id IS NOT NULL AND nlevel(p.path) < 50
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


CREATE OR REPLACE FUNCTION main.get_comments_permissions(p_comment_ids BIGINT[], p_user_id UUID)
    RETURNS TABLE
            (
                po_comment_id  BIGINT,
                po_can_update  BOOLEAN,
                po_can_delete  BOOLEAN,
                po_can_reply   BOOLEAN
            )
AS
$$
BEGIN
    RETURN QUERY
        WITH requested_comments AS (
            SELECT DISTINCT unnest(p_comment_ids) AS comment_id
        )
        SELECT rc.comment_id,
               c.id IS NOT NULL
                   AND c.author_id = p_user_id
                   AND c.created_at >= NOW() - INTERVAL '24 hours',
               c.id IS NOT NULL
                   AND c.author_id = p_user_id,
               c.id IS NOT NULL AND nlevel(c.path) < 7
        FROM requested_comments rc
                 LEFT JOIN main.comments c
                           ON c.id = rc.comment_id
                          AND c.deleted_at IS NULL
        ORDER BY rc.comment_id;
END;
$$ LANGUAGE plpgsql;


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
                               AND pr.deleted_at IS NULL
        WHERE rt.is_active IS TRUE
          AND rt.deleted_at IS NULL
        ORDER BY rp.post_id, rt.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, main, users, groups, public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, main, users, groups, public;


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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, main, users, groups, public;


CREATE OR REPLACE FUNCTION main.get_comments_reactions(p_comment_ids BIGINT[], p_user_id UUID DEFAULT NULL)
    RETURNS TABLE
            (
                po_comment_id    BIGINT,
                po_reaction_name TEXT,
                po_count         BIGINT,
                po_is_selected   BOOLEAN
            )
AS
$$
BEGIN
    RETURN QUERY
        WITH requested_comments AS (
            SELECT DISTINCT unnest(p_comment_ids) AS comment_id
        )
        SELECT rc.comment_id,
               rt.name,
               COALESCE(crs.count, 0),
               cr.user_id IS NOT NULL
        FROM requested_comments rc
                 CROSS JOIN main.reaction_types rt
                 LEFT JOIN main.comment_reaction_stats crs
                           ON rt.id = crs.reaction_id AND crs.comment_id = rc.comment_id
                 LEFT JOIN main.comment_reactions cr
                           ON p_user_id IS NOT NULL
                               AND rt.id = cr.reaction_id
                               AND cr.comment_id = rc.comment_id
                               AND cr.user_id = p_user_id
                               AND cr.deleted_at IS NULL
        WHERE rt.is_active IS TRUE
          AND rt.deleted_at IS NULL
        ORDER BY rc.comment_id, rt.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, main, users, groups, public;


CREATE OR REPLACE FUNCTION main.get_active_reactions()
    RETURNS TABLE
            (
                po_reaction_name TEXT,
                po_weight        DOUBLE PRECISION,
                po_icon          TEXT
            )
AS
$$
BEGIN
    RETURN QUERY SELECT rt.name,
                        rt.weight::DOUBLE PRECISION,
                        rt.icon
                 FROM main.reaction_types rt
                 WHERE rt.is_active IS TRUE
                   AND rt.deleted_at IS NULL
                 ORDER BY rt.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, main, users, groups, public;


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
                po_author_deleted_at   TIMESTAMPTZ,
                po_content_type        INT,
                po_content             TEXT,
                po_visible_replies_count INT,
                po_created_at          TIMESTAMPTZ,
                po_updated_at          TIMESTAMPTZ,
                po_deleted_at          TIMESTAMPTZ
            )
AS
$$
BEGIN

    RETURN QUERY
        SELECT c.id,
               CASE WHEN c.deleted_at IS NULL THEN COALESCE(u.username, '') ELSE '' END,
               CASE WHEN c.deleted_at IS NULL THEN COALESCE(u.display_name, '') ELSE '' END,
               CASE WHEN c.deleted_at IS NULL THEN ufi.avatar_url ELSE NULL END,
               u.deleted_at,
               CASE WHEN c.deleted_at IS NULL THEN c.content_type ELSE 0 END,
               CASE WHEN c.deleted_at IS NULL THEN c.content ELSE '' END,
               c.visible_replies_count,
               c.created_at,
               c.updated_at,
               c.deleted_at
        FROM main.comments c
                 LEFT JOIN users.users u ON u.id = c.author_id
                 LEFT JOIN users.profile_info ufi ON u.id = ufi.user_id
        WHERE c.parent_comment_id = p_parent_comment_id
          AND (c.deleted_at IS NULL OR c.visible_replies_count > 0)
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
                po_author_deleted_at   TIMESTAMPTZ,
                po_content_type        INT,
                po_content             TEXT,
                po_visible_replies_count INT,
                po_created_at          TIMESTAMPTZ,
                po_updated_at          TIMESTAMPTZ,
                po_deleted_at          TIMESTAMPTZ
            )
AS
$$
BEGIN

    RETURN QUERY
        SELECT c.id,
               CASE WHEN c.deleted_at IS NULL THEN COALESCE(u.username, '') ELSE '' END,
               CASE WHEN c.deleted_at IS NULL THEN COALESCE(u.display_name, '') ELSE '' END,
               CASE WHEN c.deleted_at IS NULL THEN ufi.avatar_url ELSE NULL END,
               u.deleted_at,
               CASE WHEN c.deleted_at IS NULL THEN c.content_type ELSE 0 END,
               CASE WHEN c.deleted_at IS NULL THEN c.content ELSE '' END,
               c.visible_replies_count,
               c.created_at,
               c.updated_at,
               c.deleted_at
        FROM main.comments c
                 LEFT JOIN users.users u ON u.id = c.author_id
                 LEFT JOIN users.profile_info ufi ON u.id = ufi.user_id
        WHERE c.post_id = p_post_id
          AND c.parent_comment_id IS NULL
          AND (c.deleted_at IS NULL OR c.visible_replies_count > 0)
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

    IF nlevel(v_parent_path) >= 7 THEN
        RAISE EXCEPTION 'Maximum comment nesting depth exceeded'
            USING ERRCODE = '22023';
    END IF;
    
    v_new_path := v_parent_path || p_comment_id::text::ltree;


    INSERT INTO main.comments
        (id, post_id, author_id, content_type, content, parent_comment_id, path)
        VALUES (p_comment_id, v_parent_post_id, p_user_id, p_content_type, p_content, p_parent_comment_id, v_new_path)
        RETURNING main.comments.created_at, main.comments.updated_at
            INTO v_created_at, v_updated_at;

    UPDATE main.comments
    SET visible_replies_count = visible_replies_count + 1
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
        content = p_content,
        updated_at = NOW()
        WHERE id = p_comment_id AND
              author_id = p_user_id AND
              deleted_at IS NULL AND
              created_at >= NOW() - INTERVAL '24 hours'
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
    v_has_visible_descendants BOOLEAN;
    v_current_parent_id BIGINT;
    v_next_parent_id BIGINT;
    v_parent_deleted_at TIMESTAMPTZ;
    v_parent_visible_replies_count INT;
BEGIN

    SELECT EXISTS (
        SELECT 1
        FROM main.comments descendant
                 JOIN main.comments target ON descendant.path <@ target.path
        WHERE target.id = p_comment_id
          AND descendant.id <> target.id
          AND descendant.deleted_at IS NULL
    )
    INTO v_has_visible_descendants;

    UPDATE main.comments
    SET deleted_at = NOW()
    WHERE id = p_comment_id
      AND author_id = p_user_id
      AND deleted_at IS NULL
    RETURNING parent_comment_id, post_id
        INTO v_parent_comment_id, v_post_id;

    v_deleted := FOUND;

    IF NOT v_deleted THEN
        RETURN FALSE;
    END IF;

    IF v_has_visible_descendants THEN
        RETURN TRUE;
    END IF;

    IF v_parent_comment_id IS NULL THEN
        UPDATE main.post_stats
        SET comments_count = GREATEST(comments_count - 1, 0)
        WHERE post_id = v_post_id;
    ELSE
        v_current_parent_id := v_parent_comment_id;

        LOOP
            UPDATE main.comments
            SET visible_replies_count = GREATEST(visible_replies_count - 1, 0)
            WHERE id = v_current_parent_id
            RETURNING parent_comment_id, deleted_at, visible_replies_count
                INTO v_next_parent_id, v_parent_deleted_at, v_parent_visible_replies_count;

            EXIT WHEN NOT FOUND;
            EXIT WHEN v_parent_deleted_at IS NULL OR v_parent_visible_replies_count > 0;

            IF v_next_parent_id IS NULL THEN
                UPDATE main.post_stats
                SET comments_count = GREATEST(comments_count - 1, 0)
                WHERE post_id = v_post_id;
                EXIT;
            END IF;

            v_current_parent_id := v_next_parent_id;
        END LOOP;
    END IF;

    RETURN TRUE;
END;

$$ language plpgsql;
CREATE OR REPLACE FUNCTION main.record_donation(
    pi_operation_id TEXT,
    pi_user_id UUID,
    pi_amount NUMERIC,
    pi_withdraw_amount NUMERIC,
    pi_notification_type TEXT,
    pi_occurred_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, main, users
AS $$
DECLARE
    v_rows_inserted INTEGER;
BEGIN
    IF pi_operation_id IS NULL OR btrim(pi_operation_id) = '' OR length(pi_operation_id) > 128 THEN
        RAISE EXCEPTION 'Invalid donation operation id' USING ERRCODE = '22023';
    END IF;

    IF pi_amount <= 0 OR pi_withdraw_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid donation amount' USING ERRCODE = '22023';
    END IF;

    IF pi_notification_type NOT IN ('p2p-incoming', 'card-incoming') THEN
        RAISE EXCEPTION 'Invalid donation notification type' USING ERRCODE = '22023';
    END IF;

    INSERT INTO main.donations (
        operation_id,
        user_id,
        amount,
        withdraw_amount,
        notification_type,
        occurred_at
    )
    VALUES (
        pi_operation_id,
        CASE
            WHEN EXISTS (SELECT 1 FROM users.users u WHERE u.id = pi_user_id) THEN pi_user_id
            ELSE NULL
        END,
        pi_amount,
        pi_withdraw_amount,
        pi_notification_type,
        pi_occurred_at
    )
    ON CONFLICT (operation_id) DO NOTHING;

    GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;
    RETURN v_rows_inserted = 1;
END;
$$;
