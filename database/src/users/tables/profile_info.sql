CREATE TABLE IF NOT EXISTS users.profile_info
(
    user_id             UUID PRIMARY KEY REFERENCES users.users (id) ON DELETE CASCADE,
    description         TEXT,
    avatar_url          TEXT,
    user_subscribes_count  BIGINT NOT NULL DEFAULT 0,
    group_subscribes_count BIGINT NOT NULL DEFAULT 0,
    subscribers_count     BIGINT NOT NULL DEFAULT 0,
    karma                 BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_profile_info_user_subscribes_count_nonnegative CHECK (user_subscribes_count >= 0),
    CONSTRAINT chk_profile_info_group_subscribes_count_nonnegative CHECK (group_subscribes_count >= 0),
    CONSTRAINT chk_profile_info_subscribers_count_nonnegative CHECK (subscribers_count >= 0),
    CONSTRAINT chk_profile_info_karma_nonnegative CHECK (karma >= 0)
);
