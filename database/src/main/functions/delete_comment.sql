CREATE OR REPLACE FUNCTION main.delete_comment(p_comment_id BIGINT,
                                               p_user_id UUID)
    RETURNS BOOLEAN
AS
$$
DECLARE
    v_parent_comment_id BIGINT;
    v_post_id           BIGINT;
    v_deleted           BOOLEAN;
    v_has_visible_descendants BOOLEAN;
    v_current_parent_id BIGINT;
    v_next_parent_id BIGINT;
    v_parent_deleted_at TIMESTAMPTZ;
    v_parent_visible_replies_count INT;
BEGIN

    SELECT EXISTS (
        SELECT 1
        FROM main.comments descendant
                 JOIN main.comments target ON descendant.path <@ target.path
        WHERE target.id = p_comment_id
          AND descendant.id <> target.id
          AND descendant.deleted_at IS NULL
    )
    INTO v_has_visible_descendants;

    UPDATE main.comments
    SET deleted_at = NOW()
    WHERE id = p_comment_id
      AND author_id = p_user_id
      AND deleted_at IS NULL
    RETURNING parent_comment_id, post_id
        INTO v_parent_comment_id, v_post_id;

    v_deleted := FOUND;

    IF NOT v_deleted THEN
        RETURN FALSE;
    END IF;

    IF v_has_visible_descendants THEN
        RETURN TRUE;
    END IF;

    IF v_parent_comment_id IS NULL THEN
        UPDATE main.post_stats
        SET comments_count = GREATEST(comments_count - 1, 0)
        WHERE post_id = v_post_id;
    ELSE
        v_current_parent_id := v_parent_comment_id;

        LOOP
            UPDATE main.comments
            SET visible_replies_count = GREATEST(visible_replies_count - 1, 0)
            WHERE id = v_current_parent_id
            RETURNING parent_comment_id, deleted_at, visible_replies_count
                INTO v_next_parent_id, v_parent_deleted_at, v_parent_visible_replies_count;

            EXIT WHEN NOT FOUND;
            EXIT WHEN v_parent_deleted_at IS NULL OR v_parent_visible_replies_count > 0;

            IF v_next_parent_id IS NULL THEN
                UPDATE main.post_stats
                SET comments_count = GREATEST(comments_count - 1, 0)
                WHERE post_id = v_post_id;
                EXIT;
            END IF;

            v_current_parent_id := v_next_parent_id;
        END LOOP;
    END IF;

    RETURN TRUE;
END;

$$ language plpgsql;
