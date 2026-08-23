CREATE OR REPLACE FUNCTION users.restore_user(
    p_user_id UUID,
    p_expected_deleted_at TIMESTAMPTZ
)
    RETURNS BOOLEAN
AS
$$
DECLARE
    v_restored BOOLEAN;
BEGIN
    UPDATE users.users
    SET deleted_at = NULL,
        updated_at = NOW()
    WHERE id = p_user_id
      AND deleted_at = p_expected_deleted_at
      AND username IS NOT NULL
    RETURNING TRUE INTO v_restored;

    RETURN COALESCE(v_restored, FALSE);
END;
$$ LANGUAGE plpgsql;
