CREATE OR REPLACE FUNCTION main.add_comment_reactions(p_comment_id BIGINT, p_user_id UUID, p_reaction_name TEXT)
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

    INSERT INTO main.comment_reactions (comment_id, user_id, reaction_id)
    SELECT c.id, p_user_id, p_reaction_id
    FROM main.comments c
    WHERE c.id = p_comment_id
      AND c.deleted_at IS NULL
    ON CONFLICT (comment_id, user_id, reaction_id) DO NOTHING;

    IF FOUND THEN
        INSERT INTO main.comment_reaction_stats as crs (comment_id, reaction_id, count)
        VALUES (p_comment_id, p_reaction_id, 1)
        ON CONFLICT (comment_id, reaction_id) DO UPDATE
            SET count = crs.count + 1;
    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, main, users, groups, public;
