CREATE OR REPLACE FUNCTION users.add_user_subscribe(p_from_user_id UUID, p_to_username TEXT) RETURNS VOID as
$$
DECLARE
    target_user_id UUID;
BEGIN
    SELECT id FROM users.users WHERE username = p_to_username AND deleted_at IS NULL INTO target_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target user not found';
    END IF;
    IF p_from_user_id = target_user_id THEN
        RAISE EXCEPTION 'User cannot subscribe to themselves';
    END IF;

    INSERT INTO users.user_subscribe (from_user_id, to_user_id)
    VALUES (p_from_user_id, target_user_id)
    ON CONFLICT DO NOTHING;

    IF FOUND THEN
        INSERT INTO users.profile_info AS pi (user_id, user_subscribes_count)
        VALUES (p_from_user_id, 1)
        ON CONFLICT (user_id) DO UPDATE SET user_subscribes_count = pi.user_subscribes_count + 1;

        INSERT INTO users.profile_info AS pi (user_id, subscribers_count)
        VALUES (target_user_id, 1)
        ON CONFLICT (user_id) DO UPDATE SET subscribers_count = pi.subscribers_count + 1;
    END IF;
END;
$$
    LANGUAGE plpgsql;
