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
