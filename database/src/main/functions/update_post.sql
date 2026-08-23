CREATE OR REPLACE FUNCTION main.update_post(p_id BIGINT, p_user_id UUID,
                                            p_content_type INT,
                                            p_content TEXT,
                                            p_comments_enabled BOOLEAN DEFAULT TRUE,
                                            p_title TEXT DEFAULT NULL)
    RETURNS TABLE
            (
                id             BIGINT,
                parent_post_id BIGINT,
                title          TEXT,
                content_type   INT,
                content        TEXT
            )
AS
$$
BEGIN
    PERFORM 1
    FROM main.user_posts up
             JOIN main.posts p ON p.id = up.post_id
    WHERE up.user_id = p_user_id
      AND up.post_id = p_id
      AND p.deleted_at IS NULL
      AND p.created_at >= now() - interval '24 hours';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Update Permission denied';
    END IF;

    RETURN QUERY UPDATE main.posts p
        SET title = p_title,
            content_type = p_content_type,
            content = p_content,
            comments_enabled = p_comments_enabled,
            updated_at = now()
        WHERE p.id = p_id
            AND p.deleted_at IS NULL
            AND p.created_at >= now() - interval '24 hours'
        RETURNING
            p.id,
            p.parent_post_id,
            p.title,
            p.content_type,
            p.content;
END;
$$ language plpgsql;
