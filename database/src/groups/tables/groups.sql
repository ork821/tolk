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
