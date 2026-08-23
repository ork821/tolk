CREATE OR REPLACE FUNCTION users.get_user_group_subscribes(
    p_username TEXT,
    p_limit INT DEFAULT 20,
    p_last_created_at TIMESTAMPTZ DEFAULT NULL,
    p_last_alias TEXT DEFAULT NULL
)
    RETURNS TABLE
            (
                po_alias TEXT,
                po_created_at TIMESTAMPTZ
            )
AS
$$
BEGIN
    RETURN QUERY SELECT g.alias,
                        gf.created_at
                 FROM users.users tu
                          JOIN users.group_subscribe gf on tu.id = gf.from_user_id
                          JOIN groups.groups g ON g.id = gf.group_id
                 WHERE tu.username = p_username
                   AND tu.deleted_at IS NULL
                   AND g.deleted_at IS NULL
                   AND gf.deleted_at IS NULL
                   AND (
                     p_last_created_at IS NULL
                         OR gf.created_at < p_last_created_at
                         OR (gf.created_at = p_last_created_at AND g.alias > p_last_alias)
                     )
                 ORDER BY gf.created_at DESC, g.alias ASC
                 LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
