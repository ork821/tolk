CREATE OR REPLACE FUNCTION main.delete_group_post(p_post_id BIGINT, p_group_alias TEXT) RETURNS BOOLEAN AS
$$
DECLARE
    target_group_id UUID;
BEGIN
    SELECT id FROM groups.groups WHERE alias = p_group_alias INTO target_group_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Target group not found';
    END IF;

    DELETE
    FROM main.group_posts
    WHERE post_id = p_post_id
      AND group_id = target_group_id;
    RETURN FOUND;
END;
$$ language plpgsql;
