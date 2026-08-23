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
