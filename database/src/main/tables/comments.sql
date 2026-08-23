CREATE TABLE IF NOT EXISTS main.comments
(
    id                BIGINT PRIMARY KEY,
    post_id           BIGINT NOT NULL REFERENCES main.posts (id) ON DELETE CASCADE,
    author_id         UUID   NOT NULL REFERENCES users.users (id) ON DELETE CASCADE,
    content_type      INT    NOT NULL,
    content           TEXT   NOT NULL,
    parent_comment_id BIGINT REFERENCES main.comments (id) ON DELETE CASCADE,
    path              ltree, -- Путь для вложенности: 'root_id.child_id'
    visible_replies_count INT NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ,
    deleted_at        TIMESTAMPTZ,
    CONSTRAINT chk_comments_visible_replies_count_nonnegative CHECK (visible_replies_count >= 0)
);
CREATE INDEX IF NOT EXISTS idx_comments_path_gist ON main.comments USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON main.comments (post_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON main.comments (author_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON main.comments (parent_comment_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_post_top_level_keyset
    ON main.comments (post_id, created_at DESC, id DESC)
    WHERE deleted_at IS NULL AND parent_comment_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_comments_parent_keyset
    ON main.comments (parent_comment_id, created_at DESC, id DESC)
    WHERE deleted_at IS NULL OR visible_replies_count > 0;
