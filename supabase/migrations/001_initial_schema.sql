-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_time TEXT DEFAULT '20:00',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Challenges table
CREATE TABLE public.challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  duration_days INTEGER DEFAULT 75,
  invite_token TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('checkbox', 'number')),
  target_value FLOAT NOT NULL DEFAULT 1,
  unit TEXT,
  is_required BOOLEAN DEFAULT true,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily entries table
CREATE TABLE public.daily_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  note TEXT,
  image_url TEXT,
  is_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(challenge_id, user_id, date)
);

-- Task completions table
CREATE TABLE public.task_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_entry_id UUID NOT NULL REFERENCES public.daily_entries(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  value FLOAT NOT NULL DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  UNIQUE(daily_entry_id, task_id)
);

-- Challenge members table
CREATE TABLE public.challenge_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(challenge_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_challenges_user_id ON public.challenges(user_id);
CREATE INDEX idx_challenges_invite_token ON public.challenges(invite_token);
CREATE INDEX idx_tasks_challenge_id ON public.tasks(challenge_id);
CREATE INDEX idx_daily_entries_challenge_id ON public.daily_entries(challenge_id);
CREATE INDEX idx_daily_entries_user_id ON public.daily_entries(user_id);
CREATE INDEX idx_daily_entries_date ON public.daily_entries(date);
CREATE INDEX idx_task_completions_daily_entry_id ON public.task_completions(daily_entry_id);
CREATE INDEX idx_challenge_members_challenge_id ON public.challenge_members(challenge_id);
CREATE INDEX idx_challenge_members_user_id ON public.challenge_members(user_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to calculate if a daily entry is complete (all required tasks completed)
CREATE OR REPLACE FUNCTION public.check_daily_entry_complete()
RETURNS TRIGGER AS $$
DECLARE
  total_required INTEGER;
  completed_required INTEGER;
  entry_complete BOOLEAN;
BEGIN
  -- Get count of required tasks for the challenge
  SELECT COUNT(*) INTO total_required
  FROM public.tasks t
  JOIN public.daily_entries de ON de.challenge_id = t.challenge_id
  WHERE de.id = COALESCE(NEW.daily_entry_id, OLD.daily_entry_id)
    AND t.is_required = true;

  -- Get count of completed required tasks
  SELECT COUNT(*) INTO completed_required
  FROM public.task_completions tc
  JOIN public.tasks t ON t.id = tc.task_id
  WHERE tc.daily_entry_id = COALESCE(NEW.daily_entry_id, OLD.daily_entry_id)
    AND tc.is_completed = true
    AND t.is_required = true;

  -- Determine if entry is complete
  entry_complete := (total_required > 0 AND total_required = completed_required);

  -- Update the daily entry is_complete flag
  UPDATE public.daily_entries
  SET is_complete = entry_complete
  WHERE id = COALESCE(NEW.daily_entry_id, OLD.daily_entry_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update daily entry completion status
CREATE TRIGGER update_daily_entry_complete
  AFTER INSERT OR UPDATE OR DELETE ON public.task_completions
  FOR EACH ROW EXECUTE FUNCTION public.check_daily_entry_complete();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for challenges
CREATE POLICY "Users can view own challenges"
  ON public.challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view challenges they are members of"
  ON public.challenges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.challenge_members
      WHERE challenge_id = challenges.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own challenges"
  ON public.challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges"
  ON public.challenges FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own challenges"
  ON public.challenges FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks of their challenges"
  ON public.tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges
      WHERE id = tasks.challenge_id AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.challenge_members
      WHERE challenge_id = tasks.challenge_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert tasks for own challenges"
  ON public.tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.challenges
      WHERE id = tasks.challenge_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks of own challenges"
  ON public.tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges
      WHERE id = tasks.challenge_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks of own challenges"
  ON public.tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges
      WHERE id = tasks.challenge_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for daily_entries
CREATE POLICY "Users can view own entries"
  ON public.daily_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Members can view challenge entries (high level)"
  ON public.daily_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.challenge_members cm
      WHERE cm.challenge_id = daily_entries.challenge_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own entries"
  ON public.daily_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entries"
  ON public.daily_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entries"
  ON public.daily_entries FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for task_completions
CREATE POLICY "Users can view own task completions"
  ON public.task_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_entries de
      WHERE de.id = task_completions.daily_entry_id AND de.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own task completions"
  ON public.task_completions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.daily_entries de
      WHERE de.id = task_completions.daily_entry_id AND de.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own task completions"
  ON public.task_completions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_entries de
      WHERE de.id = task_completions.daily_entry_id AND de.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own task completions"
  ON public.task_completions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_entries de
      WHERE de.id = task_completions.daily_entry_id AND de.user_id = auth.uid()
    )
  );

-- RLS Policies for challenge_members
CREATE POLICY "Users can view members of their challenges"
  ON public.challenge_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_members.challenge_id AND c.user_id = auth.uid()
    )
    OR auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.challenge_members cm2
      WHERE cm2.challenge_id = challenge_members.challenge_id AND cm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join challenges via invite"
  ON public.challenge_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Challenge owners can remove members"
  ON public.challenge_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = challenge_members.challenge_id AND c.user_id = auth.uid()
    )
    OR auth.uid() = user_id
  );

-- Create storage bucket for progress photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('progress-photos', 'progress-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload own photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'progress-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view all photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'progress-photos');

CREATE POLICY "Users can update own photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'progress-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

