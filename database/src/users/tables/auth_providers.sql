CREATE TABLE IF NOT EXISTS users.auth_providers
(
    id         UUID PRIMARY KEY DEFAULT uuidv7(),
    name       TEXT UNIQUE NOT NULL,          -- 'google', 'apple', 'github', 'telegram'
    is_active  BOOLEAN          DEFAULT TRUE, -- Возможность выключить логин через провайдера
    created_at TIMESTAMPTZ      DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);
