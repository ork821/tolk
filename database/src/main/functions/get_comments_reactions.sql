CREATE OR REPLACE FUNCTION main.get_comments_reactions(p_comment_ids BIGINT[], p_user_id UUID DEFAULT NULL)
    RETURNS TABLE
            (
                po_comment_id    BIGINT,
                po_reaction_name TEXT,
                po_count         BIGINT,
                po_is_selected   BOOLEAN
            )
AS
$$
BEGIN
    RETURN QUERY
        WITH requested_comments AS (
            SELECT DISTINCT unnest(p_comment_ids) AS comment_id
        )
        SELECT rc.comment_id,
               rt.name,
               COALESCE(crs.count, 0),
               cr.user_id IS NOT NULL
        FROM requested_comments rc
                 CROSS JOIN main.reaction_types rt
                 LEFT JOIN main.comment_reaction_stats crs
                           ON rt.id = crs.reaction_id AND crs.comment_id = rc.comment_id
                 LEFT JOIN main.comment_reactions cr
                           ON p_user_id IS NOT NULL
                               AND rt.id = cr.reaction_id
                               AND cr.comment_id = rc.comment_id
                               AND cr.user_id = p_user_id
                               AND cr.deleted_at IS NULL
        WHERE rt.is_active IS TRUE
          AND rt.deleted_at IS NULL
        ORDER BY rc.comment_id, rt.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, main, users, groups, public;
