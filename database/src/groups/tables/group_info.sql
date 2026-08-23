CREATE TABLE IF NOT EXISTS groups.group_info
(
    group_id        UUID PRIMARY KEY REFERENCES groups.groups (id) ON DELETE CASCADE,
    subscribers_count INT NOT NULL DEFAULT 0,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ,
    deleted_at      TIMESTAMPTZ,
    CONSTRAINT chk_group_info_subscribers_count_nonnegative CHECK (subscribers_count >= 0)
);
