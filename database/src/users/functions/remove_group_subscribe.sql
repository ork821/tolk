CREATE OR REPLACE FUNCTION users.remove_group_subscribe(p_from_user_id UUID, p_target_group_alias TEXT) RETURNS VOID as
$$
DECLARE
    target_group_id UUID;
BEGIN
    SELECT id FROM groups.groups WHERE alias = p_target_group_alias INTO target_group_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target group not found';
    END IF;

    DELETE FROM users.group_subscribe gf WHERE gf.from_user_id = p_from_user_id AND gf.group_id = target_group_id;
    IF FOUND THEN
        INSERT INTO users.profile_info AS pi (user_id, group_subscribes_count)
        VALUES (p_from_user_id, 0)
        ON CONFLICT (user_id) DO UPDATE SET group_subscribes_count = GREATEST(pi.group_subscribes_count - 1, 0);

        INSERT INTO groups.group_info AS gi (group_id, subscribers_count)
        VALUES (target_group_id, 0)
        ON CONFLICT (group_id) DO UPDATE SET subscribers_count = GREATEST(gi.subscribers_count - 1, 0);
    ELSE
        RAISE EXCEPTION 'Group subscribe info not found';
    END IF;
END;
$$
    LANGUAGE plpgsql;
