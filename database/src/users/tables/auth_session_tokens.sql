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
