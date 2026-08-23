CREATE TABLE IF NOT EXISTS main.post_attachments
(
    id         UUID PRIMARY KEY DEFAULT uuidv7(),
    post_id    BIGINT NOT NULL REFERENCES main.posts (id) ON DELETE CASCADE,
    type       TEXT   NOT NULL,            -- 'image/jpeg', 'video/mp4'
    url        TEXT   NOT NULL,
    position   INT              DEFAULT 0, -- Для сохранения порядка
    created_at TIMESTAMPTZ      DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_post_attachments_post_id ON main.post_attachments (post_id) WHERE deleted_at IS NULL;
