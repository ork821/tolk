CREATE OR REPLACE FUNCTION main.delete_post_reactions(p_post_id BIGINT, p_user_id UUID, p_reaction_name TEXT)
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

    UPDATE main.post_reactions pr
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE pr.post_id = p_post_id
      AND pr.user_id = p_user_id
      AND pr.reaction_id = p_reaction_id
      AND pr.deleted_at IS NULL;
    IF FOUND THEN
        INSERT INTO main.post_reaction_stats (post_id, reaction_id, count)
        VALUES (p_post_id, p_reaction_id, 0)
        ON CONFLICT (post_id, reaction_id) DO UPDATE
            SET count = GREATEST(main.post_reaction_stats.count - 1, 0);

    END IF;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, main, users, groups, public;
