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
