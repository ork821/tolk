BEGIN;

DO $$
DECLARE
    v_user_id UUID := uuidv7();
BEGIN
    INSERT INTO users.users (id, username, display_name)
    VALUES (v_user_id, 'deleted_parent_test', 'Deleted Parent Test');

    PERFORM main.create_post(1001, v_user_id, NULL, 0, 'root post');
    UPDATE main.posts SET deleted_at = NOW() WHERE id = 1001;

    BEGIN
        PERFORM main.create_post(1002, v_user_id, 1001, 0, 'reply to deleted post');
        RAISE EXCEPTION 'create_post accepted a deleted parent';
    EXCEPTION
        WHEN SQLSTATE '22023' THEN
            NULL;
    END;
END
$$;

ROLLBACK;
