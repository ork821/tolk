CREATE TABLE IF NOT EXISTS users.users
(
    id           UUID PRIMARY KEY DEFAULT uuidv7(),
    username     TEXT,
    display_name TEXT        NOT NULL,
    email        TEXT,
    created_at   TIMESTAMPTZ      DEFAULT NOW(),
    updated_at   TIMESTAMPTZ,
    deleted_at   TIMESTAMPTZ
);

-- Username remains reserved for a soft-deleted account until it is explicitly anonymized with NULL.
CREATE UNIQUE INDEX idx_users_username_unique ON users.users (username);
CREATE INDEX idx_users_username_prefix_active ON users.users (username text_pattern_ops) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_users_email_active ON users.users (email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_display_name_trgm_active ON users.users USING gin (display_name gin_trgm_ops) WHERE deleted_at IS NULL;
