CREATE OR REPLACE FUNCTION users.is_user_subscribed(p_user_id UUID, p_target_username TEXT)
    RETURNS BOOLEAN
AS
$$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM users.users tu
                 JOIN users.user_subscribe uf ON tu.id = uf.to_user_id AND uf.from_user_id = p_user_id
        WHERE tu.username = p_target_username
          AND tu.deleted_at IS NULL
          AND uf.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql;
