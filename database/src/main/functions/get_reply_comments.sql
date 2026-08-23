CREATE OR REPLACE FUNCTION main.get_reply_comments(
    p_parent_comment_id BIGINT,
    p_limit INT DEFAULT 20,
    p_last_created_at TIMESTAMPTZ DEFAULT NULL,
    p_last_id BIGINT DEFAULT NULL
)
    RETURNS TABLE
            (
                po_id                  BIGINT,
                po_author_username     TEXT,
                po_author_display_name TEXT,
                po_author_avatar_url   TEXT,
                po_author_deleted_at   TIMESTAMPTZ,
                po_content_type        INT,
                po_content             TEXT,
                po_visible_replies_count INT,
                po_created_at          TIMESTAMPTZ,
                po_updated_at          TIMESTAMPTZ,
                po_deleted_at          TIMESTAMPTZ
            )
AS
$$
BEGIN

    RETURN QUERY
        SELECT c.id,
               CASE WHEN c.deleted_at IS NULL THEN COALESCE(u.username, '') ELSE '' END,
               CASE WHEN c.deleted_at IS NULL THEN COALESCE(u.display_name, '') ELSE '' END,
               CASE WHEN c.deleted_at IS NULL THEN ufi.avatar_url ELSE NULL END,
               u.deleted_at,
               CASE WHEN c.deleted_at IS NULL THEN c.content_type ELSE 0 END,
               CASE WHEN c.deleted_at IS NULL THEN c.content ELSE '' END,
               c.visible_replies_count,
               c.created_at,
               c.updated_at,
               c.deleted_at
        FROM main.comments c
                 LEFT JOIN users.users u ON u.id = c.author_id
                 LEFT JOIN users.profile_info ufi ON u.id = ufi.user_id
        WHERE c.parent_comment_id = p_parent_comment_id
          AND (c.deleted_at IS NULL OR c.visible_replies_count > 0)
          AND (
            p_last_created_at IS NULL
                OR p_last_id IS NULL
                OR (c.created_at, c.id) < (p_last_created_at, p_last_id)
            )
        ORDER BY c.created_at DESC, c.id DESC
        LIMIT p_limit;

END;
$$ LANGUAGE plpgsql;
