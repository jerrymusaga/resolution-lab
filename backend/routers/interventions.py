"""
Resolution Lab - Interventions Router
API endpoints for generating and tracking motivational interventions.
Uses Supabase for persistence.
"""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query
import opik
from opik import opik_context
from opik.opik_context import get_current_trace_data

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
from services.celebration_image_generator import (
    generate_checkin_celebration,
    CelebrationImageResult,
    GENAI_AVAILABLE as CELEBRATION_IMAGE_AVAILABLE
)
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
        created_at = datetime.now(timezone.utc)

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

    # Set thread_id to group all traces for this goal together
    opik_context.update_current_trace(thread_id=f"goal_{goal_id}")

    # Select strategy using experiment engine (or use forced strategy)
    formula_active = False
    if force_strategy:
        strategy = force_strategy
    else:
        # Pass goal_id to enable per-goal formula selection
        strategy_result = experiment_engine.select_strategy(user_id, goal_id=str(goal_id))
        strategy = InterventionStrategy(strategy_result["strategy"])
        formula_active = strategy_result.get("formula_active", False)

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

    now = datetime.now(timezone.utc)

    # Store in database
    if DB_ENABLED:
        db_intervention = db_create_intervention(
            user_id=user_id,
            strategy=strategy.value,
            message=message,
            goal_id=str(goal_id),
            formula_active=formula_active,
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
            intervention_sent_at = datetime.now(timezone.utc)
    else:
        raise HTTPException(status_code=500, detail="Database not configured")

    # Set thread_id to group all traces for this goal together
    if intervention_goal_id:
        opik_context.update_current_trace(thread_id=f"goal_{intervention_goal_id}")

    # Calculate response time
    now = datetime.now(timezone.utc)
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

    # Log feedback scores to Opik
    try:
        trace_data = get_current_trace_data()
        if trace_data and trace_data.id:
            # Calculate engagement score (1.0 if completed, 0.5 if dismissed but responded)
            engagement_score = 1.0 if outcome.completed else 0.5

            # Calculate response time score (1.0 for < 1min, decreasing for longer)
            if response_time_seconds < 60:
                response_score = 1.0
            elif response_time_seconds < 300:  # 5 min
                response_score = 0.8
            elif response_time_seconds < 3600:  # 1 hour
                response_score = 0.5
            else:
                response_score = 0.3

            # Sentiment score
            sentiment_map = {"positive": 1.0, "neutral": 0.6, "negative": 0.2}
            sentiment_score = sentiment_map.get(sentiment, 0.6)

            client = opik.Opik()
            scores = [
                {"id": trace_data.id, "name": "user_engagement", "value": engagement_score, "reason": f"User {'completed' if outcome.completed else 'dismissed'} the goal"},
                {"id": trace_data.id, "name": "response_time_quality", "value": response_score, "reason": f"Response time: {response_time_seconds}s"},
                {"id": trace_data.id, "name": "user_sentiment", "value": sentiment_score, "reason": f"Sentiment: {sentiment}"},
                {"id": trace_data.id, "name": "strategy_effectiveness", "value": effectiveness, "reason": f"Strategy: {intervention_strategy.value}"},
            ]
            client.log_traces_feedback_scores(scores=scores)
            print(f"✅ Logged check-in feedback scores to trace {trace_data.id}")
    except Exception as e:
        print(f"❌ Failed to log check-in feedback scores: {e}")

    # Close thread if requested (required for thread-level feedback scores)
    if outcome.close_thread and intervention_goal_id:
        try:
            from services.thread_evaluator import get_thread_evaluator
            evaluator = get_thread_evaluator()
            close_result = evaluator.close_thread(f"goal_{intervention_goal_id}")
            if close_result.get("success"):
                print(f"✅ Closed thread goal_{intervention_goal_id} - ready for evaluation")
            else:
                print(f"⚠️ Could not close thread: {close_result.get('message')}")
        except Exception as e:
            print(f"❌ Failed to close thread: {e}")

    # Auto-evaluate thread after 5 check-ins for this goal
    CHECKIN_THRESHOLD_FOR_EVAL = 5
    if intervention_goal_id and DB_ENABLED:
        try:
            # Count check-ins for this goal (interventions with outcomes)
            goal_interventions = db_get_user_interventions(user_id, limit=100, goal_id=intervention_goal_id)
            checkins_with_outcome = [i for i in goal_interventions if i.get("outcome") is not None]
            checkin_count = len(checkins_with_outcome)

            if checkin_count >= CHECKIN_THRESHOLD_FOR_EVAL and checkin_count % CHECKIN_THRESHOLD_FOR_EVAL == 0:
                # Evaluate every 5 check-ins (5, 10, 15, etc.)
                print(f"📊 Reached {checkin_count} check-ins - triggering thread evaluation")
                from services.thread_evaluator import get_thread_evaluator, THREAD_EVAL_AVAILABLE
                if THREAD_EVAL_AVAILABLE:
                    evaluator = get_thread_evaluator()
                    eval_result = evaluator.evaluate_goal_thread(
                        goal_id=intervention_goal_id,
                        close_first=True  # Close thread before evaluation
                    )
                    if eval_result.status == "success":
                        print(f"✅ Thread evaluation complete: coherence={eval_result.coherence_score}, frustration={eval_result.frustration_score}")
                    else:
                        print(f"⚠️ Thread evaluation: {eval_result.status} - {eval_result.error_message}")
        except Exception as e:
            print(f"⚠️ Auto-evaluation check failed: {e}")

    # Generate celebration/encouragement image using Nano Banana
    if CELEBRATION_IMAGE_AVAILABLE and intervention_goal_id:
        try:
            # Get goal title for image generation
            goal = get_goal_by_id(intervention_goal_id, user_id)
            goal_title = goal.title if goal else "your goal"

            # Get current streak for the goal
            current_streak = goal.current_streak if goal else 0

            # Generate celebration image
            print(f"🎨 Generating {'celebration' if outcome.completed else 'encouragement'} image for: {goal_title}")
            image_result: CelebrationImageResult = await generate_checkin_celebration(
                goal_title=goal_title,
                completed=outcome.completed,
                current_streak=current_streak
            )

            if image_result.success:
                outcome_record.celebration_image = image_result.image_base64
                outcome_record.celebration_image_type = image_result.image_type.value
                outcome_record.celebration_image_grade = image_result.evaluation_grade
                print(f"✅ Generated {image_result.image_type.value} image (grade: {image_result.evaluation_grade})")
            else:
                print(f"⚠️ Image generation failed: {image_result.error_message}")

        except Exception as e:
            print(f"⚠️ Celebration image generation failed: {e}")
            # Don't fail the check-in if image generation fails

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


@router.post("/{intervention_id}/voice-play", response_model=APIResponse)
@opik.track(name="api_voice_play")
async def track_voice_play(
    intervention_id: UUID,
    user_id: str = Query(..., description="User ID"),
    auto_played: bool = Query(False, description="Whether voice was auto-played"),
):
    """
    Track when a user plays the voice for an intervention message.
    This helps analyze engagement with voice features.
    """
    if DB_ENABLED:
        db_intervention = db_get_intervention_by_id(str(intervention_id))
        if not db_intervention:
            raise HTTPException(status_code=404, detail="Intervention not found")
        if db_intervention["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        # Set thread_id to group all traces for this goal together
        goal_id = db_intervention.get("goal_id")
        if goal_id:
            opik_context.update_current_trace(thread_id=f"goal_{goal_id}")

    # Log to Opik for analytics
    try:
        # Update trace metadata
        opik_context.update_current_trace(
            metadata={
                "intervention_id": str(intervention_id),
                "user_id": user_id,
                "auto_played": auto_played,
                "strategy": db_intervention.get("strategy") if DB_ENABLED else None,
                "voice_played": 1,
                "voice_auto_played": 1 if auto_played else 0,
            }
        )

        # Log feedback score for voice engagement
        trace_data = get_current_trace_data()
        if trace_data and trace_data.id:
            client = opik.Opik()
            scores = [
                {
                    "id": trace_data.id,
                    "name": "voice_engagement",
                    "value": 1.0,
                    "reason": f"User {'auto-' if auto_played else 'manually '}played voice for motivation message"
                }
            ]
            client.log_traces_feedback_scores(scores=scores)
            print(f"✅ Logged voice engagement feedback to trace {trace_data.id}")
    except Exception as e:
        print(f"❌ Failed to log voice feedback: {e}")

    return APIResponse(
        success=True,
        message="Voice play tracked",
        data={"intervention_id": str(intervention_id), "auto_played": auto_played}
    )


# ===================
# Streaming/Vercel AI SDK Integration
# ===================

from pydantic import BaseModel as PydanticBaseModel

class StreamingLogRequest(PydanticBaseModel):
    """Request to log a streaming message from Vercel AI SDK."""
    user_id: str
    goal_title: str
    strategy: str
    message: str
    goal_id: Optional[str] = None
    thread_id: Optional[str] = None
    source: str = "vercel-ai-sdk"


@router.post("/log-streaming", response_model=APIResponse)
@opik.track(name="vercel_ai_sdk_streaming")
async def log_streaming_message(request: StreamingLogRequest):
    """
    Log a streaming message generated by Vercel AI SDK.

    This endpoint is called by the Next.js frontend after streaming completes
    to log the message to Opik for observability with thread support.
    """
    from services.evaluators import sync_message_evaluator

    # Set thread_id to group traces for this goal
    if request.thread_id:
        opik_context.update_current_trace(thread_id=request.thread_id)
    elif request.goal_id:
        opik_context.update_current_trace(thread_id=f"goal_{request.goal_id}")

    # Run evaluation on the message
    try:
        strategy_enum = InterventionStrategy(request.strategy)
    except ValueError:
        strategy_enum = InterventionStrategy.GENTLE_REMINDER

    evaluation = None
    try:
        evaluation = sync_message_evaluator.evaluate(
            message=request.message,
            strategy=strategy_enum,
            goal_title=request.goal_title,
        )
    except Exception as e:
        print(f"⚠️ Evaluation failed: {e}")

    # Log to Opik trace
    try:
        # Update trace metadata
        opik_context.update_current_trace(
            metadata={
                "source": request.source,
                "strategy": request.strategy,
                "goal_title": request.goal_title,
                "goal_id": request.goal_id,
                "message_length": len(request.message),
                "evaluation_grade": evaluation["grade"] if evaluation else None,
                "evaluation_score": evaluation["overall_score"] if evaluation else None,
            }
        )

        # Log feedback scores
        trace_data = get_current_trace_data()
        if trace_data and trace_data.id:
            client = opik.Opik()
            scores = []

            if evaluation:
                scores.append({
                    "id": trace_data.id,
                    "name": "streaming_message_quality",
                    "value": round(evaluation["overall_score"], 3),
                    "reason": f"Grade: {evaluation['grade']} (Vercel AI SDK)"
                })
                for eval_name, score in evaluation.get("individual_scores", {}).items():
                    scores.append({
                        "id": trace_data.id,
                        "name": f"streaming_{eval_name}",
                        "value": round(score, 3),
                        "reason": f"Component: {eval_name}"
                    })

            if scores:
                client.log_traces_feedback_scores(scores=scores)
                print(f"✅ Logged {len(scores)} streaming feedback scores to trace {trace_data.id}")

    except Exception as e:
        print(f"❌ Failed to log streaming message to Opik: {e}")

    # Optionally store in database
    if DB_ENABLED and request.goal_id:
        try:
            db_create_intervention(
                user_id=request.user_id,
                strategy=request.strategy,
                message=request.message,
                goal_id=request.goal_id,
                formula_active=False,
            )
        except Exception as e:
            print(f"⚠️ Failed to store streaming intervention in DB: {e}")

    return APIResponse(
        success=True,
        message="Streaming message logged to Opik",
        data={
            "evaluation": evaluation,
            "thread_id": request.thread_id or f"goal_{request.goal_id}" if request.goal_id else None,
        }
    )


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


# ===================
# Reminder Endpoints (Opik Traced)
# ===================

from services.reminder_service import get_reminder_service


class ReminderInteractionRequest(PydanticBaseModel):
    """Request to track reminder interaction."""
    goal_id: str
    interaction_type: str  # "viewed", "clicked", "dismissed"
    time_to_action_seconds: Optional[int] = None


@router.post("/reminders/track", response_model=APIResponse)
@opik.track(name="api_track_reminder")
async def track_reminder(
    request: ReminderInteractionRequest,
    user_id: str = Query(..., description="User ID"),
):
    """
    Track user interaction with a reminder notification.

    This is traced in Opik to measure reminder effectiveness:
    - Click-through rates
    - Time to action
    - Dismissal patterns

    Use this when:
    - User views a reminder banner
    - User clicks to check in from a reminder
    - User dismisses a reminder
    """
    service = get_reminder_service()

    result = service.track_reminder_interaction(
        user_id=user_id,
        goal_id=request.goal_id,
        interaction_type=request.interaction_type,
        time_to_action_seconds=request.time_to_action_seconds
    )

    return APIResponse(
        success=True,
        message=f"Reminder {request.interaction_type} tracked",
        data=result
    )


@router.get("/reminders/status", response_model=APIResponse)
@opik.track(name="api_get_reminder_status")
async def get_reminder_status(
    user_id: str = Query(..., description="User ID"),
):
    """
    Get reminder status for a user's goals.

    Returns which goals need check-in and generates appropriate reminder data.
    All calls are traced in Opik for analytics.
    """
    from routers.goals import list_goals_with_checkin_status

    # Get goals with check-in status
    goals = await list_goals_with_checkin_status(user_id=user_id)

    # Convert to dict format for reminder service
    goals_data = [
        {
            "id": g.id,
            "title": g.title,
            "status": g.status,
            "checked_in_today": g.checked_in_today,
            "can_check_in": g.can_check_in,
            "current_streak": g.current_streak,
        }
        for g in goals
    ]

    service = get_reminder_service()
    result = service.generate_reminder(user_id=user_id, goals=goals_data)

    return APIResponse(
        success=True,
        message=f"{result.reminder_count} goals need check-in",
        data={
            "goals_needing_checkin": result.goals_needing_checkin,
            "reminder_count": result.reminder_count,
            "reminder_message": result.reminder_message,
            "urgency_level": result.urgency_level,
        }
    )
