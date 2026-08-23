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
