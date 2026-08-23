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
