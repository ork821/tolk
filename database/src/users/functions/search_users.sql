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
