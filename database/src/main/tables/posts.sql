CREATE TABLE IF NOT EXISTS main.posts
(
    id               BIGINT PRIMARY KEY,
    -- Поля для поддержки древовидных тредов
    parent_post_id   BIGINT REFERENCES main.posts (id) ON DELETE CASCADE, -- Для рекурсии "снизу вверх" и иерархии
    path             ltree,                                               -- Для быстрой выгрузки всего дерева целиком

    title            TEXT,
    content_type     INT  NOT NULL,
    content          TEXT NOT NULL,

    comments_enabled BOOLEAN     DEFAULT TRUE,

    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ,
    deleted_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_posts_path_gist ON main.posts USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_parent_post_id ON main.posts (parent_post_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_posts_keyset
    ON main.posts (created_at DESC, id DESC)
    WHERE deleted_at IS NULL;
