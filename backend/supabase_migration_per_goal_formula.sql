-- Migration: Per-Goal Formula Support
-- Run this in your Supabase SQL Editor to add per-goal formula support

-- Add formula columns to goals table
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS preferred_strategy TEXT,
ADD COLUMN IF NOT EXISTS formula_applied BOOLEAN DEFAULT false;

-- Add goal_id to strategy_arms for per-goal tracking
ALTER TABLE public.strategy_arms
ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE;

-- Update unique constraint to be per user+goal+strategy
-- First drop the old constraint
ALTER TABLE public.strategy_arms DROP CONSTRAINT IF EXISTS strategy_arms_user_id_strategy_key;

-- Add new constraint (user_id + goal_id + strategy must be unique)
-- goal_id can be NULL for user-level stats
ALTER TABLE public.strategy_arms
ADD CONSTRAINT strategy_arms_user_goal_strategy_key UNIQUE(user_id, goal_id, strategy);

-- Create index for goal-based lookups
CREATE INDEX IF NOT EXISTS idx_strategy_arms_goal_id ON public.strategy_arms(goal_id);
CREATE INDEX IF NOT EXISTS idx_goals_formula ON public.goals(formula_applied) WHERE formula_applied = true;

-- Comment explaining the change
COMMENT ON COLUMN public.goals.preferred_strategy IS 'The motivation strategy that works best for this specific goal';
COMMENT ON COLUMN public.goals.formula_applied IS 'Whether the user has locked in their preferred strategy for this goal';
