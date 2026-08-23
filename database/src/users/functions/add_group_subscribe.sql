CREATE OR REPLACE FUNCTION users.add_group_subscribe(p_from_user_id UUID, p_target_group_alias TEXT) RETURNS VOID as
$$
DECLARE
    target_group_id UUID;
BEGIN
    SELECT id FROM groups.groups WHERE alias = p_target_group_alias INTO target_group_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target group not found';
    END IF;

    INSERT INTO users.group_subscribe (from_user_id, group_id)
    VALUES (p_from_user_id, target_group_id)
    ON CONFLICT DO NOTHING;
    IF FOUND THEN
        INSERT INTO users.profile_info AS pi (user_id, group_subscribes_count)
        VALUES (p_from_user_id, 1)
        ON CONFLICT (user_id) DO UPDATE SET group_subscribes_count = pi.group_subscribes_count + 1;

        INSERT INTO groups.group_info AS gi (group_id, subscribers_count)
        VALUES (target_group_id, 1)
        ON CONFLICT (group_id) DO UPDATE SET subscribers_count = gi.subscribers_count + 1;
    END IF;
END;
$$
    LANGUAGE plpgsql;
