CREATE OR REPLACE FUNCTION main.update_comment(p_comment_id BIGINT,
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
BEGIN

    RETURN QUERY UPDATE main.comments SET
        content_type = p_content_type,
        content = p_content,
        updated_at = NOW()
        WHERE id = p_comment_id AND
              author_id = p_user_id AND
              deleted_at IS NULL AND
              created_at >= NOW() - INTERVAL '24 hours'
        RETURNING main.comments.id,
            main.comments.content_type,
            main.comments.content,
            main.comments.parent_comment_id,
            main.comments.created_at,
            main.comments.updated_at;
END;
$$ language plpgsql;
