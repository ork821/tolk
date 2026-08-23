CREATE OR REPLACE FUNCTION main.get_posts_reactions(p_post_ids BIGINT[], p_user_id UUID DEFAULT NULL)
    RETURNS TABLE
            (
                po_post_id       BIGINT,
                po_reaction_name TEXT,
                po_count         BIGINT,
                po_is_selected   BOOLEAN
            )
AS
$$
BEGIN
    RETURN QUERY
        WITH requested_posts AS (
            SELECT DISTINCT unnest(p_post_ids) AS post_id
        )
        SELECT rp.post_id,
               rt.name,
               COALESCE(prs.count, 0),
               pr.user_id IS NOT NULL
        FROM requested_posts rp
                 CROSS JOIN main.reaction_types rt
                 LEFT JOIN main.post_reaction_stats prs
                           ON rt.id = prs.reaction_id AND prs.post_id = rp.post_id
                 LEFT JOIN main.post_reactions pr
                           ON p_user_id IS NOT NULL
                               AND rt.id = pr.reaction_id
                               AND pr.post_id = rp.post_id
                               AND pr.user_id = p_user_id
                               AND pr.deleted_at IS NULL
        WHERE rt.is_active IS TRUE
          AND rt.deleted_at IS NULL
        ORDER BY rp.post_id, rt.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, main, users, groups, public;
