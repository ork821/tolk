CREATE OR REPLACE FUNCTION main.add_post_reactions(p_post_id BIGINT, p_user_id UUID, p_reaction_name TEXT)
    RETURNS BOOLEAN AS
$$
DECLARE
    p_reaction_id UUID;
    v_was_active BOOLEAN;
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

    SELECT EXISTS(
        SELECT 1
        FROM main.post_reactions pr
        WHERE pr.post_id = p_post_id
          AND pr.user_id = p_user_id
          AND pr.reaction_id = p_reaction_id
          AND pr.deleted_at IS NULL
    )
    INTO v_was_active;

    INSERT INTO main.post_reactions (post_id, user_id, reaction_id)
    SELECT p.id, p_user_id, p_reaction_id
    FROM main.posts p
    WHERE p.id = p_post_id
      AND p.deleted_at IS NULL
    ON CONFLICT (post_id, user_id, reaction_id) DO UPDATE
        SET deleted_at = NULL,
            updated_at = CASE
                WHEN main.post_reactions.deleted_at IS NULL THEN main.post_reactions.updated_at
                ELSE NOW()
            END;

    IF FOUND AND NOT v_was_active THEN
        INSERT INTO main.post_reaction_stats (post_id, reaction_id, count)
        VALUES (p_post_id, p_reaction_id, 1)
        ON CONFLICT (post_id, reaction_id) DO UPDATE
            SET count = main.post_reaction_stats.count + 1;

    END IF;

    RETURN FOUND OR v_was_active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, main, users, groups, public;
