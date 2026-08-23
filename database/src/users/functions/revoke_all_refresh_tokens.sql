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
