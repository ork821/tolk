CREATE TABLE IF NOT EXISTS main.reaction_types
(
    id         UUID PRIMARY KEY     DEFAULT uuidv7(),
    name       TEXT UNIQUE NOT NULL,              -- 'upvote', 'downvote', 'heart', 'fire', etc.
    weight     FLOAT       NOT NULL DEFAULT 0,    -- Влияние реакции на рейтинг (score) поста/комментария
    icon       TEXT,                              -- Опционально: ссылка на графику эмодзи/иконки
    is_active  BOOLEAN              DEFAULT TRUE, -- Возможность отключать устаревшие реакции

    created_at TIMESTAMPTZ          DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);
