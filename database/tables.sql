CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE SCHEMA IF NOT EXISTS main;
CREATE SCHEMA IF NOT EXISTS users;
CREATE SCHEMA IF NOT EXISTS groups;

-- Пользователи
CREATE TABLE IF NOT EXISTS users.users
(
    id           UUID PRIMARY KEY DEFAULT uuidv7(),
    username     TEXT        NOT NULL,
    display_name TEXT        NOT NULL,
    email        TEXT,
    created_at   TIMESTAMPTZ      DEFAULT NOW(),
    updated_at   TIMESTAMPTZ,
    deleted_at   TIMESTAMPTZ
);

CREATE UNIQUE INDEX idx_users_username_active ON users.users (username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_username_prefix_active ON users.users (username text_pattern_ops) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_users_email_active ON users.users (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_display_name_trgm_active ON users.users USING gin (display_name gin_trgm_ops) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS users.profile_info
(
    user_id             UUID PRIMARY KEY REFERENCES users.users (id) ON DELETE CASCADE,
    description         TEXT,
    avatar_url          TEXT,
    user_subscribes_count  BIGINT DEFAULT 0,
    group_subscribes_count BIGINT DEFAULT 0,
    subscribers_count     BIGINT DEFAULT 0,
    karma               BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users.auth_sessions
(
    id              UUID PRIMARY KEY DEFAULT uuidv7(),
    user_id         UUID        NOT NULL REFERENCES users.users (id) ON DELETE CASCADE,
    user_agent      TEXT,
    last_ip_address INET,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at    TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ,
    revoked_reason  TEXT
);

CREATE INDEX idx_auth_sessions_user_id_active
    ON users.auth_sessions (user_id, last_used_at DESC)
    WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS users.auth_session_tokens
(
    -- id сессии
    id         UUID PRIMARY KEY DEFAULT uuidv7(),
    session_id UUID        NOT NULL REFERENCES users.auth_sessions (id) ON DELETE CASCADE,

    -- HMAC-SHA256 hash of the refresh token. The raw token is only stored in the user's HttpOnly cookie.
    token_hash     TEXT UNIQUE NOT NULL,
    replaced_by_id UUID REFERENCES users.auth_session_tokens (id),

    -- Метаданные для безопасности и вкладки "Активные сеансы"
    ip_address INET, -- Специальный тип данных в Postgres для IP-адресов

    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    -- Мы используем мягкое удаление (или отзыв) токена
    revoked_at TIMESTAMPTZ
);

-- Индекс для супер-быстрого поиска токена при обновлении (когда бекенд проверяет рефреш)
CREATE INDEX idx_auth_session_tokens_token_hash_active
    ON users.auth_session_tokens (token_hash)
    WHERE revoked_at IS NULL;
-- Индекс для получения списка всех активных сеансов пользователя
CREATE INDEX idx_auth_session_tokens_session_id_active
    ON users.auth_session_tokens (session_id)
    WHERE revoked_at IS NULL;

-- OAuth
-- Справочник провайдеров (чтобы легко добавлять новые и отключать старые)
CREATE TABLE IF NOT EXISTS users.auth_providers
(
    id         UUID PRIMARY KEY DEFAULT uuidv7(),
    name       TEXT UNIQUE NOT NULL,          -- 'google', 'apple', 'github', 'telegram'
    is_active  BOOLEAN          DEFAULT TRUE, -- Возможность выключить логин через провайдера
    created_at TIMESTAMPTZ      DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

-- Таблица связей внешних аккаунтов с нашими пользователями
CREATE TABLE IF NOT EXISTS users.user_auth_providers
(
    user_id     UUID NOT NULL REFERENCES users.users (id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES users.auth_providers (id) ON DELETE CASCADE,

    -- Уникальный ID пользователя на стороне провайдера (например, длинный номер из Google)
    external_id TEXT NOT NULL,

    -- Почта, которую нам отдал провайдер (может отличаться от основной почты профиля)
    email       TEXT,

    created_at  TIMESTAMPTZ DEFAULT NOW(),

    -- Один внешний аккаунт (например конкретный Google ID) может быть привязан только один раз!
    PRIMARY KEY (provider_id, external_id)
);

-- Один пользователь может привязать только ОДИН аккаунт конкретного провайдера (один Google, один Apple)
CREATE UNIQUE INDEX idx_user_auth_providers_user_provider
    ON users.user_auth_providers (user_id, provider_id);


-- Подписки
CREATE TABLE IF NOT EXISTS users.user_subscribe
(
    from_user_id UUID REFERENCES users.users (id) ON DELETE CASCADE, -- Кто подписывается
    to_user_id   UUID REFERENCES users.users (id) ON DELETE CASCADE, -- на кого подписывается
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ,
    deleted_at   TIMESTAMPTZ,
    PRIMARY KEY (from_user_id, to_user_id)
);
CREATE INDEX IF NOT EXISTS idx_user_subscribe_to_user ON users.user_subscribe (to_user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscribe_from_date ON users.user_subscribe (from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_subscribe_to_date ON users.user_subscribe (to_user_id, created_at DESC);

---------


-- ГРУППЫ
CREATE TABLE IF NOT EXISTS groups.groups
(
    id           UUID PRIMARY KEY DEFAULT uuidv7(),
    alias        TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description  TEXT,

    created_at   TIMESTAMPTZ      DEFAULT NOW(),
    updated_at   TIMESTAMPTZ,
    deleted_at   TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_groups_alias_active ON groups.groups (alias) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_groups_display_name_active ON groups.groups (display_name) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS groups.group_info
(
    group_id        UUID PRIMARY KEY REFERENCES groups.groups (id) ON DELETE CASCADE,
    subscribers_count INT         DEFAULT 0,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS groups.groups_roles
(
    id         UUID PRIMARY KEY DEFAULT uuidv7(),
    name       TEXT NOT NULL UNIQUE,
    can_create BOOLEAN          DEFAULT FALSE,
    can_update BOOLEAN          DEFAULT FALSE,
    can_delete BOOLEAN          DEFAULT FALSE,

    created_at TIMESTAMPTZ      DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);



CREATE TABLE IF NOT EXISTS groups.group_user_roles
(
    group_id   UUID NOT NULL REFERENCES groups.groups (id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users.users (id) ON DELETE CASCADE,
    role_id    UUID NOT NULL REFERENCES groups.groups_roles (id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,

    PRIMARY KEY (group_id, user_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_group_user_roles_user ON groups.group_user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_group_user_roles_role ON groups.group_user_roles (role_id);

CREATE TABLE IF NOT EXISTS users.group_subscribe
(
    from_user_id UUID REFERENCES users.users (id) ON DELETE CASCADE, -- кто подписывается
    group_id     UUID REFERENCES groups.groups (id) ON DELETE CASCADE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ,
    deleted_at   TIMESTAMPTZ,
    PRIMARY KEY (from_user_id, group_id)
);
CREATE INDEX IF NOT EXISTS idx_group_subscribe_group ON users.group_subscribe (group_id);
CREATE INDEX IF NOT EXISTS idx_group_subscribe_from_date ON users.group_subscribe (from_user_id, created_at DESC);

-- Посты
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

CREATE TABLE IF NOT EXISTS main.post_stats
(
    post_id        BIGINT PRIMARY KEY REFERENCES main.posts (id) ON DELETE CASCADE,
    comments_count BIGINT DEFAULT 0,
    replies_count BIGINT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS main.group_posts
(
    post_id  BIGINT REFERENCES main.posts (id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups.groups (id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, group_id)
);
CREATE INDEX IF NOT EXISTS idx_group_posts_feed
    ON main.group_posts (group_id, post_id);

CREATE TABLE IF NOT EXISTS main.user_posts
(
    post_id BIGINT REFERENCES main.posts (id) ON DELETE CASCADE,
    user_id UUID REFERENCES users.users (id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_user_posts_user_post
    ON main.user_posts (user_id, post_id);



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


CREATE TABLE IF NOT EXISTS main.post_reactions
(
    post_id     BIGINT REFERENCES main.posts (id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users.users (id) ON DELETE CASCADE,
    reaction_id UUID REFERENCES main.reaction_types (id) ON DELETE CASCADE,

    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ,
    PRIMARY KEY (post_id, user_id, reaction_id)
);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON main.post_reactions (user_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_active_post
    ON main.post_reactions (user_id, post_id)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_post_reactions_reaction_id ON main.post_reactions (reaction_id);

CREATE TABLE IF NOT EXISTS main.post_reaction_stats
(
    post_id     BIGINT REFERENCES main.posts (id) ON DELETE CASCADE,
    reaction_id UUID REFERENCES main.reaction_types (id) ON DELETE CASCADE,
    count       BIGINT DEFAULT 0,
    PRIMARY KEY (post_id, reaction_id)
);
CREATE INDEX IF NOT EXISTS idx_post_reaction_stats_reaction_id
    ON main.post_reaction_stats (reaction_id);


-- Комментарии
CREATE TABLE IF NOT EXISTS main.comments
(
    id                BIGINT PRIMARY KEY,
    post_id           BIGINT NOT NULL REFERENCES main.posts (id) ON DELETE CASCADE,
    author_id         UUID   NOT NULL REFERENCES users.users (id) ON DELETE CASCADE,
    content_type      INT    NOT NULL,
    content           TEXT   NOT NULL,
    parent_comment_id BIGINT REFERENCES main.comments (id) ON DELETE CASCADE,
    path              ltree, -- Путь для вложенности: 'root_id.child_id'
    visible_replies_count INT DEFAULT 0,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ,
    deleted_at        TIMESTAMPTZ
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


-- Реакции на комментарии
CREATE TABLE IF NOT EXISTS main.comment_reactions
(
    comment_id  BIGINT REFERENCES main.comments (id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users.users (id) ON DELETE CASCADE,
    reaction_id UUID REFERENCES main.reaction_types (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ,
    PRIMARY KEY (comment_id, user_id, reaction_id)
);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON main.comment_reactions (comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON main.comment_reactions (user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_reaction_id ON main.comment_reactions (reaction_id);


CREATE TABLE IF NOT EXISTS main.comment_reaction_stats
(
    comment_id  BIGINT REFERENCES main.comments (id) ON DELETE CASCADE,
    reaction_id UUID REFERENCES main.reaction_types (id) ON DELETE CASCADE,
    count       BIGINT DEFAULT 0,
    PRIMARY KEY (comment_id, reaction_id)
);
CREATE INDEX IF NOT EXISTS idx_comment_reaction_stats_reaction_id
    ON main.comment_reaction_stats (reaction_id);

-- Вложения к постам (Attachments)
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
