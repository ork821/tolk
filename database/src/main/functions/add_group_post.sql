CREATE OR REPLACE FUNCTION main.add_group_post(p_post_id BIGINT, p_group_alias TEXT) RETURNS BOOLEAN AS
$$
DECLARE
    target_group_id UUID;
BEGIN
    SELECT id FROM groups.groups WHERE alias = p_group_alias INTO target_group_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target group not found';
    END IF;
    -- Нужно учесть что группа или пост уже удалены (помечены)
    INSERT INTO main.group_posts (post_id, group_id)
    SELECT p.id, g.id
    FROM main.posts p
             CROSS JOIN groups.groups g
    WHERE p.id = p_post_id
      AND p.deleted_at IS NULL
      AND g.id = target_group_id
      AND g.deleted_at IS NULL
    -- Защита от дублей, если пост уже в этой группе
    ON CONFLICT (post_id, group_id) DO NOTHING;
    RETURN FOUND;
END;
$$ language plpgsql;
