CREATE TABLE IF NOT EXISTS main.post_reaction_stats
(
    post_id     BIGINT REFERENCES main.posts (id) ON DELETE CASCADE,
    reaction_id UUID REFERENCES main.reaction_types (id) ON DELETE CASCADE,
    count       BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_post_reaction_stats_count_nonnegative CHECK (count >= 0),
    PRIMARY KEY (post_id, reaction_id)
);
CREATE INDEX IF NOT EXISTS idx_post_reaction_stats_reaction_id
    ON main.post_reaction_stats (reaction_id);
