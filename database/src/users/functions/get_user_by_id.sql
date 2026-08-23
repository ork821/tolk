CREATE OR REPLACE FUNCTION users.get_user_by_id(p_user_id UUID)
    RETURNS TABLE
            (
                po_user_id              UUID,
                po_username             TEXT,
                po_display_name         TEXT,
                po_email                TEXT,
                po_description          TEXT,
                po_avatar_url           TEXT,
                po_karma                BIGINT,
                po_subscribers_count      BIGINT,
                po_user_subscribes_count   BIGINT,
                po_group_subscribes_count BIGINT,
                po_is_subscribed        BOOLEAN,
                po_is_me                BOOLEAN
            )
AS
$$
BEGIN
    RETURN QUERY SELECT u.id                              as po_user_id,
                        u.username                        as po_username,
                        u.display_name                    as po_display_name,
                        u.email                           as po_email,
                        ufi.description                   as po_description,
                        ufi.avatar_url                    as po_avatar_url,
                        COALESCE(ufi.karma, 0)            as po_karma,
                        COALESCE(ufi.subscribers_count, 0)     as po_subscribers_count,
                        COALESCE(ufi.user_subscribes_count, 0)  as po_user_subscribes_count,
                        COALESCE(ufi.group_subscribes_count, 0) as po_group_subscribes_count,
                        FALSE as po_is_subscribed,
                        TRUE as po_is_me
                 FROM users.users u
                          LEFT JOIN users.profile_info as ufi
                                    ON u.id = ufi.user_id
                 WHERE u.id = p_user_id
                   AND u.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;
