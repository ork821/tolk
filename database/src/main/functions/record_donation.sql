CREATE OR REPLACE FUNCTION main.record_donation(
    pi_operation_id TEXT,
    pi_user_id UUID,
    pi_amount NUMERIC,
    pi_withdraw_amount NUMERIC,
    pi_notification_type TEXT,
    pi_occurred_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, main, users
AS $$
DECLARE
    v_rows_inserted INTEGER;
BEGIN
    IF pi_operation_id IS NULL OR btrim(pi_operation_id) = '' OR length(pi_operation_id) > 128 THEN
        RAISE EXCEPTION 'Invalid donation operation id' USING ERRCODE = '22023';
    END IF;

    IF pi_amount <= 0 OR pi_withdraw_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid donation amount' USING ERRCODE = '22023';
    END IF;

    IF pi_notification_type NOT IN ('p2p-incoming', 'card-incoming') THEN
        RAISE EXCEPTION 'Invalid donation notification type' USING ERRCODE = '22023';
    END IF;

    INSERT INTO main.donations (
        operation_id,
        user_id,
        amount,
        withdraw_amount,
        notification_type,
        occurred_at
    )
    VALUES (
        pi_operation_id,
        CASE
            WHEN EXISTS (SELECT 1 FROM users.users u WHERE u.id = pi_user_id) THEN pi_user_id
            ELSE NULL
        END,
        pi_amount,
        pi_withdraw_amount,
        pi_notification_type,
        pi_occurred_at
    )
    ON CONFLICT (operation_id) DO NOTHING;

    GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;
    RETURN v_rows_inserted = 1;
END;
$$;
