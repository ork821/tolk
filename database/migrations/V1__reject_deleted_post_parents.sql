CREATE OR REPLACE FUNCTION main.create_post(
    p_id BIGINT,
    p_user_id UUID,
    p_parent_post_id BIGINT,
    p_content_type INT,
    p_content TEXT,
    p_comments_enabled BOOLEAN DEFAULT TRUE,
    p_title TEXT DEFAULT NULL
)
RETURNS TABLE
        (
            id             BIGINT,
            parent_post_id BIGINT,
            title          TEXT,
            content_type   INT,
            content        TEXT
        )
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, main, users, groups, public
AS $$
DECLARE
    v_parent_path public.ltree;
    v_new_path    public.ltree;
BEGIN
    IF p_parent_post_id IS NULL THEN
        v_new_path := p_id::text::ltree;
    ELSE
        SELECT post.path
        INTO v_parent_path
        FROM main.posts post
        WHERE post.id = p_parent_post_id
          AND post.deleted_at IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent post % does not exist or is deleted', p_parent_post_id
                USING ERRCODE = '22023';
        END IF;

        IF nlevel(v_parent_path) >= 50 THEN
            RAISE EXCEPTION 'Maximum post thread depth exceeded'
                USING ERRCODE = '22023';
        END IF;

        v_new_path := v_parent_path || p_id::text::ltree;
    END IF;

    INSERT INTO main.posts (id, parent_post_id, path, title, content_type, content, comments_enabled)
    VALUES (p_id, p_parent_post_id, v_new_path, p_title, p_content_type, p_content, p_comments_enabled);

    INSERT INTO main.user_posts (post_id, user_id)
    VALUES (p_id, p_user_id);

    INSERT INTO main.post_stats (post_id)
    VALUES (p_id)
    ON CONFLICT (post_id) DO NOTHING;

    IF p_parent_post_id IS NOT NULL THEN
        UPDATE main.post_stats
        SET replies_count = replies_count + 1
        WHERE post_id = p_parent_post_id;
    END IF;

    RETURN QUERY
        SELECT p_id,
               p_parent_post_id,
               p_title,
               p_content_type,
               p_content;
END;
$$;
