-- Fitness integrations schema
-- Add fitness provider connections and sync tracking

CREATE TABLE fitness_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('strava', 'apple_health')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  athlete_id VARCHAR(255),
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,

  UNIQUE(user_id, provider)
);

-- Track fitness activities synced from providers
CREATE TABLE fitness_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('strava', 'apple_health')),
  provider_activity_id VARCHAR(255) NOT NULL,
  activity_type VARCHAR(100) NOT NULL, -- 'run', 'walk', 'ride', etc.
  name VARCHAR(255),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_seconds INTEGER,
  distance_meters DECIMAL(10,2),
  calories_burned INTEGER,
  steps_count INTEGER,
  heart_rate_avg INTEGER,
  heart_rate_max INTEGER,
  raw_data JSONB, -- Store full activity data from provider
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, provider, provider_activity_id)
);

-- Link fitness activities to task completions
CREATE TABLE fitness_task_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL,
  metric VARCHAR(50) NOT NULL CHECK (metric IN ('distance', 'duration', 'steps', 'calories')),
  multiplier DECIMAL(5,2) DEFAULT 1.0, -- Convert units (e.g., meters to km)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(task_id, activity_type, metric)
);

-- Enable RLS
ALTER TABLE fitness_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitness_task_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own fitness providers" ON fitness_providers
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own fitness activities" ON fitness_activities
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view fitness task mappings for their tasks" ON fitness_task_mappings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN challenges c ON t.challenge_id = c.id
      WHERE t.id = fitness_task_mappings.task_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Challenge owners can manage fitness task mappings" ON fitness_task_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN challenges c ON t.challenge_id = c.id
      WHERE t.id = fitness_task_mappings.task_id
      AND c.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_fitness_providers_user_provider ON fitness_providers(user_id, provider);
CREATE INDEX idx_fitness_activities_user_date ON fitness_activities(user_id, start_date);
CREATE INDEX idx_fitness_activities_provider_id ON fitness_activities(provider, provider_activity_id);
CREATE INDEX idx_fitness_task_mappings_task ON fitness_task_mappings(task_id);
