CREATE TABLE IF NOT EXISTS main.post_reactions
(
    post_id     BIGINT REFERENCES main.posts (id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users.users (id) ON DELETE CASCADE,
    reaction_id UUID REFERENCES main.reaction_types (id) ON DELETE CASCADE,

    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ,
    PRIMARY KEY (post_id, user_id, reaction_id)
);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_id ON main.post_reactions (user_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user_active_post
    ON main.post_reactions (user_id, post_id)
    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_post_reactions_reaction_id ON main.post_reactions (reaction_id);
