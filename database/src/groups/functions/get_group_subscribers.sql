CREATE OR REPLACE FUNCTION groups.get_group_subscribers(p_alias TEXT)
    RETURNS TABLE
            (
                po_username TEXT
            )
AS
$$
BEGIN
    RETURN QUERY SELECT u.username
                 FROM groups.groups g
                          JOIN users.group_subscribe uf on g.id = uf.group_id
                          JOIN users.users u ON u.id = uf.from_user_id
                 WHERE g.alias = p_alias
                 ORDER BY uf.created_at DESC;
END;
$$ language plpgsql;
