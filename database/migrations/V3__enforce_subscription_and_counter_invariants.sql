DELETE FROM users.user_subscribe
WHERE from_user_id = to_user_id;

UPDATE users.profile_info profile
SET user_subscribes_count = (
        SELECT count(*)
        FROM users.user_subscribe subscription
        WHERE subscription.from_user_id = profile.user_id
          AND subscription.deleted_at IS NULL
    ),
    group_subscribes_count = (
        SELECT count(*)
        FROM users.group_subscribe subscription
        WHERE subscription.from_user_id = profile.user_id
          AND subscription.deleted_at IS NULL
    ),
    subscribers_count = (
        SELECT count(*)
        FROM users.user_subscribe subscription
        WHERE subscription.to_user_id = profile.user_id
          AND subscription.deleted_at IS NULL
    ),
    karma = GREATEST(COALESCE(profile.karma, 0), 0);

UPDATE groups.group_info info
SET subscribers_count = (
    SELECT count(*)
    FROM users.group_subscribe subscription
    WHERE subscription.group_id = info.group_id
      AND subscription.deleted_at IS NULL
);

UPDATE main.post_stats
SET comments_count = GREATEST(COALESCE(comments_count, 0), 0),
    replies_count = GREATEST(COALESCE(replies_count, 0), 0);

UPDATE main.post_reaction_stats
SET count = GREATEST(COALESCE(count, 0), 0);

UPDATE main.comments
SET visible_replies_count = GREATEST(COALESCE(visible_replies_count, 0), 0);

UPDATE main.comment_reaction_stats
SET count = GREATEST(COALESCE(count, 0), 0);

ALTER TABLE users.user_subscribe
    ADD CONSTRAINT chk_user_subscribe_not_self
        CHECK (from_user_id <> to_user_id);

ALTER TABLE users.profile_info
    ALTER COLUMN user_subscribes_count SET NOT NULL,
    ALTER COLUMN group_subscribes_count SET NOT NULL,
    ALTER COLUMN subscribers_count SET NOT NULL,
    ALTER COLUMN karma SET NOT NULL,
    ADD CONSTRAINT chk_profile_info_user_subscribes_count_nonnegative
        CHECK (user_subscribes_count >= 0),
    ADD CONSTRAINT chk_profile_info_group_subscribes_count_nonnegative
        CHECK (group_subscribes_count >= 0),
    ADD CONSTRAINT chk_profile_info_subscribers_count_nonnegative
        CHECK (subscribers_count >= 0),
    ADD CONSTRAINT chk_profile_info_karma_nonnegative
        CHECK (karma >= 0);

ALTER TABLE groups.group_info
    ALTER COLUMN subscribers_count SET NOT NULL,
    ADD CONSTRAINT chk_group_info_subscribers_count_nonnegative
        CHECK (subscribers_count >= 0);

ALTER TABLE main.post_stats
    ALTER COLUMN comments_count SET NOT NULL,
    ALTER COLUMN replies_count SET NOT NULL,
    ADD CONSTRAINT chk_post_stats_comments_count_nonnegative
        CHECK (comments_count >= 0),
    ADD CONSTRAINT chk_post_stats_replies_count_nonnegative
        CHECK (replies_count >= 0);

ALTER TABLE main.post_reaction_stats
    ALTER COLUMN count SET NOT NULL,
    ADD CONSTRAINT chk_post_reaction_stats_count_nonnegative
        CHECK (count >= 0);

ALTER TABLE main.comments
    ALTER COLUMN visible_replies_count SET NOT NULL,
    ADD CONSTRAINT chk_comments_visible_replies_count_nonnegative
        CHECK (visible_replies_count >= 0);

ALTER TABLE main.comment_reaction_stats
    ALTER COLUMN count SET NOT NULL,
    ADD CONSTRAINT chk_comment_reaction_stats_count_nonnegative
        CHECK (count >= 0);
