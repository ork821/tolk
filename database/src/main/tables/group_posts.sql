CREATE TABLE IF NOT EXISTS main.group_posts
(
    post_id  BIGINT REFERENCES main.posts (id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups.groups (id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, group_id)
);
CREATE INDEX IF NOT EXISTS idx_group_posts_feed
    ON main.group_posts (group_id, post_id);
