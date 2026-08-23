CREATE TABLE IF NOT EXISTS main.donations
(
    operation_id      TEXT PRIMARY KEY,
    user_id           UUID REFERENCES users.users (id) ON DELETE SET NULL,
    amount            NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    withdraw_amount   NUMERIC(18, 2) NOT NULL CHECK (withdraw_amount > 0),
    notification_type TEXT NOT NULL CHECK (notification_type IN ('p2p-incoming', 'card-incoming')),
    occurred_at       TIMESTAMPTZ NOT NULL,
    received_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_donations_user_occurred_at
    ON main.donations (user_id, occurred_at DESC)
    WHERE user_id IS NOT NULL;
