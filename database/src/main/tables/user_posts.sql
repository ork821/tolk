CREATE TABLE IF NOT EXISTS main.user_posts
(
    post_id BIGINT REFERENCES main.posts (id) ON DELETE CASCADE,
    user_id UUID REFERENCES users.users (id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_user_posts_user_post
    ON main.user_posts (user_id, post_id);
