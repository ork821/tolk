CREATE OR REPLACE FUNCTION main.get_post(p_post_id BIGINT)
    RETURNS TABLE
            (
                po_id                BIGINT,
                po_title             TEXT,
                po_content_type      INT,
                po_content           TEXT,
                po_parent_post_author_username    TEXT,
                po_parent_post_author_display_name    TEXT,
                po_parent_post_author_deleted_at  TIMESTAMPTZ,
                po_user_username     TEXT,
                po_user_display_name TEXT,
                po_user_avatar_url   TEXT,
                po_user_deleted_at   TIMESTAMPTZ,
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
    RETURN QUERY
        SELECT p.id,
               p.title,
               p.content_type,
               p.content,
               pu.username,
               pu.display_name,
               pu.deleted_at,
               u.username,
               u.display_name,
               ufi.avatar_url,
               u.deleted_at,
               p.comments_enabled,
               COALESCE(ps.comments_count, 0),
               COALESCE(ps.replies_count, 0),
               p.created_at,
               p.updated_at,
               NULL::timestamptz
        FROM main.posts p
                 JOIN main.user_posts up ON up.post_id = p.id
                 JOIN users.users u on u.id = up.user_id
                 LEFT JOIN main.user_posts pup ON pup.post_id = p.parent_post_id
                 LEFT JOIN users.users pu on pu.id = pup.user_id
                 LEFT JOIN users.profile_info ufi ON u.id = ufi.user_id
                 LEFT JOIN main.post_stats ps on p.id = ps.post_id
        WHERE p.id = p_post_id
          AND p.deleted_at IS NULL;
END;
$$ language plpgsql;
