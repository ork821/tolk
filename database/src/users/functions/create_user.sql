CREATE OR REPLACE FUNCTION users.create_user(p_username TEXT, p_display_name TEXT, p_email TEXT)
    RETURNS TABLE
            (
                po_user_id      UUID,
                po_username     TEXT,
                po_display_name TEXT,
                po_email        TEXT
            )
AS
$$
DECLARE
    v_username TEXT := lower(p_username);
BEGIN
    IF EXISTS (SELECT 1 FROM users.users u WHERE u.username = v_username) THEN
        RAISE EXCEPTION 'Username already in usage';
    END IF;
    IF p_email IS NOT NULL
        AND EXISTS (SELECT 1 FROM users.users u WHERE u.email = p_email AND u.deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Email already in usage';
    END IF;

    RETURN QUERY INSERT INTO users.users (username, display_name, email)
        VALUES (v_username, p_display_name, p_email)
        RETURNING
            id as po_user_id,
            username as po_username,
            users.display_name as po_display_name,
            email as po_email;
EXCEPTION
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Username or email already in usage';
END;
$$ LANGUAGE plpgsql;
