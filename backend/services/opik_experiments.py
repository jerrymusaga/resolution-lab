"""
Resolution Lab - Opik Experiments Integration

Uses Opik's Experiment feature to A/B test different prompt templates
and track which ones perform best.

This is a KEY DIFFERENTIATOR - shows advanced Opik usage beyond basic tracing.
"""

import opik
from opik import track, Opik
from opik.evaluation import metrics
from typing import Optional
import json
from datetime import datetime
import random

from models.schemas import InterventionStrategy


# Different prompt templates to A/B test
PROMPT_VARIANTS = {
    "concise": {
        "name": "Concise",
        "template": """Goal: {goal}
Strategy: {strategy}
Write a 1-2 sentence motivation message. Be brief and impactful.""",
        "description": "Short, punchy messages"
    },
    "empathetic": {
        "name": "Empathetic", 
        "template": """Goal: {goal}
Strategy: {strategy}
Write a warm, understanding motivation message. Acknowledge that change is hard, then encourage. 2-3 sentences.""",
        "description": "Warm, understanding tone"
    },
    "action_oriented": {
        "name": "Action-Oriented",
        "template": """Goal: {goal}
Strategy: {strategy}
Write a motivation message focused on specific next actions. Tell them exactly what to do first. 2 sentences.""",
        "description": "Focus on concrete actions"
    },
    "question_based": {
        "name": "Question-Based",
        "template": """Goal: {goal}
Strategy: {strategy}
Write a motivation message that asks a reflective question, then provides encouragement. 2 sentences.""",
        "description": "Uses questions to engage"
    }
}


class PromptExperiment:
    """
    Manages A/B testing of prompt variants using Opik Experiments.
    
    Each experiment run:
    1. Selects a prompt variant (explore/exploit)
    2. Generates message with that variant
    3. Tracks the result in Opik
    4. Updates variant performance stats
    """
    
    def __init__(self):
        self.variant_stats: dict[str, dict] = {
            variant_id: {
                "total_uses": 0,
                "total_score": 0.0,
                "avg_score": 0.0,
                "completions": 0
            }
            for variant_id in PROMPT_VARIANTS.keys()
        }
        self.epsilon = 0.3  # 30% exploration for prompts
    
    @track(name="prompt_experiment_select", tags=["experiment", "prompt"])
    def select_variant(self, user_id: str) -> dict:
        """
        Select a prompt variant using epsilon-greedy.
        
        Returns the selected variant with its template.
        """
        
        # Exploration: random variant
        if random.random() < self.epsilon:
            variant_id = random.choice(list(PROMPT_VARIANTS.keys()))
            selection_reason = "exploration"
        else:
            # Exploitation: best performing variant
            best_variant = max(
                self.variant_stats.items(),
                key=lambda x: x[1]["avg_score"] if x[1]["total_uses"] > 0 else 0
            )
            variant_id = best_variant[0]
            selection_reason = "exploitation"
        
        variant = PROMPT_VARIANTS[variant_id]
        
        result = {
            "variant_id": variant_id,
            "variant_name": variant["name"],
            "template": variant["template"],
            "description": variant["description"],
            "selection_reason": selection_reason,
            "current_stats": self.variant_stats[variant_id].copy()
        }
        
        # Log to Opik
        opik.track_current().log_output(result)
        
        return result
    
    @track(name="prompt_experiment_record", tags=["experiment", "result"])
    def record_result(
        self,
        variant_id: str,
        quality_score: float,
        user_completed: Optional[bool] = None
    ) -> dict:
        """
        Record the result of using a prompt variant.
        
        Args:
            variant_id: Which variant was used
            quality_score: LLM-judge quality score (0-1)
            user_completed: Whether user completed their goal (if known)
        """
        
        if variant_id not in self.variant_stats:
            return {"error": "Unknown variant"}
        
        stats = self.variant_stats[variant_id]
        stats["total_uses"] += 1
        stats["total_score"] += quality_score
        stats["avg_score"] = stats["total_score"] / stats["total_uses"]
        
        if user_completed is not None and user_completed:
            stats["completions"] += 1
        
        result = {
            "variant_id": variant_id,
            "recorded_score": quality_score,
            "user_completed": user_completed,
            "updated_stats": stats.copy(),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Log to Opik
        opik.track_current().log_output(result)
        
        return result
    
    @track(name="prompt_experiment_report", tags=["experiment", "analysis"])
    def get_experiment_report(self) -> dict:
        """
        Get a report of all prompt variant performance.
        
        Returns comparison data for the Opik dashboard.
        """
        
        variants_ranked = sorted(
            [
                {
                    "variant_id": vid,
                    "name": PROMPT_VARIANTS[vid]["name"],
                    "description": PROMPT_VARIANTS[vid]["description"],
                    **stats
                }
                for vid, stats in self.variant_stats.items()
            ],
            key=lambda x: x["avg_score"],
            reverse=True
        )
        
        total_experiments = sum(v["total_uses"] for v in self.variant_stats.values())
        
        report = {
            "total_experiments": total_experiments,
            "variants_tested": len([v for v in self.variant_stats.values() if v["total_uses"] > 0]),
            "best_variant": variants_ranked[0] if variants_ranked else None,
            "worst_variant": variants_ranked[-1] if variants_ranked else None,
            "all_variants": variants_ranked,
            "ready_for_conclusion": total_experiments >= 20,
            "recommendation": self._generate_recommendation(variants_ranked, total_experiments)
        }
        
        # Log to Opik
        opik.track_current().log_output(report)
        
        return report
    
    def _generate_recommendation(self, variants: list, total: int) -> str:
        """Generate a human-readable recommendation"""
        
        if total < 10:
            return "Need more data. Continue experimenting with all variants."
        
        if not variants:
            return "No data available yet."
        
        best = variants[0]
        
        if total < 20:
            return f"Early results favor '{best['name']}' (avg score: {best['avg_score']:.2f}). Continue testing for more confidence."
        
        if best["avg_score"] > 0.7:
            return f"Strong recommendation: Use '{best['name']}' prompts. They score {best['avg_score']:.2f} on average."
        
        return f"'{best['name']}' performs best ({best['avg_score']:.2f}), but consider testing new variants."


# Global experiment instance
prompt_experiment = PromptExperiment()


# ============================================
# Opik Custom Metrics for Evaluation
# ============================================

class MessageQualityMetric:
    """Custom Opik metric for message quality evaluation"""
    
    name = "message_quality"
    
    def score(self, output: str, expected: str = None, **kwargs) -> float:
        """
        Score message quality based on:
        - Length (not too short, not too long)
        - Contains encouraging language
        - Doesn't contain negative words
        """
        
        if not output:
            return 0.0
        
        score = 0.5  # Base score
        
        # Length check (ideal: 50-200 chars)
        length = len(output)
        if 50 <= length <= 200:
            score += 0.2
        elif 30 <= length <= 300:
            score += 0.1
        
        # Positive language
        positive_words = ["you", "can", "great", "amazing", "progress", "keep", "going", "believe"]
        if any(word in output.lower() for word in positive_words):
            score += 0.2
        
        # No negative language
        negative_words = ["fail", "loser", "pathetic", "give up", "quit"]
        if not any(word in output.lower() for word in negative_words):
            score += 0.1
        
        return min(score, 1.0)


class StrategyAlignmentMetric:
    """Custom Opik metric for strategy alignment"""
    
    name = "strategy_alignment"
    
    STRATEGY_KEYWORDS = {
        "gentle_reminder": ["reminder", "checking in", "hey", "friendly"],
        "accountability": ["did you", "complete", "yes or no", "check"],
        "streak_gamification": ["streak", "days", "keep", "chain", "🔥"],
        "social_comparison": ["others", "people", "community", "%"],
        "loss_aversion": ["lose", "miss", "don't let", "slip"],
        "reward_preview": ["imagine", "feel", "reward", "achieve"],
        "identity_reinforcement": ["you are", "becoming", "identity", "someone who"],
        "micro_commitment": ["just", "minutes", "small", "start", "tiny"]
    }
    
    def score(self, output: str, strategy: str, **kwargs) -> float:
        """Score how well the message aligns with its intended strategy"""
        
        if not output or not strategy:
            return 0.0
        
        keywords = self.STRATEGY_KEYWORDS.get(strategy, [])
        if not keywords:
            return 0.5  # Unknown strategy
        
        matches = sum(1 for kw in keywords if kw.lower() in output.lower())
        
        return min(matches / max(len(keywords) * 0.5, 1), 1.0)


# Export metrics for Opik
CUSTOM_METRICS = [
    MessageQualityMetric(),
    StrategyAlignmentMetric()
]
