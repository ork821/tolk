BEGIN;

DO $$
DECLARE
    v_user_id UUID := uuidv7();
    v_not_null_columns INTEGER;
    v_validated_constraints INTEGER;
BEGIN
    IF EXISTS (
        SELECT 1
        FROM users.user_subscribe
        WHERE from_user_id = '00000000-0000-0000-0000-000000000001'
          AND to_user_id = '00000000-0000-0000-0000-000000000001'
    ) THEN
        RAISE EXCEPTION 'V3 did not remove an existing self-subscription';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM users.profile_info
        WHERE user_id = '00000000-0000-0000-0000-000000000001'
          AND (
              user_subscribes_count <> 0
              OR group_subscribes_count <> 0
              OR subscribers_count <> 0
              OR karma <> 0
          )
    ) THEN
        RAISE EXCEPTION 'V3 did not normalize existing profile counters';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM groups.group_info
        WHERE group_id = '00000000-0000-0000-0000-000000000002'
          AND subscribers_count <> 0
    ) OR EXISTS (
        SELECT 1 FROM main.post_stats
        WHERE post_id = 3001 AND (comments_count <> 0 OR replies_count <> 0)
    ) OR EXISTS (
        SELECT 1 FROM main.post_reaction_stats
        WHERE post_id = 3001 AND count <> 0
    ) OR EXISTS (
        SELECT 1 FROM main.comments
        WHERE id = 4001 AND visible_replies_count <> 0
    ) OR EXISTS (
        SELECT 1 FROM main.comment_reaction_stats
        WHERE comment_id = 4001 AND count <> 0
    ) THEN
        RAISE EXCEPTION 'V3 did not normalize existing aggregate counters';
    END IF;

    INSERT INTO users.users (id, username, display_name)
    VALUES (v_user_id, 'invariant_test', 'Invariant Test');

    BEGIN
        INSERT INTO users.user_subscribe (from_user_id, to_user_id)
        VALUES (v_user_id, v_user_id);
        RAISE EXCEPTION 'self-subscription was accepted';
    EXCEPTION
        WHEN check_violation THEN
            NULL;
    END;

    BEGIN
        INSERT INTO users.profile_info (user_id, karma)
        VALUES (v_user_id, -1);
        RAISE EXCEPTION 'negative counter was accepted';
    EXCEPTION
        WHEN check_violation THEN
            NULL;
    END;

    BEGIN
        INSERT INTO users.profile_info (user_id, karma)
        VALUES (v_user_id, NULL);
        RAISE EXCEPTION 'NULL counter was accepted';
    EXCEPTION
        WHEN not_null_violation THEN
            NULL;
    END;

    SELECT count(*)
    INTO v_not_null_columns
    FROM pg_attribute attribute
    JOIN pg_class relation ON relation.oid = attribute.attrelid
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    WHERE attribute.attnum > 0
      AND NOT attribute.attisdropped
      AND attribute.attnotnull
      AND (namespace.nspname, relation.relname, attribute.attname) IN (
          ('users', 'profile_info', 'user_subscribes_count'),
          ('users', 'profile_info', 'group_subscribes_count'),
          ('users', 'profile_info', 'subscribers_count'),
          ('users', 'profile_info', 'karma'),
          ('groups', 'group_info', 'subscribers_count'),
          ('main', 'post_stats', 'comments_count'),
          ('main', 'post_stats', 'replies_count'),
          ('main', 'post_reaction_stats', 'count'),
          ('main', 'comments', 'visible_replies_count'),
          ('main', 'comment_reaction_stats', 'count')
      );

    IF v_not_null_columns <> 10 THEN
        RAISE EXCEPTION 'expected 10 protected NOT NULL counters, found %', v_not_null_columns;
    END IF;

    SELECT count(*)
    INTO v_validated_constraints
    FROM pg_constraint
    WHERE convalidated
      AND conname IN (
          'chk_user_subscribe_not_self',
          'chk_profile_info_user_subscribes_count_nonnegative',
          'chk_profile_info_group_subscribes_count_nonnegative',
          'chk_profile_info_subscribers_count_nonnegative',
          'chk_profile_info_karma_nonnegative',
          'chk_group_info_subscribers_count_nonnegative',
          'chk_post_stats_comments_count_nonnegative',
          'chk_post_stats_replies_count_nonnegative',
          'chk_post_reaction_stats_count_nonnegative',
          'chk_comments_visible_replies_count_nonnegative',
          'chk_comment_reaction_stats_count_nonnegative'
      );

    IF v_validated_constraints <> 11 THEN
        RAISE EXCEPTION 'expected 11 validated invariant constraints, found %', v_validated_constraints;
    END IF;
END
$$;

ROLLBACK;
