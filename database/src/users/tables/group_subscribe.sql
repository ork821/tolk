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
