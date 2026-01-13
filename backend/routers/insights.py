"""
Resolution Lab - Insights Router
API endpoints for user insights and analytics.

This is the key differentiator - exposing Opik experiment data
directly to users as their personal motivation insights.
"""

from typing import Optional
from fastapi import APIRouter, Query
import opik

from models.schemas import (
    UserInsights,
    StrategyStats,
    InterventionStrategy,
)
from services.experiment_engine import experiment_engine, ALL_STRATEGIES
from services.analysis_engine import generate_user_recommendation

router = APIRouter(prefix="/insights", tags=["Insights"])


# ===================
# API Endpoints
# ===================

@router.get("", response_model=UserInsights)
@opik.track(name="api_get_user_insights")
async def get_user_insights(
    user_id: str = Query(..., description="User ID"),
):
    """
    Get personalized insights for a user based on their experiment data.
    
    This is the magic - we show users what we've learned about their
    motivation patterns through our A/B testing.
    
    Returns:
    - Strategy effectiveness ranking
    - Best and worst performing strategies
    - Personalized recommendation
    - Experiment phase status
    """
    # Get raw insights from experiment engine
    raw_insights = experiment_engine.get_user_insights(user_id)
    
    # Convert to StrategyStats objects
    strategy_stats = [
        StrategyStats(
            strategy=InterventionStrategy(stat["strategy"]),
            total_interventions=stat["total_interventions"],
            successful_completions=stat["successful_completions"],
            completion_rate=stat["completion_rate"],
            avg_response_time_seconds=None,  # Could calculate if needed
            effectiveness_score=stat["effectiveness_score"],
        )
        for stat in raw_insights["strategy_stats"]
    ]
    
    # Generate personalized recommendation using LLM
    try:
        recommendation = generate_user_recommendation(
            strategy_stats=raw_insights["strategy_stats"],
            total_interventions=raw_insights["total_interventions"],
        )
    except Exception:
        recommendation = "Keep responding to check-ins to discover your motivation patterns!"
    
    # Determine best/worst strategies
    best_strategy = None
    worst_strategy = None
    
    if raw_insights["best_strategy"]:
        best_strategy = InterventionStrategy(raw_insights["best_strategy"])
    
    if raw_insights["worst_strategy"]:
        worst_strategy = InterventionStrategy(raw_insights["worst_strategy"])
    
    return UserInsights(
        user_id=user_id,
        total_goals=0,  # Would come from goals DB
        active_goals=0,  # Would come from goals DB
        overall_completion_rate=calculate_overall_completion_rate(strategy_stats),
        strategy_stats=strategy_stats,
        best_strategy=best_strategy,
        worst_strategy=worst_strategy,
        recommendation=recommendation,
        experiment_phase=raw_insights["experiment_phase"],
        strategies_tested=raw_insights["strategies_tested"],
        data_points_collected=raw_insights["total_interventions"],
    )


@router.get("/strategy/{strategy}", response_model=StrategyStats)
async def get_strategy_stats(
    strategy: InterventionStrategy,
    user_id: str = Query(..., description="User ID"),
):
    """Get detailed statistics for a specific strategy."""
    raw_insights = experiment_engine.get_user_insights(user_id)
    
    for stat in raw_insights["strategy_stats"]:
        if stat["strategy"] == strategy.value:
            return StrategyStats(
                strategy=strategy,
                total_interventions=stat["total_interventions"],
                successful_completions=stat["successful_completions"],
                completion_rate=stat["completion_rate"],
                avg_response_time_seconds=None,
                effectiveness_score=stat["effectiveness_score"],
            )
    
    # Strategy hasn't been tested yet
    return StrategyStats(
        strategy=strategy,
        total_interventions=0,
        successful_completions=0,
        completion_rate=0.0,
        avg_response_time_seconds=None,
        effectiveness_score=0.0,
    )


@router.get("/comparison", response_model=dict)
async def compare_strategies(
    user_id: str = Query(..., description="User ID"),
):
    """
    Get a side-by-side comparison of all strategies for a user.
    
    This is great for visualization in the frontend dashboard.
    """
    raw_insights = experiment_engine.get_user_insights(user_id)
    
    # Build comparison data
    comparison = []
    for strategy in ALL_STRATEGIES:
        stat = next(
            (s for s in raw_insights["strategy_stats"] if s["strategy"] == strategy.value),
            None
        )
        
        if stat:
            comparison.append({
                "strategy": strategy.value,
                "strategy_name": strategy_display_name(strategy),
                "completion_rate": stat["completion_rate"],
                "effectiveness_score": stat["effectiveness_score"],
                "sample_size": stat["total_interventions"],
                "confidence": get_confidence_level(stat["total_interventions"]),
            })
        else:
            comparison.append({
                "strategy": strategy.value,
                "strategy_name": strategy_display_name(strategy),
                "completion_rate": 0.0,
                "effectiveness_score": 0.0,
                "sample_size": 0,
                "confidence": "none",
            })
    
    # Sort by effectiveness
    comparison.sort(key=lambda x: x["effectiveness_score"], reverse=True)
    
    return {
        "comparison": comparison,
        "experiment_phase": raw_insights["experiment_phase"],
        "total_data_points": raw_insights["total_interventions"],
    }


@router.get("/summary", response_model=dict)
async def get_insights_summary(
    user_id: str = Query(..., description="User ID"),
):
    """
    Get a quick summary of insights for dashboard cards.
    
    Returns key metrics that can be displayed prominently.
    """
    raw_insights = experiment_engine.get_user_insights(user_id)
    
    best = raw_insights["best_strategy"]
    best_stat = None
    if best:
        best_stat = next(
            (s for s in raw_insights["strategy_stats"] if s["strategy"] == best),
            None
        )
    
    return {
        "data_points": raw_insights["total_interventions"],
        "strategies_tested": raw_insights["strategies_tested"],
        "experiment_phase": raw_insights["experiment_phase"],
        "best_strategy": {
            "name": strategy_display_name(InterventionStrategy(best)) if best else None,
            "completion_rate": best_stat["completion_rate"] if best_stat else 0,
            "improvement_vs_worst": calculate_improvement(raw_insights),
        } if best else None,
        "ready_for_optimization": raw_insights["experiment_phase"] == "optimizing",
    }


@router.get("/recommendation", response_model=dict)
async def get_recommendation(
    user_id: str = Query(..., description="User ID"),
):
    """
    Get a personalized recommendation based on experiment data.
    
    Uses LLM to generate human-readable insights.
    """
    raw_insights = experiment_engine.get_user_insights(user_id)
    
    try:
        recommendation = generate_user_recommendation(
            strategy_stats=raw_insights["strategy_stats"],
            total_interventions=raw_insights["total_interventions"],
        )
    except Exception as e:
        recommendation = "Keep responding to check-ins to discover your motivation patterns!"
    
    return {
        "recommendation": recommendation,
        "based_on_data_points": raw_insights["total_interventions"],
        "confidence": "high" if raw_insights["total_interventions"] >= 20 else "medium" if raw_insights["total_interventions"] >= 10 else "low",
    }


# ===================
# Helper Functions
# ===================

def calculate_overall_completion_rate(stats: list[StrategyStats]) -> float:
    """Calculate overall completion rate across all strategies."""
    total_interventions = sum(s.total_interventions for s in stats)
    total_completions = sum(s.successful_completions for s in stats)
    
    if total_interventions == 0:
        return 0.0
    
    return round(total_completions / total_interventions, 3)


def strategy_display_name(strategy: InterventionStrategy) -> str:
    """Get human-readable name for a strategy."""
    names = {
        InterventionStrategy.GENTLE_REMINDER: "Gentle Reminder",
        InterventionStrategy.ACCOUNTABILITY: "Direct Accountability",
        InterventionStrategy.STREAK_GAMIFICATION: "Streak & Gamification",
        InterventionStrategy.SOCIAL_COMPARISON: "Social Proof",
        InterventionStrategy.LOSS_AVERSION: "Loss Framing",
        InterventionStrategy.REWARD_PREVIEW: "Reward Preview",
        InterventionStrategy.IDENTITY_REINFORCEMENT: "Identity-Based",
        InterventionStrategy.MICRO_COMMITMENT: "Micro-Commitment",
    }
    return names.get(strategy, strategy.value)


def get_confidence_level(sample_size: int) -> str:
    """Get confidence level based on sample size."""
    if sample_size >= 10:
        return "high"
    elif sample_size >= 5:
        return "medium"
    elif sample_size >= 3:
        return "low"
    else:
        return "insufficient"


def calculate_improvement(insights: dict) -> Optional[float]:
    """Calculate improvement of best vs worst strategy."""
    stats = insights["strategy_stats"]
    if len(stats) < 2:
        return None
    
    # Filter to strategies with enough data
    valid_stats = [s for s in stats if s["total_interventions"] >= 3]
    if len(valid_stats) < 2:
        return None
    
    best_rate = max(s["completion_rate"] for s in valid_stats)
    worst_rate = min(s["completion_rate"] for s in valid_stats)
    
    if worst_rate == 0:
        return None
    
    improvement = ((best_rate - worst_rate) / worst_rate) * 100
    return round(improvement, 1)
