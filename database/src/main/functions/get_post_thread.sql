CREATE OR REPLACE FUNCTION main.get_post_thread(p_post_id BIGINT)
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
DECLARE
    v_target_path ltree;
BEGIN
    -- 1. Узнаем path нашего поста
    SELECT p.path
    INTO v_target_path
    FROM main.posts p
    WHERE p.id = p_post_id;

    -- Если пост удален или не существует, сразу выходим (возвращаем пустоту)
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- 2. Одним запросом достаем всех предков и сам пост!
    RETURN QUERY
        SELECT p.id,
               CASE WHEN p.deleted_at IS NULL THEN p.title ELSE '' END,
               CASE WHEN p.deleted_at IS NULL THEN p.content_type ELSE 0 END,
               CASE WHEN p.deleted_at IS NULL THEN p.content ELSE '' END,
               NULL,
               NULL,
               NULL::timestamptz,
               CASE WHEN p.deleted_at IS NULL THEN u.username ELSE '' END,
               CASE WHEN p.deleted_at IS NULL THEN u.display_name ELSE '' END,
               CASE WHEN p.deleted_at IS NULL THEN ufi.avatar_url ELSE NULL END,
               u.deleted_at,
               p.deleted_at IS NULL AND p.comments_enabled,
               CASE WHEN p.deleted_at IS NULL THEN COALESCE(ps.comments_count, 0) ELSE 0 END,
               CASE WHEN p.deleted_at IS NULL THEN COALESCE(ps.replies_count, 0) ELSE 0 END,
               p.created_at,
               p.updated_at,
               p.deleted_at
        FROM main.posts p
                 JOIN main.user_posts up ON up.post_id = p.id
                 JOIN users.users u on u.id = up.user_id
                 LEFT JOIN users.profile_info ufi ON u.id = ufi.user_id
                 LEFT JOIN main.post_stats ps on p.id = ps.post_id
        WHERE p.path @> v_target_path -- Магия ltree: достаем предков и сам узел
        ORDER BY p.path;
END;
$$ language plpgsql;
