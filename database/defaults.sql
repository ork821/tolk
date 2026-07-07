INSERT INTO users.auth_providers (name, is_active) VALUES ('vk', true);
INSERT INTO users.auth_providers (name, is_active) VALUES ('yandex', true);

INSERT INTO main.reaction_types (name, is_active) VALUES ('fire', true);

select * from main.get_user_reacted_posts('ork821', 10);
