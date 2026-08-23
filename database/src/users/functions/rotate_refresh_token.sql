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
