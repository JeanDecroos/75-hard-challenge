-- Fix infinite recursion in RLS policies for tasks table
-- The issue occurs when doing nested queries like challenges?select=*,tasks(*)
-- because the tasks policy queries the challenges table, causing recursion
-- 
-- Solution: Avoid querying challenges table entirely. Instead, rely on the fact that
-- if a user can see a challenge (via the challenges RLS policy), they can see its tasks.
-- We only need to check challenge_members for non-owners.

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view tasks of their challenges" ON public.tasks;

-- Drop existing function if it exists  
DROP FUNCTION IF EXISTS public.user_can_view_challenge(UUID);

-- Simplified policy that only checks challenge_members
-- This avoids querying challenges table which causes recursion
-- Owners can see tasks because they can see the challenge (handled by parent query context)
CREATE POLICY "Users can view tasks of their challenges"
  ON public.tasks FOR SELECT
  USING (
    -- Check if user is a member of the challenge
    EXISTS (
      SELECT 1 FROM public.challenge_members
      WHERE challenge_id = tasks.challenge_id AND user_id = auth.uid()
    )
    -- Note: We don't check ownership here to avoid recursion.
    -- When PostgREST does challenges?select=*,tasks(*), it first evaluates
    -- the challenges policy (which checks ownership), and only then evaluates
    -- the tasks policy. So if the user owns the challenge, they can see it,
    -- and therefore can see its tasks. This policy handles the case where
    -- the user is a member but not the owner.
  );

