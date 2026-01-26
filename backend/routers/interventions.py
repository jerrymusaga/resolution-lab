"""
Resolution Lab - Interventions Router
API endpoints for generating and tracking motivational interventions.
Uses Supabase for persistence.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query
import opik

from models.schemas import (
    Intervention,
    InterventionCreate,
    InterventionResponse,
    InterventionStrategy,
    OutcomeCreate,
    Outcome,
    APIResponse,
)
from services.intervention_generator import generate_intervention_message, get_fallback_message
from services.experiment_engine import experiment_engine
from services.analysis_engine import analyze_user_sentiment
from routers.goals import get_goal_by_id, update_goal_stats

# Import database service
try:
    from services.database import (
        DB_ENABLED,
        create_intervention as db_create_intervention,
        get_intervention_by_id as db_get_intervention_by_id,
        get_user_interventions as db_get_user_interventions,
        update_intervention_outcome as db_update_intervention_outcome,
    )
except ImportError:
    DB_ENABLED = False

router = APIRouter(prefix="/interventions", tags=["Interventions"])


# ===================
# Helper Functions
# ===================

def _db_row_to_intervention(row: dict) -> Intervention:
    """Convert database row to Intervention model."""
    created_at = row.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    elif created_at is None:
        created_at = datetime.utcnow()

    return Intervention(
        id=UUID(row["id"]),
        user_id=UUID(row["user_id"]),
        goal_id=UUID(row["goal_id"]) if row.get("goal_id") else None,
        strategy=InterventionStrategy(row["strategy"]),
        message=row["message"],
        sent_at=created_at,
        opik_trace_id=row.get("opik_trace_id"),
    )


# ===================
# API Endpoints
# ===================

@router.post("/generate", response_model=InterventionResponse)
@opik.track(name="api_generate_intervention")
async def generate_intervention(
    goal_id: UUID,
    user_id: str = Query(..., description="User ID"),
    force_strategy: Optional[InterventionStrategy] = Query(
        None,
        description="Force a specific strategy (for testing). If not provided, the experiment engine chooses."
    ),
):
    """
    Generate a new intervention for a goal.
    """
    # Get the goal
    goal = get_goal_by_id(str(goal_id))
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if str(goal.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Select strategy using experiment engine (or use forced strategy)
    if force_strategy:
        strategy = force_strategy
    else:
        strategy_result = experiment_engine.select_strategy(user_id)
        strategy = InterventionStrategy(strategy_result["strategy"])

    # Generate personalized message using LLM
    try:
        result = generate_intervention_message(
            goal_title=goal.title,
            goal_description=goal.description,
            strategy=strategy,
            current_streak=goal.current_streak or 0,
        )
        # Extract message string from dict result
        message = result["message"] if isinstance(result, dict) else result
    except Exception as e:
        # Fallback if LLM fails
        message = get_fallback_message(goal.title, strategy)

    now = datetime.utcnow()

    # Store in database
    if DB_ENABLED:
        db_intervention = db_create_intervention(
            user_id=user_id,
            strategy=strategy.value,
            message=message,
            goal_id=str(goal_id),
            formula_active=False,
        )
        if db_intervention:
            intervention_id = UUID(db_intervention["id"])
        else:
            raise HTTPException(status_code=500, detail="Failed to create intervention")
    else:
        intervention_id = uuid4()

    # Return response
    return InterventionResponse(
        intervention_id=intervention_id,
        goal_title=goal.title,
        strategy=strategy,
        message=message,
        sent_at=now,
    )


@router.post("/check-in", response_model=Outcome)
@opik.track(name="api_record_checkin")
async def record_check_in(
    outcome: OutcomeCreate,
    user_id: str = Query(..., description="User ID"),
):
    """
    Record a user's check-in response to an intervention.
    """
    # Get the intervention
    if DB_ENABLED:
        db_intervention = db_get_intervention_by_id(str(outcome.intervention_id))
        if not db_intervention:
            raise HTTPException(status_code=404, detail="Intervention not found")
        if db_intervention["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        intervention_strategy = InterventionStrategy(db_intervention["strategy"])
        intervention_message = db_intervention["message"]
        intervention_goal_id = db_intervention.get("goal_id")
        created_at_str = db_intervention.get("created_at")
        if isinstance(created_at_str, str):
            intervention_sent_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
        else:
            intervention_sent_at = datetime.utcnow()
    else:
        raise HTTPException(status_code=500, detail="Database not configured")

    # Calculate response time
    now = datetime.utcnow()
    response_time_seconds = int((now - intervention_sent_at).total_seconds())

    # Analyze sentiment if user provided feedback
    sentiment = "neutral"
    if outcome.user_feedback:
        try:
            sentiment_result = analyze_user_sentiment(
                intervention_message=intervention_message,
                user_response=outcome.user_feedback,
            )
            sentiment = sentiment_result.get("sentiment", "neutral")
        except Exception:
            sentiment = "neutral"

    # Record outcome in experiment engine
    effectiveness = experiment_engine.record_outcome(
        user_id=user_id,
        strategy=intervention_strategy,
        completed=outcome.completed,
        response_time_seconds=response_time_seconds,
        sentiment=sentiment,
    )

    # Update goal statistics
    if intervention_goal_id:
        update_goal_stats(str(intervention_goal_id), outcome.completed)

    # Update intervention in database
    if DB_ENABLED:
        db_update_intervention_outcome(
            intervention_id=str(outcome.intervention_id),
            outcome="completed" if outcome.completed else "dismissed",
            effectiveness_score=effectiveness,
        )

    # Create outcome record
    outcome_id = uuid4()
    outcome_record = Outcome(
        id=outcome_id,
        intervention_id=outcome.intervention_id,
        user_id=UUID(user_id),
        goal_id=UUID(intervention_goal_id) if intervention_goal_id else None,
        completed=outcome.completed,
        response_time_seconds=response_time_seconds,
        user_feedback=outcome.user_feedback,
        recorded_at=now,
    )

    return outcome_record


@router.get("/history", response_model=List[Intervention])
async def get_intervention_history(
    user_id: str = Query(..., description="User ID"),
    goal_id: Optional[UUID] = Query(None, description="Filter by goal"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Get intervention history for a user."""
    if DB_ENABLED:
        goal_id_str = str(goal_id) if goal_id else None
        db_interventions = db_get_user_interventions(user_id, limit=limit + offset, goal_id=goal_id_str)
        interventions = [_db_row_to_intervention(row) for row in db_interventions]
        return interventions[offset:offset + limit]
    else:
        return []


@router.get("/strategies", response_model=dict)
async def list_strategies():
    """List all available intervention strategies with descriptions."""
    strategies = {
        InterventionStrategy.GENTLE_REMINDER: {
            "name": "Gentle Reminder",
            "description": "Warm, friendly nudges that don't pressure",
            "example": "Hey! Just a friendly reminder about your goal today",
        },
        InterventionStrategy.ACCOUNTABILITY: {
            "name": "Direct Accountability",
            "description": "Clear, direct check-ins asking if you did the thing",
            "example": "Did you complete your goal today? Yes or No?",
        },
        InterventionStrategy.STREAK_GAMIFICATION: {
            "name": "Streak & Gamification",
            "description": "Focus on maintaining streaks and progress",
            "example": "Day 5 streak! Don't break the chain.",
        },
        InterventionStrategy.SOCIAL_COMPARISON: {
            "name": "Social Proof",
            "description": "Compare to what others like you are doing",
            "example": "73% of similar users completed their goal today.",
        },
        InterventionStrategy.LOSS_AVERSION: {
            "name": "Loss Framing",
            "description": "Highlight what you might lose by skipping",
            "example": "You'll lose your 5-day progress if you skip today.",
        },
        InterventionStrategy.REWARD_PREVIEW: {
            "name": "Reward Preview",
            "description": "Focus on the benefits and rewards ahead",
            "example": "Complete today and you're 20% closer to your target!",
        },
        InterventionStrategy.IDENTITY_REINFORCEMENT: {
            "name": "Identity-Based",
            "description": "Connect the action to who you're becoming",
            "example": "You're becoming someone who exercises daily.",
        },
        InterventionStrategy.MICRO_COMMITMENT: {
            "name": "Micro-Commitment",
            "description": "Ask for just a tiny, easy commitment",
            "example": "Can you commit to just 5 minutes? That's all.",
        },
    }

    return {
        "strategies": strategies,
        "total": len(strategies),
    }


@router.get("/{intervention_id}", response_model=Intervention)
async def get_intervention(
    intervention_id: UUID,
    user_id: str = Query(..., description="User ID"),
):
    """Get a specific intervention by ID."""
    if DB_ENABLED:
        db_intervention = db_get_intervention_by_id(str(intervention_id))
        if not db_intervention:
            raise HTTPException(status_code=404, detail="Intervention not found")
        if db_intervention["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        return _db_row_to_intervention(db_intervention)
    else:
        raise HTTPException(status_code=500, detail="Database not configured")


# ===================
# Demo/Testing Endpoints
# ===================

@router.post("/demo/simulate", response_model=dict)
async def simulate_experiment(
    user_id: str = Query(..., description="User ID"),
    goal_title: str = Query("Exercise for 30 minutes", description="Goal title"),
    num_interventions: int = Query(10, ge=1, le=50, description="Number of interventions to simulate"),
    use_llm: bool = Query(False, description="Use LLM to generate messages (includes evaluations)"),
):
    """
    Simulate multiple interventions for demo purposes.
    """
    import random
    from services.evaluators import sync_message_evaluator

    results = []
    evaluation_summary = {
        "total_evaluated": 0,
        "average_score": 0.0,
        "grade_distribution": {"A": 0, "B": 0, "C": 0, "D": 0, "F": 0}
    }
    total_score = 0.0

    for i in range(num_interventions):
        # Select strategy
        strategy_result = experiment_engine.select_strategy(user_id)
        strategy = InterventionStrategy(strategy_result["strategy"])

        # Generate message
        message = None
        evaluation = None

        if use_llm:
            gen_result = generate_intervention_message(
                goal_title=goal_title,
                goal_description=None,
                strategy=strategy,
                include_evaluation=True,
            )
            message = gen_result["message"] if isinstance(gen_result, dict) else gen_result
            evaluation = gen_result.get("evaluation") if isinstance(gen_result, dict) else None

            if evaluation:
                evaluation_summary["total_evaluated"] += 1
                total_score += evaluation["overall_score"]
                grade = evaluation.get("grade", "C")
                if grade in evaluation_summary["grade_distribution"]:
                    evaluation_summary["grade_distribution"][grade] += 1
        else:
            message = get_fallback_message(goal_title, strategy)
            evaluation = sync_message_evaluator.evaluate(
                message=message,
                strategy=strategy,
                goal_title=goal_title,
            )
            evaluation_summary["total_evaluated"] += 1
            total_score += evaluation["overall_score"]
            grade = evaluation.get("grade", "C")
            if grade in evaluation_summary["grade_distribution"]:
                evaluation_summary["grade_distribution"][grade] += 1

        # Simulate outcome
        success_rates = {
            InterventionStrategy.ACCOUNTABILITY: 0.75,
            InterventionStrategy.STREAK_GAMIFICATION: 0.65,
            InterventionStrategy.IDENTITY_REINFORCEMENT: 0.60,
            InterventionStrategy.MICRO_COMMITMENT: 0.55,
            InterventionStrategy.LOSS_AVERSION: 0.50,
            InterventionStrategy.REWARD_PREVIEW: 0.45,
            InterventionStrategy.SOCIAL_COMPARISON: 0.40,
            InterventionStrategy.GENTLE_REMINDER: 0.30,
        }

        completed = random.random() < success_rates.get(strategy, 0.5)
        response_time = random.randint(300, 7200)
        sentiment = random.choice(["positive", "neutral", "negative"])

        # Record outcome
        effectiveness = experiment_engine.record_outcome(
            user_id=user_id,
            strategy=strategy,
            completed=completed,
            response_time_seconds=response_time,
            sentiment=sentiment,
        )

        result_item = {
            "iteration": i + 1,
            "strategy": strategy.value,
            "message": message,
            "completed": completed,
            "effectiveness": round(effectiveness, 3),
        }

        if evaluation:
            result_item["evaluation"] = {
                "grade": evaluation.get("grade"),
                "overall_score": evaluation.get("overall_score"),
                "individual_scores": evaluation.get("individual_scores"),
            }

        results.append(result_item)

    # Calculate average score
    if evaluation_summary["total_evaluated"] > 0:
        evaluation_summary["average_score"] = round(
            total_score / evaluation_summary["total_evaluated"], 3
        )

    # Get updated insights
    insights = experiment_engine.get_user_insights(user_id)

    return {
        "simulations": results,
        "insights": insights,
        "evaluation_summary": evaluation_summary,
    }
