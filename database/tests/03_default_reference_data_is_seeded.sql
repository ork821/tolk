DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM users.auth_providers
        WHERE name = 'vk'
          AND is_active IS TRUE
          AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'VK auth provider was not seeded by migrations';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM users.auth_providers
        WHERE name = 'yandex'
          AND is_active IS TRUE
          AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Yandex auth provider was not seeded by migrations';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM main.reaction_types
        WHERE name = 'fire'
          AND is_active IS TRUE
          AND deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Fire reaction type was not seeded by migrations';
    END IF;
END
$$;
