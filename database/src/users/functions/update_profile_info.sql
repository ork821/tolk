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
