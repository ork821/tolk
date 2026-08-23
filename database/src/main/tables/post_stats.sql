CREATE TABLE IF NOT EXISTS main.post_stats
(
    post_id        BIGINT PRIMARY KEY REFERENCES main.posts (id) ON DELETE CASCADE,
    comments_count BIGINT NOT NULL DEFAULT 0,
    replies_count BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_post_stats_comments_count_nonnegative CHECK (comments_count >= 0),
    CONSTRAINT chk_post_stats_replies_count_nonnegative CHECK (replies_count >= 0)
);
