"""
Resolution Lab - User Context Builder

Builds rich, personalized context for motivation message generation.
Analyzes user history to create deeply personalized prompts.

Features:
- Recent completion momentum analysis
- Best performing strategies for this user
- Day-of-week and time patterns
- Streak and consistency analysis
- Emotional state inference from recent activity
"""

from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta, date
from collections import defaultdict
import opik
from opik import track

# Import database functions
try:
    from services.database import (
        DB_ENABLED,
        get_user_interventions,
        get_strategy_arms,
        get_goal_by_id,
        get_intervention_stats,
        get_user_goals,
    )
except ImportError:
    DB_ENABLED = False


class UserContext:
    """Rich context about a user for personalized message generation."""

    def __init__(self):
        # Basic info
        self.user_id: str = ""
        self.user_name: Optional[str] = None
        self.goal_title: str = ""
        self.goal_description: Optional[str] = None
        self.current_streak: int = 0
        self.time_of_day: Optional[str] = None

        # Momentum indicators
        self.recent_completions: int = 0  # Last 7 days
        self.recent_misses: int = 0  # Last 7 days
        self.momentum: str = "neutral"  # "rising", "falling", "stable", "neutral"
        self.last_completed_days_ago: Optional[int] = None
        self.consecutive_misses: int = 0

        # Strategy effectiveness
        self.best_strategy: Optional[str] = None
        self.best_strategy_rate: float = 0.0
        self.worst_strategy: Optional[str] = None
        self.strategy_history: Dict[str, Dict] = {}

        # Patterns
        self.best_day_of_week: Optional[str] = None
        self.worst_day_of_week: Optional[str] = None
        self.typical_check_in_time: Optional[str] = None
        self.weekend_vs_weekday: Optional[str] = None  # "better_weekends", "better_weekdays", "same"

        # Engagement
        self.total_interventions: int = 0
        self.overall_completion_rate: float = 0.0
        self.goal_age_days: int = 0
        self.is_new_user: bool = True

        # Inferred emotional state
        self.emotional_state: str = "neutral"  # "struggling", "building_momentum", "on_fire", "neutral", "comeback"
        self.needs_extra_encouragement: bool = False
        self.ready_for_challenge: bool = False

        # Previous successful messages (examples)
        self.successful_messages: List[str] = []

    def to_prompt_context(self) -> str:
        """Convert context to a natural language prompt addition."""
        parts = []

        # Momentum context
        if self.momentum == "rising":
            parts.append(f"USER IS ON A ROLL! They've completed {self.recent_completions} of their last 7 check-ins. Build on this momentum!")
        elif self.momentum == "falling" and self.consecutive_misses > 0:
            parts.append(f"User has missed {self.consecutive_misses} day(s) in a row. They may need extra encouragement to get back on track.")
        elif self.momentum == "comeback":
            parts.append("User is making a comeback after some misses. Celebrate their return!")

        # Streak context
        if self.current_streak >= 7:
            parts.append(f"IMPRESSIVE {self.current_streak}-DAY STREAK! Make them feel like a champion.")
        elif self.current_streak >= 3:
            parts.append(f"Building momentum with a {self.current_streak}-day streak. Encourage them to keep it going.")
        elif self.current_streak == 0 and self.last_completed_days_ago and self.last_completed_days_ago <= 3:
            parts.append("They completed recently but streak broke. Help them restart without making them feel bad.")

        # Strategy insight
        if self.best_strategy:
            parts.append(f"This user responds best to '{self.best_strategy}' messages ({self.best_strategy_rate:.0%} completion rate).")

        # Emotional state context
        if self.emotional_state == "struggling":
            parts.append("User seems to be struggling. Be extra gentle and supportive. Don't push too hard.")
        elif self.emotional_state == "on_fire":
            parts.append("User is crushing it! Match their energy. Be enthusiastic!")
        elif self.emotional_state == "comeback":
            parts.append("User is trying to get back on track. Acknowledge their effort, not just results.")

        # Day-of-week patterns
        if self.best_day_of_week and self.worst_day_of_week:
            today = datetime.now().strftime('%A')
            if today == self.worst_day_of_week:
                parts.append(f"{today}s tend to be harder for this user. Extra motivation might help.")
            elif today == self.best_day_of_week:
                parts.append(f"{today}s are usually strong for this user. They've got this!")

        # User experience level
        if self.is_new_user:
            parts.append("This is a newer user - be welcoming and encouraging of early progress.")
        elif self.overall_completion_rate >= 0.7:
            parts.append("This is a committed user with a strong track record. They take their goals seriously.")

        # Goal age
        if self.goal_age_days > 30:
            parts.append(f"They've been working on this goal for {self.goal_age_days} days - acknowledge their dedication.")

        return "\n".join(parts) if parts else ""

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for logging/debugging."""
        return {
            "user_id": self.user_id,
            "goal_title": self.goal_title,
            "current_streak": self.current_streak,
            "momentum": self.momentum,
            "recent_completions": self.recent_completions,
            "recent_misses": self.recent_misses,
            "consecutive_misses": self.consecutive_misses,
            "best_strategy": self.best_strategy,
            "best_strategy_rate": self.best_strategy_rate,
            "emotional_state": self.emotional_state,
            "overall_completion_rate": self.overall_completion_rate,
            "total_interventions": self.total_interventions,
            "is_new_user": self.is_new_user,
        }


@track(name="build_user_context", tags=["personalization"])
def build_user_context(
    user_id: str,
    goal_title: str,
    goal_id: Optional[str] = None,
    goal_description: Optional[str] = None,
    current_streak: int = 0,
    user_name: Optional[str] = None,
    time_of_day: Optional[str] = None,
) -> UserContext:
    """
    Build rich user context for personalized message generation.

    Analyzes user's intervention history to understand:
    - Their momentum (trending up or down)
    - What strategies work best for them
    - Their emotional state based on recent activity
    - Day-of-week and timing patterns

    Args:
        user_id: User's ID
        goal_title: Current goal title
        goal_id: Optional goal ID for goal-specific analysis
        goal_description: Optional goal description
        current_streak: User's current streak
        user_name: Optional user name
        time_of_day: Optional time of day (morning/afternoon/evening)

    Returns:
        UserContext with rich personalization data
    """
    ctx = UserContext()
    ctx.user_id = user_id
    ctx.goal_title = goal_title
    ctx.goal_description = goal_description
    ctx.current_streak = current_streak
    ctx.user_name = user_name
    ctx.time_of_day = time_of_day

    if not DB_ENABLED:
        return ctx

    try:
        # Get intervention history
        interventions = get_user_interventions(user_id, limit=100)

        if not interventions:
            ctx.is_new_user = True
            return ctx

        ctx.total_interventions = len(interventions)
        ctx.is_new_user = len(interventions) < 10

        # Analyze recent activity (last 7 days)
        now = datetime.now()
        week_ago = now - timedelta(days=7)

        recent_interventions = []
        for inv in interventions:
            created_str = inv.get("created_at", "")
            if created_str:
                try:
                    created = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                    if created.replace(tzinfo=None) >= week_ago:
                        recent_interventions.append(inv)
                except:
                    pass

        # Count completions and misses
        ctx.recent_completions = sum(1 for i in recent_interventions if i.get("outcome") == "completed")
        ctx.recent_misses = sum(1 for i in recent_interventions if i.get("outcome") and i.get("outcome") != "completed")

        # Overall completion rate
        completed_total = sum(1 for i in interventions if i.get("outcome") == "completed")
        ctx.overall_completion_rate = completed_total / len(interventions) if interventions else 0

        # Find last completion
        for inv in interventions:
            if inv.get("outcome") == "completed":
                created_str = inv.get("created_at", "")
                if created_str:
                    try:
                        created = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                        ctx.last_completed_days_ago = (now - created.replace(tzinfo=None)).days
                    except:
                        pass
                break

        # Count consecutive misses (from most recent)
        ctx.consecutive_misses = 0
        for inv in interventions:
            if inv.get("outcome") == "completed":
                break
            elif inv.get("outcome"):
                ctx.consecutive_misses += 1

        # Determine momentum
        if ctx.recent_completions >= 5:
            ctx.momentum = "rising"
        elif ctx.consecutive_misses >= 3:
            ctx.momentum = "falling"
        elif ctx.consecutive_misses > 0 and ctx.last_completed_days_ago and ctx.last_completed_days_ago <= 2:
            ctx.momentum = "comeback"
        else:
            ctx.momentum = "stable"

        # Analyze strategy effectiveness
        strategy_stats = defaultdict(lambda: {"completed": 0, "total": 0})
        for inv in interventions:
            strategy = inv.get("strategy")
            if strategy and inv.get("outcome"):
                strategy_stats[strategy]["total"] += 1
                if inv.get("outcome") == "completed":
                    strategy_stats[strategy]["completed"] += 1

        # Find best and worst strategies
        best_rate = 0
        worst_rate = 1
        for strategy, stats in strategy_stats.items():
            if stats["total"] >= 3:  # Minimum sample size
                rate = stats["completed"] / stats["total"]
                ctx.strategy_history[strategy] = {
                    "total": stats["total"],
                    "completed": stats["completed"],
                    "rate": rate
                }
                if rate > best_rate:
                    best_rate = rate
                    ctx.best_strategy = strategy
                    ctx.best_strategy_rate = rate
                if rate < worst_rate:
                    worst_rate = rate
                    ctx.worst_strategy = strategy

        # Analyze day-of-week patterns
        day_stats = defaultdict(lambda: {"completed": 0, "total": 0})
        for inv in interventions:
            created_str = inv.get("created_at", "")
            if created_str and inv.get("outcome"):
                try:
                    created = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                    day_name = created.strftime("%A")
                    day_stats[day_name]["total"] += 1
                    if inv.get("outcome") == "completed":
                        day_stats[day_name]["completed"] += 1
                except:
                    pass

        best_day_rate = 0
        worst_day_rate = 1
        for day, stats in day_stats.items():
            if stats["total"] >= 2:
                rate = stats["completed"] / stats["total"]
                if rate > best_day_rate:
                    best_day_rate = rate
                    ctx.best_day_of_week = day
                if rate < worst_day_rate:
                    worst_day_rate = rate
                    ctx.worst_day_of_week = day

        # Weekend vs weekday analysis
        weekend_days = {"Saturday", "Sunday"}
        weekend_completions = sum(day_stats[d]["completed"] for d in weekend_days if d in day_stats)
        weekend_total = sum(day_stats[d]["total"] for d in weekend_days if d in day_stats)
        weekday_completions = sum(day_stats[d]["completed"] for d in day_stats if d not in weekend_days)
        weekday_total = sum(day_stats[d]["total"] for d in day_stats if d not in weekend_days)

        weekend_rate = weekend_completions / weekend_total if weekend_total > 0 else 0
        weekday_rate = weekday_completions / weekday_total if weekday_total > 0 else 0

        if weekend_rate > weekday_rate + 0.1:
            ctx.weekend_vs_weekday = "better_weekends"
        elif weekday_rate > weekend_rate + 0.1:
            ctx.weekend_vs_weekday = "better_weekdays"
        else:
            ctx.weekend_vs_weekday = "same"

        # Determine emotional state
        if ctx.consecutive_misses >= 3:
            ctx.emotional_state = "struggling"
            ctx.needs_extra_encouragement = True
        elif ctx.momentum == "rising" and ctx.current_streak >= 5:
            ctx.emotional_state = "on_fire"
            ctx.ready_for_challenge = True
        elif ctx.momentum == "comeback":
            ctx.emotional_state = "comeback"
            ctx.needs_extra_encouragement = True
        elif ctx.recent_completions >= 4:
            ctx.emotional_state = "building_momentum"
        else:
            ctx.emotional_state = "neutral"

        # Get goal age if available
        if goal_id:
            goal = get_goal_by_id(goal_id)
            if goal and goal.get("created_at"):
                try:
                    goal_created = datetime.fromisoformat(goal["created_at"].replace("Z", "+00:00"))
                    ctx.goal_age_days = (now - goal_created.replace(tzinfo=None)).days
                except:
                    pass

        # Get examples of successful messages (for few-shot context)
        for inv in interventions:
            if inv.get("outcome") == "completed" and inv.get("message"):
                if len(ctx.successful_messages) < 3:
                    ctx.successful_messages.append(inv["message"])

        print(f"Built user context: momentum={ctx.momentum}, emotional_state={ctx.emotional_state}, "
              f"best_strategy={ctx.best_strategy} ({ctx.best_strategy_rate:.0%})")

    except Exception as e:
        print(f"Error building user context: {e}")

    return ctx


def get_personalized_prompt_addition(ctx: UserContext) -> str:
    """
    Generate a natural language prompt addition based on user context.

    This is added to the system prompt to make messages more personalized.
    """
    return ctx.to_prompt_context()
