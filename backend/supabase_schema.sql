-- Resolution Lab - Supabase Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- USERS TABLE (extends Supabase auth.users)
-- =====================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- GOALS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    target_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Goals policies
CREATE POLICY "Users can CRUD own goals" ON public.goals
    FOR ALL USING (auth.uid() = user_id);

-- =====================
-- STRATEGY ARMS TABLE (Bandit algorithm state)
-- =====================
CREATE TABLE IF NOT EXISTS public.strategy_arms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    strategy TEXT NOT NULL,
    total_pulls INTEGER DEFAULT 0,
    total_reward FLOAT DEFAULT 0.0,
    successes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, strategy)
);

-- Enable RLS
ALTER TABLE public.strategy_arms ENABLE ROW LEVEL SECURITY;

-- Strategy arms policies
CREATE POLICY "Users can CRUD own strategy arms" ON public.strategy_arms
    FOR ALL USING (auth.uid() = user_id);

-- =====================
-- USER EXPERIMENT STATE (Formula settings)
-- =====================
CREATE TABLE IF NOT EXISTS public.user_experiment_state (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    total_interventions INTEGER DEFAULT 0,
    preferred_strategy TEXT,
    formula_applied BOOLEAN DEFAULT false,
    experiment_phase TEXT DEFAULT 'exploring',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_experiment_state ENABLE ROW LEVEL SECURITY;

-- User experiment state policies
CREATE POLICY "Users can CRUD own experiment state" ON public.user_experiment_state
    FOR ALL USING (auth.uid() = user_id);

-- =====================
-- INTERVENTIONS TABLE (History of all interventions)
-- =====================
CREATE TABLE IF NOT EXISTS public.interventions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
    strategy TEXT NOT NULL,
    message TEXT NOT NULL,
    outcome TEXT, -- 'completed', 'dismissed', 'ignored', 'snoozed'
    effectiveness_score FLOAT,
    evaluation_grade TEXT,
    evaluation_scores JSONB,
    formula_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.interventions ENABLE ROW LEVEL SECURITY;

-- Interventions policies
CREATE POLICY "Users can CRUD own interventions" ON public.interventions
    FOR ALL USING (auth.uid() = user_id);

-- =====================
-- CHAT HISTORY TABLE (AI Coach conversations)
-- =====================
CREATE TABLE IF NOT EXISTS public.chat_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

-- Chat history policies
CREATE POLICY "Users can CRUD own chat history" ON public.chat_history
    FOR ALL USING (auth.uid() = user_id);

-- =====================
-- INDEXES for performance
-- =====================
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_strategy_arms_user_id ON public.strategy_arms(user_id);
CREATE INDEX IF NOT EXISTS idx_interventions_user_id ON public.interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_interventions_created_at ON public.interventions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON public.chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON public.chat_history(created_at DESC);

-- =====================
-- UPDATED_AT TRIGGER
-- =====================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_strategy_arms_updated_at BEFORE UPDATE ON public.strategy_arms
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_experiment_state_updated_at BEFORE UPDATE ON public.user_experiment_state
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
