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
