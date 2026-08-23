CREATE OR REPLACE FUNCTION main.get_posts_permissions(p_post_ids BIGINT[], p_user_id UUID DEFAULT NULL)
    RETURNS TABLE
            (
                po_post_id     BIGINT,
                po_can_update  BOOLEAN,
                po_can_delete  BOOLEAN,
                po_can_reply   BOOLEAN
            )
AS
$$
BEGIN
    RETURN QUERY
        WITH requested_posts AS (
            SELECT DISTINCT unnest(p_post_ids) AS post_id
        )
        SELECT rp.post_id,
               p.id IS NOT NULL
                   AND p_user_id IS NOT NULL
                   AND up.user_id = p_user_id
                   AND p.created_at >= now() - interval '24 hours',
               p.id IS NOT NULL AND p_user_id IS NOT NULL AND up.user_id = p_user_id,
               p.id IS NOT NULL AND nlevel(p.path) < 50
        FROM requested_posts rp
                 LEFT JOIN main.posts p
                           ON p.id = rp.post_id
                          AND p.deleted_at IS NULL
                 LEFT JOIN main.user_posts up
                           ON up.post_id = p.id
                          AND p_user_id IS NOT NULL
                          AND up.user_id = p_user_id
        ORDER BY rp.post_id;
END;
$$ language plpgsql;
