CREATE OR REPLACE FUNCTION main.delete_post(p_post_id BIGINT, p_user_id UUID) RETURNS BOOLEAN AS
$$
DECLARE
    v_parent_id BIGINT;
    v_deleted   BOOLEAN;
BEGIN
    PERFORM 1
    FROM main.user_posts
    WHERE user_id = p_user_id
      AND post_id = p_post_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Delete Permission denied';
    END IF;

    -- Get parent ID before deletion to update stats
    SELECT parent_post_id INTO v_parent_id FROM main.posts WHERE id = p_post_id;

    UPDATE main.posts p
    SET deleted_at = now()
    WHERE p.id = p_post_id
      AND deleted_at IS NULL;
    v_deleted := FOUND;

    IF v_deleted AND v_parent_id IS NOT NULL THEN
        UPDATE main.post_stats
        SET replies_count = GREATEST(replies_count - 1, 0)
        WHERE post_id = v_parent_id;
    END IF;

    RETURN v_deleted;
END;
$$ language plpgsql;
