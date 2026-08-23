CREATE OR REPLACE FUNCTION main.get_group_posts(p_alias TEXT,
                                                p_limit INT DEFAULT 10,
                                                p_last_created_at TIMESTAMPTZ DEFAULT NULL,
                                                p_last_id BIGINT DEFAULT NULL)
    RETURNS TABLE
            (
                po_id                BIGINT,
                po_title             TEXT,
                po_content_type      INT,
                po_content           TEXT,
                po_parent_post_id    BIGINT,
                po_user_username     TEXT,
                po_user_display_name TEXT,
                po_user_avatar_url   TEXT,
                po_comments_enabled  BOOLEAN,
                po_comments_count    BIGINT,
                po_replies_count     BIGINT,
                po_created_at        timestamptz,
                po_updated_at        timestamptz,
                po_deleted_at        timestamptz
            )
AS
$$
BEGIN
    RETURN QUERY SELECT p.id,
                        p.title,
                        p.content_type,
                        p.content,
                        p.parent_post_id,
                        u.username,
                        u.display_name,
                        ufi.avatar_url,
                        p.comments_enabled,
                        COALESCE(ps.comments_count, 0),
                        COALESCE(ps.replies_count, 0),
                        p.created_at,
                        p.updated_at,
                        NULL::timestamptz
                 FROM main.posts p
                          INNER JOIN main.group_posts gp ON p.id = gp.post_id
                          INNER JOIN groups.groups g ON g.id = gp.group_id
                          JOIN main.user_posts up ON up.post_id = p.id
                          JOIN users.users u on u.id = up.user_id
                          LEFT JOIN users.profile_info ufi ON u.id = ufi.user_id
                          LEFT JOIN main.post_stats ps on p.id = ps.post_id
                 WHERE g.alias = p_alias
                   AND g.deleted_at IS NULL
                   AND p.deleted_at IS NULL
                   AND (
                     p_last_created_at IS NULL
                         OR p_last_id IS NULL
                         OR (p.created_at, p.id) < (p_last_created_at, p_last_id)
                     )
                 -- Обязательно сортируем по двум полям, чтобы поддержать кортежное сравнение!
                 ORDER BY p.created_at DESC, p.id DESC
                 LIMIT p_limit;
END;
$$ language plpgsql;
