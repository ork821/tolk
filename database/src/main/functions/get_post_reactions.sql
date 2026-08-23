CREATE OR REPLACE FUNCTION main.get_post_reactions(p_post_id BIGINT, p_user_id UUID DEFAULT NULL)
    RETURNS TABLE
            (
                po_reaction_name TEXT,
                po_count         BIGINT,
                po_is_selected   BOOLEAN
            )
AS
$$
BEGIN
    RETURN QUERY
        SELECT reactions.po_reaction_name,
               reactions.po_count,
               reactions.po_is_selected
        FROM main.get_posts_reactions(ARRAY[p_post_id], p_user_id) reactions
        WHERE reactions.po_post_id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, main, users, groups, public;
