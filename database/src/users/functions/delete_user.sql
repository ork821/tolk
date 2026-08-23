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
