"""
Resolution Lab - Analysis Engine Service
Handles sentiment analysis, effectiveness scoring, and Opik evaluation metrics.

Now includes custom Opik evaluators for insight quality assessment.
"""

import json
import opik
import litellm
from typing import Optional
from datetime import datetime

import sys
sys.path.append('..')
from config import get_settings
from models.schemas import UserSentiment, InterventionStrategy
from services.evaluators import insight_quality_evaluator

settings = get_settings()


# ===================
# LLM-as-Judge Prompts
# ===================

SENTIMENT_JUDGE_PROMPT = """You are an expert at analyzing user sentiment in response to motivational messages.

Analyze the user's response to determine their emotional reaction to the intervention message.

Intervention sent: {intervention_message}
User's response: {user_response}

Evaluate and return a JSON object with:
1. "sentiment": One of "positive", "neutral", or "negative"
   - positive: User seems motivated, grateful, engaged, or enthusiastic
   - neutral: User acknowledged but showed no strong emotion
   - negative: User seems annoyed, frustrated, dismissive, or disengaged

2. "helpfulness": One of "helpful", "neutral", or "annoying"
   - helpful: The intervention seemed to motivate the user
   - neutral: No clear impact either way
   - annoying: The intervention seemed to bother the user

3. "confidence": A number from 0.0 to 1.0 indicating your confidence in this assessment

4. "reasoning": A brief explanation (1 sentence)

Return ONLY valid JSON, no other text."""


GOAL_COMPLETION_JUDGE_PROMPT = """You are an expert at determining whether a user has completed their goal based on their response.

Goal: {goal_title}
User's response: {user_response}

Determine if the user completed their goal. Return a JSON object with:
1. "completed": true or false
2. "confidence": A number from 0.0 to 1.0
3. "evidence": Brief quote or reasoning from the response

Return ONLY valid JSON, no other text."""


# ===================
# LLM-as-Judge Functions
# ===================

@opik.track(name="analyze_user_sentiment")
def analyze_user_sentiment(
    intervention_message: str,
    user_response: str,
) -> dict:
    """
    Use LLM-as-judge to analyze user's sentiment toward an intervention.
    
    This creates rich evaluation data in Opik for understanding
    which intervention styles resonate with users.
    
    Returns:
        Dict with sentiment, helpfulness, confidence, and reasoning
    """
    prompt = SENTIMENT_JUDGE_PROMPT.format(
        intervention_message=intervention_message,
        user_response=user_response
    )
    
    try:
        response = litellm.completion(
            model=settings.llm_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.1,  # Low temp for consistent judgment
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Parse JSON response
        # Handle potential markdown code blocks
        if result_text.startswith("```"):
            result_text = result_text.split("```")[1]
            if result_text.startswith("json"):
                result_text = result_text[4:]
        
        result = json.loads(result_text)
        
        # Validate and normalize
        result["sentiment"] = result.get("sentiment", "neutral").lower()
        if result["sentiment"] not in ["positive", "neutral", "negative"]:
            result["sentiment"] = "neutral"
        
        result["helpfulness"] = result.get("helpfulness", "neutral").lower()
        result["confidence"] = float(result.get("confidence", 0.5))
        result["reasoning"] = result.get("reasoning", "")
        
        # Log to Opik span
        try:
            span = opik.get_current_span()
            if span:
                span.log_metadata({
                    "sentiment": result["sentiment"],
                    "helpfulness": result["helpfulness"],
                    "confidence": result["confidence"],
                    "intervention_length": len(intervention_message),
                    "response_length": len(user_response),
                })
        except:
            pass
        
        return result
        
    except json.JSONDecodeError:
        return {
            "sentiment": "neutral",
            "helpfulness": "neutral", 
            "confidence": 0.0,
            "reasoning": "Failed to parse LLM response"
        }
    except Exception as e:
        return {
            "sentiment": "neutral",
            "helpfulness": "neutral",
            "confidence": 0.0,
            "reasoning": f"Error: {str(e)}"
        }


@opik.track(name="judge_goal_completion")
def judge_goal_completion(
    goal_title: str,
    user_response: str,
) -> dict:
    """
    Use LLM-as-judge to determine if user completed their goal.
    
    Useful when user gives a free-text response instead of Yes/No.
    
    Returns:
        Dict with completed (bool), confidence, and evidence
    """
    prompt = GOAL_COMPLETION_JUDGE_PROMPT.format(
        goal_title=goal_title,
        user_response=user_response
    )
    
    try:
        response = litellm.completion(
            model=settings.llm_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=150,
            temperature=0.1,
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Handle markdown code blocks
        if result_text.startswith("```"):
            result_text = result_text.split("```")[1]
            if result_text.startswith("json"):
                result_text = result_text[4:]
        
        result = json.loads(result_text)
        
        result["completed"] = bool(result.get("completed", False))
        result["confidence"] = float(result.get("confidence", 0.5))
        result["evidence"] = result.get("evidence", "")
        
        return result
        
    except Exception as e:
        # Conservative fallback - don't assume completion
        return {
            "completed": False,
            "confidence": 0.0,
            "evidence": f"Error: {str(e)}"
        }


# ===================
# Opik Custom Metrics
# ===================

class InterventionEffectivenessMetric:
    """
    Custom Opik metric for measuring intervention effectiveness.
    
    This metric can be used in Opik experiments to compare
    different intervention strategies systematically.
    """
    
    name = "intervention_effectiveness"
    
    def score(
        self,
        intervention_type: str,
        user_completed_goal: bool,
        response_time_seconds: Optional[float] = None,
        user_sentiment: str = "neutral"
    ) -> float:
        """
        Calculate effectiveness score (0.0 to 1.0).
        
        Composite score:
        - 60% weight: Goal completion
        - 20% weight: Response speed
        - 20% weight: User sentiment
        """
        # Completion score
        completion_score = 1.0 if user_completed_goal else 0.0
        
        # Speed score (decay over 1 hour)
        if response_time_seconds is not None:
            speed_score = max(0.0, 1.0 - (response_time_seconds / 3600))
        else:
            speed_score = 0.5
        
        # Sentiment score
        sentiment_map = {"positive": 1.0, "neutral": 0.5, "negative": 0.0}
        sentiment_score = sentiment_map.get(user_sentiment.lower(), 0.5)
        
        # Weighted composite
        return (0.6 * completion_score) + (0.2 * speed_score) + (0.2 * sentiment_score)


class EngagementMetric:
    """
    Metric for measuring user engagement with interventions.
    """
    
    name = "user_engagement"
    
    def score(
        self,
        response_time_seconds: Optional[float],
        response_length: int,
        sentiment: str
    ) -> float:
        """
        Calculate engagement score (0.0 to 1.0).
        
        Based on:
        - How quickly they responded
        - How much they wrote
        - Their sentiment
        """
        # Speed component (responded within 30 min = high engagement)
        if response_time_seconds is None:
            speed_score = 0.0
        elif response_time_seconds < 1800:  # 30 minutes
            speed_score = 1.0
        elif response_time_seconds < 3600:  # 1 hour
            speed_score = 0.7
        elif response_time_seconds < 7200:  # 2 hours
            speed_score = 0.4
        else:
            speed_score = 0.2
        
        # Response length component
        if response_length > 100:
            length_score = 1.0
        elif response_length > 50:
            length_score = 0.7
        elif response_length > 10:
            length_score = 0.4
        else:
            length_score = 0.2
        
        # Sentiment component
        sentiment_map = {"positive": 1.0, "neutral": 0.5, "negative": 0.3}
        sentiment_score = sentiment_map.get(sentiment.lower(), 0.5)
        
        # Weighted average
        return (0.4 * speed_score) + (0.3 * length_score) + (0.3 * sentiment_score)


# ===================
# Aggregate Analysis
# ===================

@opik.track(name="generate_user_recommendation")
def generate_user_recommendation(
    strategy_stats: list[dict],
    total_interventions: int,
    include_evaluation: bool = True,
) -> dict:
    """
    Generate a personalized recommendation based on experiment data.

    Uses LLM to create a human-readable insight about what motivates the user.
    Now includes custom Opik evaluators for insight quality assessment.

    Returns:
        dict with insight text, evaluation scores, and metadata
    """
    if total_interventions < 5:
        return {
            "insight": "Keep going! We need more data to understand what motivates you best. Try responding to a few more check-ins.",
            "evaluation": None,
            "is_early_stage": True,
            "data_points": total_interventions
        }

    if not strategy_stats:
        return {
            "insight": "No strategy data available yet. Complete some check-ins to discover your motivation patterns.",
            "evaluation": None,
            "is_early_stage": True,
            "data_points": 0
        }

    # Build context for LLM
    stats_text = "\n".join([
        f"- {s['strategy']}: {s['completion_rate']*100:.0f}% completion rate, {s['total_interventions']} samples"
        for s in strategy_stats[:5]  # Top 5
    ])

    best = strategy_stats[0] if strategy_stats else None
    worst = strategy_stats[-1] if len(strategy_stats) > 1 else None

    prompt = f"""Based on this user's motivation experiment data, write a brief, personalized insight.

Strategy Performance:
{stats_text}

Best performing: {best['strategy'] if best else 'Unknown'} ({best['completion_rate']*100:.0f}% success)
Worst performing: {worst['strategy'] if worst else 'Unknown'} ({worst['completion_rate']*100:.0f}% success)
Total data points: {total_interventions}

Write 2-3 sentences that:
1. Highlight what type of motivation works best for them
2. Give a specific, actionable insight
3. Sound personal and encouraging

Example: "You respond best to direct accountability - when asked point-blank if you did the thing, you're 73% more likely to have done it. Gentle reminders seem to fade into the background for you. Consider setting up accountability check-ins with a friend too!"

Write the insight now:"""

    try:
        response = litellm.completion(
            model=settings.llm_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.7,
        )

        insight = response.choices[0].message.content.strip()

        # Run custom Opik evaluator for insight quality
        evaluation = None
        if include_evaluation:
            evaluation = insight_quality_evaluator.score(
                insight=insight,
                data_points=total_interventions,
                best_strategy=best['strategy'] if best else ""
            )

        # Log to Opik
        try:
            span = opik.get_current_span()
            if span:
                span.log_metadata({
                    "total_interventions": total_interventions,
                    "best_strategy": best['strategy'] if best else None,
                    "best_rate": best['completion_rate'] if best else None,
                    "insight_length": len(insight),
                    "evaluation_grade": evaluation["grade"] if evaluation else None,
                    "evaluation_score": evaluation["score"] if evaluation else None,
                })
        except:
            pass

        return {
            "insight": insight,
            "evaluation": evaluation,
            "is_early_stage": False,
            "data_points": total_interventions,
            "best_strategy": best['strategy'] if best else None,
            "best_rate": best['completion_rate'] if best else None,
        }

    except Exception as e:
        # Fallback to template-based recommendation
        if best:
            fallback_insight = f"Based on {total_interventions} check-ins, {best['strategy'].replace('_', ' ')} works best for you with a {best['completion_rate']*100:.0f}% success rate. Keep it up!"
        else:
            fallback_insight = "Keep responding to check-ins to discover your motivation patterns!"

        return {
            "insight": fallback_insight,
            "evaluation": None,
            "is_early_stage": False,
            "is_fallback": True,
            "error": str(e),
            "data_points": total_interventions
        }


# ===================
# Testing
# ===================

def test_analysis_engine():
    """Test the analysis engine with custom evaluators."""
    print("Testing Analysis Engine with Custom Opik Evaluators...")
    print("=" * 60)

    # Test sentiment analysis
    print("\n📊 Testing Sentiment Analysis:")
    result = analyze_user_sentiment(
        intervention_message="Did you exercise today? Quick check-in!",
        user_response="Yes! Just finished a 30 minute run, feeling great!"
    )
    print(f"  Sentiment: {result['sentiment']}")
    print(f"  Helpfulness: {result['helpfulness']}")
    print(f"  Confidence: {result['confidence']}")
    print(f"  Reasoning: {result['reasoning']}")

    # Test goal completion judgment
    print("\n📊 Testing Goal Completion Judge:")
    result = judge_goal_completion(
        goal_title="Exercise for 30 minutes",
        user_response="Went for a walk but only did 15 minutes because it started raining"
    )
    print(f"  Completed: {result['completed']}")
    print(f"  Confidence: {result['confidence']}")
    print(f"  Evidence: {result['evidence']}")

    # Test effectiveness metric
    print("\n📊 Testing Effectiveness Metric:")
    metric = InterventionEffectivenessMetric()
    score = metric.score(
        intervention_type="accountability",
        user_completed_goal=True,
        response_time_seconds=1800,  # 30 minutes
        user_sentiment="positive"
    )
    print(f"  Effectiveness Score: {score:.3f}")

    # Test recommendation generation with evaluation
    print("\n📊 Testing User Recommendation with Insight Evaluator:")
    mock_stats = [
        {"strategy": "accountability", "completion_rate": 0.85, "total_interventions": 12},
        {"strategy": "streak_gamification", "completion_rate": 0.72, "total_interventions": 8},
        {"strategy": "gentle_reminder", "completion_rate": 0.45, "total_interventions": 10},
    ]
    result = generate_user_recommendation(
        strategy_stats=mock_stats,
        total_interventions=30,
        include_evaluation=True
    )
    print(f"  Insight: {result['insight']}")
    if result.get("evaluation"):
        eval_data = result["evaluation"]
        print(f"\n  📈 Evaluation:")
        print(f"     Grade: {eval_data['grade']}")
        print(f"     Score: {eval_data['score']:.2f}")
        print(f"     Breakdown:")
        for key, value in eval_data.get("breakdown", {}).items():
            print(f"        - {key}: {value:.2f}")

    print("\n" + "=" * 60)
    print("✅ Analysis engine test complete with evaluations!")


if __name__ == "__main__":
    test_analysis_engine()
