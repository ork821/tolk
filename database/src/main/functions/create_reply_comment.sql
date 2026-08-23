CREATE OR REPLACE FUNCTION main.create_reply_comment(
    p_comment_id BIGINT,
    p_user_id UUID,
    p_parent_comment_id BIGINT,
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
    v_parent_path    ltree;
    v_parent_post_id BIGINT;
    v_new_path       ltree;
    v_created_at     TIMESTAMPTZ;
    v_updated_at     TIMESTAMPTZ;
BEGIN

    SELECT c.path, c.post_id
    INTO v_parent_path, v_parent_post_id
    FROM main.comments c
             JOIN main.posts p ON p.id = c.post_id
    WHERE c.id = p_parent_comment_id
      AND c.deleted_at IS NULL
      AND p.deleted_at IS NULL
      AND p.comments_enabled IS TRUE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent comment id % not found', p_parent_comment_id;
    END IF;

    IF nlevel(v_parent_path) >= 7 THEN
        RAISE EXCEPTION 'Maximum comment nesting depth exceeded'
            USING ERRCODE = '22023';
    END IF;
    
    v_new_path := v_parent_path || p_comment_id::text::ltree;


    INSERT INTO main.comments
        (id, post_id, author_id, content_type, content, parent_comment_id, path)
        VALUES (p_comment_id, v_parent_post_id, p_user_id, p_content_type, p_content, p_parent_comment_id, v_new_path)
        RETURNING main.comments.created_at, main.comments.updated_at
            INTO v_created_at, v_updated_at;

    UPDATE main.comments
    SET visible_replies_count = visible_replies_count + 1
    WHERE id = p_parent_comment_id;

    RETURN QUERY SELECT p_comment_id,
                        p_content_type,
                        p_content,
                        p_parent_comment_id,
                        v_created_at,
                        v_updated_at;
END;
$$ language plpgsql;
