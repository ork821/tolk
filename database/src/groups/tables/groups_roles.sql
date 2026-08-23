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
