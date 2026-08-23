CREATE OR REPLACE FUNCTION main.get_active_reactions()
    RETURNS TABLE
            (
                po_reaction_name TEXT,
                po_weight        DOUBLE PRECISION,
                po_icon          TEXT
            )
AS
$$
BEGIN
    RETURN QUERY SELECT rt.name,
                        rt.weight::DOUBLE PRECISION,
                        rt.icon
                 FROM main.reaction_types rt
                 WHERE rt.is_active IS TRUE
                   AND rt.deleted_at IS NULL
                 ORDER BY rt.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, main, users, groups, public;
