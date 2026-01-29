"""
Resolution Lab - Intervention Generator Service
Generates personalized motivation messages using LLM with Opik tracing.

Now includes custom Opik evaluators for comprehensive message quality assessment.
"""

import opik
from opik import opik_context
import litellm
from typing import Optional
from datetime import datetime

import sys
sys.path.append('..')
from config import get_settings
from models.schemas import InterventionStrategy
from services.evaluators import sync_message_evaluator

settings = get_settings()


# ===================
# Intervention Prompts
# ===================

STRATEGY_PROMPTS = {
    InterventionStrategy.GENTLE_REMINDER: """
You are a friendly, supportive coach. Generate a warm, gentle reminder about the user's goal.
Keep it light and encouraging. Use a friendly emoji if appropriate.
Maximum 2 sentences.
""",
    
    InterventionStrategy.ACCOUNTABILITY: """
You are a direct accountability partner. Ask the user clearly and directly if they completed their goal.
Be respectful but firm. Request a clear Yes/No response.
Maximum 2 sentences.
""",
    
    InterventionStrategy.STREAK_GAMIFICATION: """
You are a gamification coach focused on streaks and progress. 
Emphasize the user's current streak and the importance of not breaking it.
Use fire/streak emojis. Make it feel like a game.
Maximum 2 sentences.
""",
    
    InterventionStrategy.SOCIAL_COMPARISON: """
You are sharing social proof and comparison data.
Mention that a percentage of similar users completed their goal today (use a realistic percentage like 65-80%).
Make the user feel they can be part of the successful group.
Maximum 2 sentences.
""",
    
    InterventionStrategy.LOSS_AVERSION: """
You are highlighting what the user might lose if they skip today.
Frame the message around potential loss of progress, momentum, or their streak.
Be motivating through the fear of loss, but not harsh.
Maximum 2 sentences.
""",
    
    InterventionStrategy.REWARD_PREVIEW: """
You are focusing on the rewards and benefits of completing the goal.
Paint a picture of how good they'll feel or what progress they'll make.
Make the reward tangible and immediate.
Maximum 2 sentences.
""",
    
    InterventionStrategy.IDENTITY_REINFORCEMENT: """
You are reinforcing the user's identity as someone who achieves this goal.
Use phrases like "You're becoming someone who..." or "This is who you are now."
Connect the action to their identity transformation.
Maximum 2 sentences.
""",
    
    InterventionStrategy.MICRO_COMMITMENT: """
You are asking for a tiny, minimal commitment.
Ask if they can commit to just 5 minutes or the smallest possible version of their goal.
Make it feel easy and achievable.
Maximum 2 sentences.
""",
}


SYSTEM_PROMPT = """You are Resolution Lab, an AI coach helping users achieve their goals.
Your task is to generate a short, personalized motivation message.

Rules:
1. Be concise - maximum 2 sentences
2. Be personal - use "you" language
3. Match the strategy style exactly
4. Reference the specific goal naturally
5. Current time awareness - if morning, afternoon, or evening, acknowledge it subtly
6. Never be preachy or lecture the user
7. Sound human, not robotic

Output ONLY the message text, nothing else."""


@opik.track(name="generate_intervention_message")
def generate_intervention_message(
    goal_title: str,
    goal_description: Optional[str],
    strategy: InterventionStrategy,
    current_streak: int = 0,
    user_name: Optional[str] = None,
    time_of_day: Optional[str] = None,
    include_evaluation: bool = True,
) -> dict:
    """
    Generate a personalized intervention message using LLM.

    This function is tracked by Opik for observability.
    All LLM calls are automatically traced via litellm callback.
    Now includes custom Opik evaluators for quality assessment.

    Args:
        goal_title: The user's goal title
        goal_description: Optional goal description for context
        strategy: The motivation strategy to use
        current_streak: User's current streak count
        user_name: Optional user's name for personalization
        time_of_day: Optional time context (morning/afternoon/evening)
        include_evaluation: Whether to run quality evaluation (default True)

    Returns:
        dict with message, evaluation scores, and metadata
    """
    # Build the strategy-specific prompt
    strategy_instruction = STRATEGY_PROMPTS.get(
        strategy,
        STRATEGY_PROMPTS[InterventionStrategy.GENTLE_REMINDER]
    )

    # Build context
    context_parts = [f"Goal: {goal_title}"]
    if goal_description:
        context_parts.append(f"Description: {goal_description}")
    if current_streak > 0:
        context_parts.append(f"Current streak: {current_streak} days")
    if user_name:
        context_parts.append(f"User's name: {user_name}")
    if time_of_day:
        context_parts.append(f"Time of day: {time_of_day}")

    context = "\n".join(context_parts)

    user_prompt = f"""Strategy to use:
{strategy_instruction}

Context:
{context}

Generate the intervention message now:"""

    try:
        # LLM call - automatically traced by Opik via litellm callback
        response = litellm.completion(
            model=settings.llm_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=150,
            temperature=0.7,
        )

        message = response.choices[0].message.content.strip()

        # Run custom Opik evaluators
        evaluation = None
        if include_evaluation:
            user_context = {"streak": current_streak} if current_streak > 0 else None
            evaluation = sync_message_evaluator.evaluate(
                message=message,
                strategy=strategy,
                goal_title=goal_title,
                user_context=user_context
            )

        # Log to Opik trace (metadata + feedback scores)
        try:
            # Build feedback scores list
            feedback_scores = []
            if evaluation:
                feedback_scores = [
                    {
                        "name": "overall_message_quality",
                        "value": round(evaluation["overall_score"], 3),
                        "reason": f"Grade: {evaluation['grade']}"
                    }
                ]
                # Add individual evaluator scores
                for eval_name, score in evaluation["individual_scores"].items():
                    feedback_scores.append({
                        "name": eval_name,
                        "value": round(score, 3),
                        "reason": f"Component score for {eval_name}"
                    })

            # Update trace with metadata and feedback scores
            opik_context.update_current_trace(
                metadata={
                    "strategy": strategy.value,
                    "goal_title": goal_title,
                    "current_streak": current_streak,
                    "message_length": len(message),
                    "evaluation_grade": evaluation["grade"] if evaluation else None,
                    "evaluation_score": evaluation["overall_score"] if evaluation else None,
                },
                feedback_scores=feedback_scores if feedback_scores else None
            )
            if feedback_scores:
                print(f"✅ Logged {len(feedback_scores)} feedback scores to Opik")
        except Exception as e:
            print(f"❌ Failed to log to Opik: {e}")

        return {
            "message": message,
            "strategy": strategy.value,
            "evaluation": evaluation,
            "metadata": {
                "goal_title": goal_title,
                "current_streak": current_streak,
                "time_of_day": time_of_day
            }
        }

    except Exception as e:
        # Log error and return fallback message
        fallback_message = get_fallback_message(goal_title, strategy)

        # Run evaluators on fallback message (they're rule-based, don't need LLM)
        evaluation = None
        if include_evaluation:
            try:
                user_context = {"streak": current_streak} if current_streak > 0 else None
                evaluation = sync_message_evaluator.evaluate(
                    message=fallback_message,
                    strategy=strategy,
                    goal_title=goal_title,
                    user_context=user_context
                )
            except:
                pass  # If evaluation fails, continue without it

        try:
            # Build feedback scores list for fallback
            feedback_scores = []
            if evaluation:
                feedback_scores = [
                    {
                        "name": "overall_message_quality",
                        "value": round(evaluation["overall_score"], 3),
                        "reason": f"Grade: {evaluation['grade']} (fallback message)"
                    }
                ]
                # Add individual evaluator scores
                for eval_name, score in evaluation["individual_scores"].items():
                    feedback_scores.append({
                        "name": eval_name,
                        "value": round(score, 3),
                        "reason": f"Component score for {eval_name} (fallback)"
                    })

            # Update trace with metadata and feedback scores
            opik_context.update_current_trace(
                metadata={
                    "error": str(e),
                    "strategy": strategy.value,
                    "is_fallback": True,
                    "evaluation_grade": evaluation["grade"] if evaluation else None,
                    "evaluation_score": evaluation["overall_score"] if evaluation else None,
                },
                feedback_scores=feedback_scores if feedback_scores else None
            )
            if feedback_scores:
                print(f"✅ Logged {len(feedback_scores)} feedback scores to Opik (fallback)")
        except Exception as ex:
            print(f"❌ Failed to log to Opik (fallback): {ex}")

        return {
            "message": fallback_message,
            "strategy": strategy.value,
            "evaluation": evaluation,
            "metadata": {
                "goal_title": goal_title,
                "current_streak": current_streak,
                "time_of_day": time_of_day,
                "is_fallback": True,
                "error": str(e)
            }
        }


def get_fallback_message(goal_title: str, strategy: InterventionStrategy) -> str:
    """Return a fallback message if LLM fails."""
    fallbacks = {
        InterventionStrategy.GENTLE_REMINDER: f"Hey! Just a friendly reminder about your goal: {goal_title} 🌟",
        InterventionStrategy.ACCOUNTABILITY: f"Quick check-in: Did you complete '{goal_title}' today? Yes or No?",
        InterventionStrategy.STREAK_GAMIFICATION: f"🔥 Don't break your streak! Time to work on: {goal_title}",
        InterventionStrategy.SOCIAL_COMPARISON: f"72% of users with similar goals completed theirs today. Join them with: {goal_title}",
        InterventionStrategy.LOSS_AVERSION: f"Don't lose your progress! Your goal '{goal_title}' is waiting.",
        InterventionStrategy.REWARD_PREVIEW: f"Imagine how great you'll feel after completing: {goal_title}",
        InterventionStrategy.IDENTITY_REINFORCEMENT: f"You're becoming someone who achieves their goals. Prove it with: {goal_title}",
        InterventionStrategy.MICRO_COMMITMENT: f"Can you commit to just 5 minutes on '{goal_title}'? That's all I ask.",
    }
    return fallbacks.get(strategy, f"Time to work on: {goal_title}")


@opik.track(name="batch_generate_interventions")
def batch_generate_interventions(
    goal_title: str,
    goal_description: Optional[str],
    strategies: list[InterventionStrategy],
    include_evaluation: bool = True,
) -> dict[InterventionStrategy, dict]:
    """
    Generate intervention messages for multiple strategies at once.
    Useful for A/B testing or pre-generating messages.

    Now includes evaluation scores for each generated message.

    Returns:
        Dict mapping strategy to generation result (message + evaluation)
    """
    results = {}
    for strategy in strategies:
        result = generate_intervention_message(
            goal_title=goal_title,
            goal_description=goal_description,
            strategy=strategy,
            include_evaluation=include_evaluation,
        )
        results[strategy] = result

    # Log batch summary to Opik
    if include_evaluation:
        avg_score = sum(
            r["evaluation"]["overall_score"]
            for r in results.values()
            if r.get("evaluation")
        ) / max(len([r for r in results.values() if r.get("evaluation")]), 1)

        grades = [r["evaluation"]["grade"] for r in results.values() if r.get("evaluation")]

        try:
            opik_context.update_current_trace(
                metadata={
                    "batch_size": len(strategies),
                    "avg_evaluation_score": round(avg_score, 3),
                    "grades_distribution": {g: grades.count(g) for g in set(grades)},
                }
            )
        except:
            pass

    return results


# ===================
# Testing
# ===================

def test_generator():
    """Test the intervention generator with custom evaluators."""
    print("Testing Intervention Generator with Custom Opik Evaluators...")
    print("=" * 60)

    goal = "Exercise for 30 minutes"
    description = "Daily workout routine to stay healthy"

    for strategy in InterventionStrategy:
        print(f"\n📨 Strategy: {strategy.value}")
        print("-" * 50)
        result = generate_intervention_message(
            goal_title=goal,
            goal_description=description,
            strategy=strategy,
            current_streak=5,
            include_evaluation=True,
        )
        print(f"Message: {result['message']}")

        if result.get("evaluation"):
            eval_data = result["evaluation"]
            print(f"\n📊 Evaluation:")
            print(f"   Grade: {eval_data['grade']}")
            print(f"   Overall Score: {eval_data['overall_score']:.2f}")
            print(f"   Scores:")
            for key, score in eval_data["individual_scores"].items():
                print(f"      - {key}: {score:.2f}")
            if eval_data.get("top_suggestions"):
                print(f"   Suggestions:")
                for suggestion in eval_data["top_suggestions"][:2]:
                    print(f"      • {suggestion}")

    print("\n" + "=" * 60)
    print("✅ Generator test complete with evaluations!")


if __name__ == "__main__":
    test_generator()
