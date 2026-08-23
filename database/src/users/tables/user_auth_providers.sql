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
