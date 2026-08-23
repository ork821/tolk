CREATE OR REPLACE FUNCTION main.delete_comment_reactions(p_comment_id BIGINT, p_user_id UUID, p_reaction_name TEXT)
    RETURNS BOOLEAN AS
$$
DECLARE
    p_reaction_id UUID;
BEGIN
    SELECT id
    FROM main.reaction_types
    WHERE name = p_reaction_name
      AND is_active IS TRUE
      AND deleted_at IS NULL
    INTO p_reaction_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Unknown reaction name';
    END IF;
    DELETE
    FROM main.comment_reactions cr
    WHERE cr.comment_id = p_comment_id
      AND cr.user_id = p_user_id
      AND cr.reaction_id = p_reaction_id;
    IF FOUND THEN
        INSERT INTO main.comment_reaction_stats as crs (comment_id, reaction_id, count)
        VALUES (p_comment_id, p_reaction_id, 0)
        ON CONFLICT (comment_id, reaction_id) DO UPDATE
            SET count = GREATEST(crs.count - 1, 0);
    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, main, users, groups, public;
