CREATE OR REPLACE FUNCTION users.create_auth_session(
    p_user_id UUID,
    p_user_agent TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL
) RETURNS UUID AS
$$
DECLARE
    v_session_id UUID;
BEGIN
    INSERT INTO users.auth_sessions (user_id, user_agent, last_ip_address, last_used_at)
    VALUES (p_user_id, p_user_agent, p_ip_address, NOW())
    RETURNING id INTO v_session_id;

    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;
