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
