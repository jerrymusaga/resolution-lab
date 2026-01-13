"""
Resolution Lab - Database Module
Supabase client initialization and helper functions.
"""

from functools import lru_cache
from typing import Optional
from supabase import create_client, Client

import sys
sys.path.append('..')
from config import get_settings


@lru_cache()
def get_supabase_client() -> Optional[Client]:
    """
    Get cached Supabase client instance.
    Returns None if credentials not configured.
    """
    settings = get_settings()
    
    if not settings.supabase_url or not settings.supabase_service_key:
        print("⚠️ Supabase credentials not configured")
        return None
    
    try:
        client = create_client(
            settings.supabase_url,
            settings.supabase_service_key
        )
        print("✅ Supabase client initialized")
        return client
    except Exception as e:
        print(f"❌ Failed to initialize Supabase: {e}")
        return None


def get_db() -> Optional[Client]:
    """Dependency for FastAPI routes to get database client."""
    return get_supabase_client()


# ===================
# Database Schema SQL
# ===================
# Run this in Supabase SQL Editor to create tables

DATABASE_SCHEMA = """
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    frequency TEXT NOT NULL DEFAULT 'daily',
    target_count INTEGER DEFAULT 1,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interventions sent to users
CREATE TABLE IF NOT EXISTS interventions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    strategy TEXT NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    opik_trace_id TEXT
);

-- User outcomes (check-ins)
CREATE TABLE IF NOT EXISTS outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    completed BOOLEAN NOT NULL,
    response_time_seconds INTEGER,
    user_feedback TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregated strategy statistics per user
CREATE TABLE IF NOT EXISTS user_strategy_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    strategy TEXT NOT NULL,
    total_interventions INTEGER DEFAULT 0,
    successful_completions INTEGER DEFAULT 0,
    avg_response_time_seconds FLOAT,
    effectiveness_score FLOAT DEFAULT 0.0,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, strategy)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_interventions_user ON interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_interventions_goal ON interventions(goal_id);
CREATE INDEX IF NOT EXISTS idx_interventions_sent ON interventions(sent_at);
CREATE INDEX IF NOT EXISTS idx_outcomes_user ON outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_intervention ON outcomes(intervention_id);
CREATE INDEX IF NOT EXISTS idx_stats_user ON user_strategy_stats(user_id);

-- Row Level Security (RLS) Policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_strategy_stats ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own goals" ON goals
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own interventions" ON interventions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own outcomes" ON outcomes
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own stats" ON user_strategy_stats
    FOR ALL USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
"""


def print_schema():
    """Print the database schema for manual setup."""
    print("=" * 60)
    print("RESOLUTION LAB - DATABASE SCHEMA")
    print("=" * 60)
    print("\nRun the following SQL in your Supabase SQL Editor:\n")
    print(DATABASE_SCHEMA)
    print("=" * 60)


if __name__ == "__main__":
    print_schema()
