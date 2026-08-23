INSERT INTO users.users (id, username, display_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'v3_fixture', 'V3 Fixture');

INSERT INTO users.user_subscribe (from_user_id, to_user_id)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
);

INSERT INTO users.profile_info (
    user_id,
    user_subscribes_count,
    group_subscribes_count,
    subscribers_count,
    karma
)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    -1,
    NULL,
    -1,
    -1
);

INSERT INTO groups.groups (id, alias, display_name)
VALUES ('00000000-0000-0000-0000-000000000002', 'v3-fixture', 'V3 Fixture');

INSERT INTO groups.group_info (group_id, subscribers_count)
VALUES ('00000000-0000-0000-0000-000000000002', -1);

INSERT INTO main.posts (id, path, content_type, content)
VALUES (3001, '3001', 0, 'V3 fixture post');

INSERT INTO main.user_posts (post_id, user_id)
VALUES (3001, '00000000-0000-0000-0000-000000000001');

INSERT INTO main.post_stats (post_id, comments_count, replies_count)
VALUES (3001, -1, NULL);

INSERT INTO main.post_reaction_stats (post_id, reaction_id, count)
SELECT 3001, id, -1
FROM main.reaction_types
WHERE name = 'fire';

INSERT INTO main.comments (
    id,
    post_id,
    author_id,
    content_type,
    content,
    path,
    visible_replies_count
)
VALUES (
    4001,
    3001,
    '00000000-0000-0000-0000-000000000001',
    0,
    'V3 fixture comment',
    '4001',
    -1
);

INSERT INTO main.comment_reaction_stats (comment_id, reaction_id, count)
SELECT 4001, id, -1
FROM main.reaction_types
WHERE name = 'fire';
