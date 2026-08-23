CREATE OR REPLACE FUNCTION users.remove_user_subscribe(p_from_user_id UUID, p_to_username TEXT) RETURNS VOID as
$$
DECLARE
    target_user_id UUID;
BEGIN
    SELECT id FROM users.users WHERE username = p_to_username INTO target_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target user not found';
    END IF;

    DELETE FROM users.user_subscribe uf WHERE uf.from_user_id = p_from_user_id AND uf.to_user_id = target_user_id;
    IF FOUND THEN
        INSERT INTO users.profile_info AS pi (user_id, user_subscribes_count)
        VALUES (p_from_user_id, 0)
        ON CONFLICT (user_id) DO UPDATE SET user_subscribes_count = GREATEST(pi.user_subscribes_count - 1, 0);

        INSERT INTO users.profile_info AS pi (user_id, subscribers_count)
        VALUES (target_user_id, 0)
        ON CONFLICT (user_id) DO UPDATE SET subscribers_count = GREATEST(pi.subscribers_count - 1, 0);
    END IF;
END;
$$
    LANGUAGE plpgsql;
