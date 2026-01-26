-- Migration: Add missing columns to goals table
-- Run this in Supabase SQL Editor

-- Add frequency column
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'daily';

-- Add target_count column
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS target_count INTEGER DEFAULT 1;

-- Add start_date column
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS start_date DATE DEFAULT CURRENT_DATE;

-- Add end_date column
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add status column
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add streak tracking columns
ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;

ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS total_completions INTEGER DEFAULT 0;

ALTER TABLE public.goals
ADD COLUMN IF NOT EXISTS completion_rate FLOAT DEFAULT 0.0;

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status);