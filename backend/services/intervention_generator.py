"""
Resolution Lab - Intervention Generator Service
Generates personalized motivation messages using LLM with Opik tracing.
"""

import opik
import litellm
from typing import Optional
from datetime import datetime

import sys
sys.path.append('..')
from config import get_settings
from models.schemas import InterventionStrategy

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
) -> str:
    """
    Generate a personalized intervention message using LLM.
    
    This function is tracked by Opik for observability.
    All LLM calls are automatically traced via litellm callback.
    
    Args:
        goal_title: The user's goal title
        goal_description: Optional goal description for context
        strategy: The motivation strategy to use
        current_streak: User's current streak count
        user_name: Optional user's name for personalization
        time_of_day: Optional time context (morning/afternoon/evening)
    
    Returns:
        Generated intervention message string
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
        
        # Log to Opik span
        opik.track_current_span().log_metadata({
            "strategy": strategy.value,
            "goal_title": goal_title,
            "current_streak": current_streak,
            "message_length": len(message),
        })
        
        return message
        
    except Exception as e:
        # Log error and return fallback message
        opik.track_current_span().log_metadata({
            "error": str(e),
            "strategy": strategy.value,
        })
        
        # Return strategy-specific fallback
        return get_fallback_message(goal_title, strategy)


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
) -> dict[InterventionStrategy, str]:
    """
    Generate intervention messages for multiple strategies at once.
    Useful for A/B testing or pre-generating messages.
    
    Returns:
        Dict mapping strategy to generated message
    """
    results = {}
    for strategy in strategies:
        message = generate_intervention_message(
            goal_title=goal_title,
            goal_description=goal_description,
            strategy=strategy,
        )
        results[strategy] = message
    return results


# ===================
# Testing
# ===================

def test_generator():
    """Test the intervention generator locally."""
    print("Testing Intervention Generator...")
    print("=" * 50)
    
    goal = "Exercise for 30 minutes"
    description = "Daily workout routine to stay healthy"
    
    for strategy in InterventionStrategy:
        print(f"\n📨 Strategy: {strategy.value}")
        print("-" * 40)
        message = generate_intervention_message(
            goal_title=goal,
            goal_description=description,
            strategy=strategy,
            current_streak=5,
        )
        print(f"Message: {message}")
    
    print("\n" + "=" * 50)
    print("✅ Generator test complete!")


if __name__ == "__main__":
    test_generator()
