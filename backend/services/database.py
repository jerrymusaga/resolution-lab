"""
Resolution Lab - Database Service
Handles all Supabase database operations.
"""

import os
from typing import Optional
from datetime import datetime, timezone
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# Check if Supabase is configured
DB_ENABLED = bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)

if DB_ENABLED:
    # Use service key for backend operations (bypasses RLS)
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
else:
    supabase = None
    print("WARNING: Supabase not configured. Database operations will not work.")


# =====================
# User Operations
# =====================

def get_user_profile(user_id: str) -> Optional[dict]:
    """Get user profile by ID."""
    result = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    return result.data if result.data else None


def update_user_profile(user_id: str, data: dict) -> Optional[dict]:
    """Update user profile."""
    result = supabase.table("profiles").update(data).eq("id", user_id).execute()
    return result.data[0] if result.data else None


# =====================
# Goals Operations
# =====================

def get_user_goals(user_id: str, status: str = None) -> list:
    """Get all goals for a user, optionally filtered by status."""
    query = supabase.table("goals").select("*").eq("user_id", user_id)
    if status:
        query = query.eq("status", status)
    result = query.order("created_at", desc=True).execute()
    return result.data or []


def get_goal_by_id(goal_id: str) -> Optional[dict]:
    """Get a specific goal by ID."""
    try:
        result = supabase.table("goals").select("*").eq("id", goal_id).single().execute()
        return result.data if result.data else None
    except Exception:
        return None


def create_db_goal(
    user_id: str,
    title: str,
    description: str = None,
    frequency: str = "daily",
    target_count: int = 1,
    start_date: str = None,
    end_date: str = None
) -> Optional[dict]:
    """Create a new goal with full schema support."""
    from datetime import date
    goal_data = {
        "user_id": user_id,
        "title": title,
        "description": description,
        "frequency": frequency,
        "target_count": target_count,
        "start_date": start_date or date.today().isoformat(),
        "end_date": end_date,
        "status": "active",
        "current_streak": 0,
        "total_completions": 0,
        "completion_rate": 0.0
    }
    try:
        result = supabase.table("goals").insert(goal_data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"Error creating goal: {e}")
        return None


def update_goal(goal_id: str, data: dict) -> Optional[dict]:
    """Update a goal."""
    try:
        result = supabase.table("goals").update(data).eq("id", goal_id).execute()
        return result.data[0] if result.data else None
    except Exception:
        return None


def delete_db_goal(goal_id: str) -> bool:
    """Delete a goal."""
    try:
        result = supabase.table("goals").delete().eq("id", goal_id).execute()
        return bool(result.data)
    except Exception:
        return False


def update_goal_stats(goal_id: str, completed: bool) -> Optional[dict]:
    """Update goal statistics after a check-in."""
    goal = get_goal_by_id(goal_id)
    if not goal:
        return None

    new_completions = (goal.get("total_completions") or 0) + (1 if completed else 0)
    new_streak = (goal.get("current_streak") or 0) + 1 if completed else 0

    # Calculate completion rate based on total check-ins
    total_checkins = (goal.get("total_completions") or 0) + 1
    new_rate = new_completions / total_checkins if total_checkins > 0 else 0.0

    return update_goal(goal_id, {
        "total_completions": new_completions,
        "current_streak": new_streak,
        "completion_rate": new_rate
    })


# =====================
# Strategy Arms Operations (Bandit State)
# =====================

def get_strategy_arms(user_id: str) -> list:
    """Get all strategy arms for a user."""
    result = supabase.table("strategy_arms").select("*").eq("user_id", user_id).execute()
    return result.data or []


def upsert_strategy_arm(user_id: str, strategy: str, total_pulls: int, total_reward: float, successes: int) -> dict:
    """Create or update a strategy arm."""
    result = supabase.table("strategy_arms").upsert({
        "user_id": user_id,
        "strategy": strategy,
        "total_pulls": total_pulls,
        "total_reward": total_reward,
        "successes": successes
    }, on_conflict="user_id,strategy").execute()
    return result.data[0] if result.data else None


def update_strategy_arm(user_id: str, strategy: str, reward: float, success: bool) -> Optional[dict]:
    """Update strategy arm after a pull (increment counts)."""
    # First get current values
    result = supabase.table("strategy_arms").select("*").eq("user_id", user_id).eq("strategy", strategy).single().execute()

    if result.data:
        current = result.data
        new_data = {
            "total_pulls": current["total_pulls"] + 1,
            "total_reward": current["total_reward"] + reward,
            "successes": current["successes"] + (1 if success else 0)
        }
        update_result = supabase.table("strategy_arms").update(new_data).eq("id", current["id"]).execute()
        return update_result.data[0] if update_result.data else None
    else:
        # Create new arm
        return upsert_strategy_arm(user_id, strategy, 1, reward, 1 if success else 0)


# =====================
# User Experiment State Operations
# =====================

def get_experiment_state(user_id: str) -> Optional[dict]:
    """Get user's experiment state."""
    result = supabase.table("user_experiment_state").select("*").eq("user_id", user_id).single().execute()
    return result.data if result.data else None


def upsert_experiment_state(user_id: str, data: dict) -> dict:
    """Create or update user's experiment state."""
    data["user_id"] = user_id
    result = supabase.table("user_experiment_state").upsert(data, on_conflict="user_id").execute()
    return result.data[0] if result.data else None


def increment_interventions(user_id: str) -> Optional[dict]:
    """Increment total interventions count."""
    state = get_experiment_state(user_id)
    if state:
        new_count = state["total_interventions"] + 1
        return upsert_experiment_state(user_id, {"total_interventions": new_count})
    else:
        return upsert_experiment_state(user_id, {"total_interventions": 1})


def apply_formula(user_id: str, strategy: str) -> dict:
    """Apply user's discovered formula."""
    return upsert_experiment_state(user_id, {
        "preferred_strategy": strategy,
        "formula_applied": True,
        "experiment_phase": "optimizing"
    })


def clear_formula(user_id: str) -> dict:
    """Clear user's formula and return to exploring."""
    return upsert_experiment_state(user_id, {
        "preferred_strategy": None,
        "formula_applied": False,
        "experiment_phase": "exploring"
    })


# =====================
# Interventions Operations
# =====================

def create_intervention(
    user_id: str,
    strategy: str,
    message: str,
    goal_id: str = None,
    formula_active: bool = False
) -> dict:
    """Record a new intervention."""
    try:
        result = supabase.table("interventions").insert({
            "user_id": user_id,
            "goal_id": goal_id,
            "strategy": strategy,
            "message": message,
            "formula_active": formula_active
        }).execute()
        return result.data[0] if result.data else None
    except Exception:
        return None


def update_intervention_outcome(
    intervention_id: str,
    outcome: str,
    effectiveness_score: float = None,
    evaluation_grade: str = None,
    evaluation_scores: dict = None
) -> Optional[dict]:
    """Update intervention with outcome."""
    data = {
        "outcome": outcome,
        "completed_at": datetime.now(timezone.utc).isoformat()
    }
    if effectiveness_score is not None:
        data["effectiveness_score"] = effectiveness_score
    if evaluation_grade:
        data["evaluation_grade"] = evaluation_grade
    if evaluation_scores:
        data["evaluation_scores"] = evaluation_scores

    result = supabase.table("interventions").update(data).eq("id", intervention_id).execute()
    return result.data[0] if result.data else None


def get_user_interventions(user_id: str, limit: int = 50, goal_id: str = None) -> list:
    """Get recent interventions for a user."""
    query = supabase.table("interventions").select("*").eq("user_id", user_id)
    if goal_id:
        query = query.eq("goal_id", goal_id)
    result = query.order("created_at", desc=True).limit(limit).execute()
    return result.data or []


def get_intervention_by_id(intervention_id: str) -> Optional[dict]:
    """Get a specific intervention by ID."""
    try:
        result = supabase.table("interventions").select("*").eq("id", intervention_id).limit(1).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
        return None
    except Exception:
        return None


def has_checked_in_today(user_id: str, goal_id: str) -> bool:
    """Check if user has already checked in for a goal today."""
    from datetime import date, datetime, timezone

    today_start = datetime.combine(date.today(), datetime.min.time()).isoformat()

    try:
        result = supabase.table("interventions")\
            .select("id")\
            .eq("user_id", user_id)\
            .eq("goal_id", goal_id)\
            .gte("created_at", today_start)\
            .limit(1)\
            .execute()
        return bool(result.data)
    except Exception:
        return False


def get_last_checkin_for_goal(user_id: str, goal_id: str) -> Optional[dict]:
    """Get the most recent check-in for a goal."""
    try:
        result = supabase.table("interventions")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("goal_id", goal_id)\
            .order("created_at", desc=True)\
            .limit(1)\
            .execute()
        return result.data[0] if result.data else None
    except Exception:
        return None


def get_intervention_stats(user_id: str) -> dict:
    """Get intervention statistics for a user."""
    interventions = get_user_interventions(user_id, limit=1000)

    if not interventions:
        return {
            "total": 0,
            "completed": 0,
            "completion_rate": 0.0,
            "by_strategy": {}
        }

    total = len(interventions)
    completed = sum(1 for i in interventions if i.get("outcome") == "completed")

    # Group by strategy
    by_strategy = {}
    for i in interventions:
        strategy = i.get("strategy")
        if strategy not in by_strategy:
            by_strategy[strategy] = {"total": 0, "completed": 0}
        by_strategy[strategy]["total"] += 1
        if i.get("outcome") == "completed":
            by_strategy[strategy]["completed"] += 1

    # Calculate completion rates
    for strategy in by_strategy:
        s = by_strategy[strategy]
        s["completion_rate"] = s["completed"] / s["total"] if s["total"] > 0 else 0.0

    return {
        "total": total,
        "completed": completed,
        "completion_rate": completed / total if total > 0 else 0.0,
        "by_strategy": by_strategy
    }


# =====================
# Chat History Operations
# =====================

def save_chat_message(user_id: str, role: str, content: str, metadata: dict = None) -> dict:
    """Save a chat message."""
    result = supabase.table("chat_history").insert({
        "user_id": user_id,
        "role": role,
        "content": content,
        "metadata": metadata
    }).execute()
    return result.data[0] if result.data else None


def get_chat_history(user_id: str, limit: int = 50) -> list:
    """Get recent chat history for a user."""
    result = supabase.table("chat_history").select("*").eq("user_id", user_id).order("created_at", desc=False).limit(limit).execute()
    return result.data or []


def clear_chat_history(user_id: str) -> bool:
    """Clear all chat history for a user."""
    result = supabase.table("chat_history").delete().eq("user_id", user_id).execute()
    return True


# =====================
# Initialize user data
# =====================

def initialize_user_data(user_id: str) -> dict:
    """Initialize all data for a new user."""
    from models.schemas import InterventionStrategy

    # Create experiment state
    upsert_experiment_state(user_id, {
        "total_interventions": 0,
        "formula_applied": False,
        "experiment_phase": "exploring"
    })

    # Initialize all strategy arms
    for strategy in InterventionStrategy:
        upsert_strategy_arm(user_id, strategy.value, 0, 0.0, 0)

    return {"status": "initialized", "user_id": user_id}
