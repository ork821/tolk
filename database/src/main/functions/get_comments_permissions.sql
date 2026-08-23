CREATE OR REPLACE FUNCTION main.get_comments_permissions(p_comment_ids BIGINT[], p_user_id UUID)
    RETURNS TABLE
            (
                po_comment_id  BIGINT,
                po_can_update  BOOLEAN,
                po_can_delete  BOOLEAN,
                po_can_reply   BOOLEAN
            )
AS
$$
BEGIN
    RETURN QUERY
        WITH requested_comments AS (
            SELECT DISTINCT unnest(p_comment_ids) AS comment_id
        )
        SELECT rc.comment_id,
               c.id IS NOT NULL
                   AND c.author_id = p_user_id
                   AND c.created_at >= NOW() - INTERVAL '24 hours',
               c.id IS NOT NULL
                   AND c.author_id = p_user_id,
               c.id IS NOT NULL AND nlevel(c.path) < 7
        FROM requested_comments rc
                 LEFT JOIN main.comments c
                           ON c.id = rc.comment_id
                          AND c.deleted_at IS NULL
        ORDER BY rc.comment_id;
END;
$$ LANGUAGE plpgsql;
