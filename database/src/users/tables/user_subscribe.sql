CREATE TABLE IF NOT EXISTS users.user_subscribe
(
    from_user_id UUID REFERENCES users.users (id) ON DELETE CASCADE, -- Кто подписывается
    to_user_id   UUID REFERENCES users.users (id) ON DELETE CASCADE, -- на кого подписывается
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ,
    deleted_at   TIMESTAMPTZ,
    CONSTRAINT chk_user_subscribe_not_self CHECK (from_user_id <> to_user_id),
    PRIMARY KEY (from_user_id, to_user_id)
);
CREATE INDEX IF NOT EXISTS idx_user_subscribe_to_user ON users.user_subscribe (to_user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscribe_from_date ON users.user_subscribe (from_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_subscribe_to_date ON users.user_subscribe (to_user_id, created_at DESC);
