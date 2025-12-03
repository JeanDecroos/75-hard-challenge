-- Performance Optimization Indexes
-- These indexes improve query performance for the dashboard and common operations

-- Index for fetching challenges by user (dashboard load)
CREATE INDEX IF NOT EXISTS idx_challenges_user_id 
ON challenges(user_id);

-- Index for fetching tasks by challenge (used in every challenge load)
CREATE INDEX IF NOT EXISTS idx_tasks_challenge_id 
ON tasks(challenge_id);

-- Composite index for daily entries (most common query pattern)
-- Used when fetching entries for a specific user's challenge
CREATE INDEX IF NOT EXISTS idx_daily_entries_challenge_user 
ON daily_entries(challenge_id, user_id);

-- Index for date-based queries on daily entries
CREATE INDEX IF NOT EXISTS idx_daily_entries_challenge_user_date 
ON daily_entries(challenge_id, user_id, date);

-- Index for task completions lookup
CREATE INDEX IF NOT EXISTS idx_task_completions_daily_entry 
ON task_completions(daily_entry_id);

-- Index for challenge members lookup (for social features)
CREATE INDEX IF NOT EXISTS idx_challenge_members_challenge_id 
ON challenge_members(challenge_id);

CREATE INDEX IF NOT EXISTS idx_challenge_members_user_id 
ON challenge_members(user_id);

-- Index for fitness activities (for auto-population feature)
CREATE INDEX IF NOT EXISTS idx_fitness_activities_user_date 
ON fitness_activities(user_id, start_date);

-- Index for fitness providers lookup
CREATE INDEX IF NOT EXISTS idx_fitness_providers_user_id 
ON fitness_providers(user_id);

-- Add comment explaining the indexes
COMMENT ON INDEX idx_daily_entries_challenge_user_date IS 
'Optimizes the most common query: fetching daily entries for a challenge/user/date combination';

COMMENT ON INDEX idx_challenges_user_id IS 
'Optimizes dashboard load - fetching all challenges for a user';
