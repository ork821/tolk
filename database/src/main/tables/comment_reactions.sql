CREATE TABLE IF NOT EXISTS main.comment_reactions
(
    comment_id  BIGINT REFERENCES main.comments (id) ON DELETE CASCADE,
    user_id     UUID REFERENCES users.users (id) ON DELETE CASCADE,
    reaction_id UUID REFERENCES main.reaction_types (id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ,
    deleted_at  TIMESTAMPTZ,
    PRIMARY KEY (comment_id, user_id, reaction_id)
);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON main.comment_reactions (comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON main.comment_reactions (user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_reaction_id ON main.comment_reactions (reaction_id);
