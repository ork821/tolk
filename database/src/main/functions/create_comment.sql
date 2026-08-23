CREATE OR REPLACE FUNCTION main.create_comment(p_post_id BIGINT,
                                               p_comment_id BIGINT,
                                               p_user_id UUID,
                                               p_content_type INT,
                                               p_content TEXT)
    RETURNS TABLE
            (
                po_id                BIGINT,
                po_content_type      INT,
                po_content           TEXT,
                po_parent_comment_id BIGINT,
                po_created_at        timestamptz,
                po_updated_at        timestamptz
            )
AS
$$
DECLARE
    v_new_path   ltree;
    v_created_at TIMESTAMPTZ;
    v_updated_at TIMESTAMPTZ;
BEGIN

    v_new_path := p_comment_id::text::ltree;

    INSERT INTO main.comments
        (id, post_id, author_id, content_type, content, parent_comment_id, path)
    SELECT p_comment_id, p.id, p_user_id, p_content_type, p_content, NULL, v_new_path
    FROM main.posts p
    WHERE p.id = p_post_id
      AND p.deleted_at IS NULL
      AND p.comments_enabled IS TRUE
    RETURNING main.comments.created_at, main.comments.updated_at
        INTO v_created_at, v_updated_at;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Post % does not exist or comments are disabled', p_post_id;
    END IF;

    INSERT INTO main.post_stats (post_id, comments_count)
    VALUES (p_post_id, 1)
    ON CONFLICT (post_id) DO UPDATE
        SET comments_count = main.post_stats.comments_count + 1;

    RETURN QUERY SELECT p_comment_id,
                        p_content_type,
                        p_content,
                        NULL::BIGINT,
                        v_created_at,
                        v_updated_at;
END;
$$ language plpgsql;
