CREATE OR REPLACE FUNCTION main.get_comment_reactions(p_comment_id BIGINT)
    RETURNS TABLE
            (
                po_reaction_name TEXT,
                po_count         BIGINT
            )
AS
$$
BEGIN
    RETURN QUERY SELECT rt.name,
                        COALESCE(crs.count, 0)
                 FROM main.reaction_types rt
                          LEFT JOIN main.comment_reaction_stats crs
                                    ON rt.id = crs.reaction_id AND crs.comment_id = p_comment_id
                 WHERE rt.is_active IS TRUE
                   AND rt.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, main, users, groups, public;
