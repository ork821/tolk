INSERT INTO users.auth_providers (name, is_active)
VALUES ('vk', true)
ON CONFLICT (name) DO UPDATE
    SET is_active = EXCLUDED.is_active,
        updated_at = NOW(),
        deleted_at = NULL;

INSERT INTO users.auth_providers (name, is_active)
VALUES ('yandex', true)
ON CONFLICT (name) DO UPDATE
    SET is_active = EXCLUDED.is_active,
        updated_at = NOW(),
        deleted_at = NULL;

INSERT INTO main.reaction_types (name, is_active)
VALUES ('fire', true)
ON CONFLICT (name) DO UPDATE
    SET is_active = EXCLUDED.is_active,
        updated_at = NOW(),
        deleted_at = NULL;
