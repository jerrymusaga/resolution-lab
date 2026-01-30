"""
Resolution Lab - Prompt Optimization with Opik Agent Optimizer

Uses Opik's optimization algorithms to automatically improve motivation message prompts.
This demonstrates advanced LLM optimization for hackathon judges.

Features:
- MetaPromptOptimizer: LLM-powered prompt refinement
- FewShotBayesianOptimizer: Optimal example selection
- EvolutionaryOptimizer: Genetic algorithm prompt evolution
- Tracks all optimization experiments in Opik dashboard
"""

import os
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import opik
from opik import track

# Check if opik-optimizer is installed
try:
    from opik_optimizer import (
        MetaPromptOptimizer,
        FewShotBayesianOptimizer,
        EvolutionaryOptimizer,
        ChatPrompt,
    )
    from opik.evaluation.metrics import LevenshteinRatio
    OPTIMIZER_AVAILABLE = True
except ImportError:
    OPTIMIZER_AVAILABLE = False
    print("⚠️ opik-optimizer not installed. Run: pip install opik-optimizer")

from models.schemas import InterventionStrategy


# Strategy-specific base prompts that will be optimized
STRATEGY_BASE_PROMPTS = {
    InterventionStrategy.GENTLE_REMINDER: """You are a warm, supportive motivation coach.
Generate a friendly reminder for the user's goal. Be encouraging without being pushy.
Keep it to 1-2 sentences maximum. Sound human and natural.""",

    InterventionStrategy.ACCOUNTABILITY: """You are a direct accountability partner.
Ask the user clearly if they completed their goal today. Be respectful but firm.
Request a clear Yes/No response. Maximum 2 sentences.""",

    InterventionStrategy.STREAK_GAMIFICATION: """You are a gamification coach focused on streaks.
Emphasize the user's current streak and the importance of not breaking it.
Make it feel like a game. Use fire emoji. Maximum 2 sentences.""",

    InterventionStrategy.SOCIAL_COMPARISON: """You are sharing social proof data.
Mention that a percentage of similar users (65-80%) completed their goal today.
Make the user feel they can be part of the successful group. Maximum 2 sentences.""",

    InterventionStrategy.LOSS_AVERSION: """You are highlighting potential losses.
Frame the message around what the user might lose if they skip today.
Be motivating through fear of loss, but not harsh. Maximum 2 sentences.""",

    InterventionStrategy.REWARD_PREVIEW: """You are focusing on rewards and benefits.
Paint a picture of how good they'll feel after completing their goal.
Make the reward tangible and immediate. Maximum 2 sentences.""",

    InterventionStrategy.IDENTITY_REINFORCEMENT: """You are reinforcing the user's identity.
Use phrases like "You're becoming someone who..." or "This is who you are now."
Connect the action to their identity transformation. Maximum 2 sentences.""",

    InterventionStrategy.MICRO_COMMITMENT: """You are asking for a tiny commitment.
Ask if they can commit to just 5 minutes or the smallest version of their goal.
Make it feel easy and achievable. Maximum 2 sentences.""",
}


@dataclass
class OptimizationResult:
    """Result from a prompt optimization run."""
    strategy: str
    original_prompt: str
    optimized_prompt: str
    original_score: float
    optimized_score: float
    improvement_percentage: float
    num_trials: int
    best_examples: Optional[List[Dict]] = None


class MotivationPromptOptimizer:
    """
    Optimizes motivation message prompts using Opik Agent Optimizer.

    This class demonstrates advanced LLM optimization techniques:
    1. MetaPrompt optimization - LLM critiques and improves prompts
    2. Few-shot Bayesian - Finds optimal examples for each strategy
    3. Evolutionary - Evolves prompts using genetic algorithms
    """

    def __init__(self, reasoning_model: str = "gemini/gemini-2.0-flash"):
        """
        Initialize the optimizer.

        Args:
            reasoning_model: The model to use for optimization reasoning
        """
        self.reasoning_model = reasoning_model
        self.opik_client = opik.Opik()

        if not OPTIMIZER_AVAILABLE:
            raise ImportError("opik-optimizer is required. Run: pip install opik-optimizer")

    def _create_dataset_from_history(
        self,
        user_interventions: List[Dict],
        strategy: InterventionStrategy
    ) -> Any:
        """
        Create an Opik dataset from user intervention history.

        Uses completed interventions as positive examples and
        dismissed ones as negative examples to train the optimizer.
        """
        dataset_name = f"motivation-{strategy.value}-optimization"
        dataset = self.opik_client.get_or_create_dataset(name=dataset_name)

        # Filter interventions by strategy and outcome
        items = []
        for intervention in user_interventions:
            if intervention.get("strategy") == strategy.value:
                items.append({
                    "goal_title": intervention.get("goal_title", ""),
                    "message": intervention.get("message", ""),
                    "completed": intervention.get("completed", False),
                    "effectiveness": intervention.get("effectiveness_score", 0.5),
                    "user_streak": intervention.get("current_streak", 0),
                })

        if items:
            dataset.insert(items)

        return dataset

    def _effectiveness_metric(self, dataset_item: Dict, llm_output: str) -> float:
        """
        Custom metric that scores based on historical effectiveness.

        Higher scores for messages similar to ones that led to completion.
        """
        # Use Levenshtein similarity to completed messages as proxy
        if dataset_item.get("completed"):
            metric = LevenshteinRatio()
            similarity = metric.score(
                reference=dataset_item.get("message", ""),
                output=llm_output
            )
            # Weight by historical effectiveness
            effectiveness = dataset_item.get("effectiveness", 0.5)
            return similarity * effectiveness
        else:
            # Penalize similarity to messages that didn't work
            metric = LevenshteinRatio()
            similarity = metric.score(
                reference=dataset_item.get("message", ""),
                output=llm_output
            )
            return max(0, 1 - similarity)

    @track(name="optimize_strategy_prompt")
    def optimize_strategy_prompt(
        self,
        strategy: InterventionStrategy,
        user_interventions: List[Dict],
        max_trials: int = 5,
        n_samples: int = 20,
    ) -> OptimizationResult:
        """
        Optimize the prompt for a specific motivation strategy.

        Uses MetaPromptOptimizer to have an LLM critique and improve
        the prompt based on historical effectiveness data.

        Args:
            strategy: The motivation strategy to optimize
            user_interventions: Historical intervention data
            max_trials: Number of optimization iterations
            n_samples: Samples per trial for evaluation

        Returns:
            OptimizationResult with original and optimized prompts
        """
        # Create dataset from history
        dataset = self._create_dataset_from_history(user_interventions, strategy)

        # Get base prompt for this strategy
        base_prompt_text = STRATEGY_BASE_PROMPTS.get(
            strategy,
            STRATEGY_BASE_PROMPTS[InterventionStrategy.GENTLE_REMINDER]
        )

        # Create ChatPrompt for optimization
        prompt = ChatPrompt(
            project_name=f"resolution-lab-{strategy.value}-optimization",
            messages=[
                {"role": "system", "content": base_prompt_text},
                {"role": "user", "content": "Goal: {goal_title}\nStreak: {user_streak} days\n\nGenerate a motivation message:"},
            ],
            model="gemini/gemini-2.0-flash"
        )

        # Initialize MetaPrompt optimizer
        optimizer = MetaPromptOptimizer(
            model=self.reasoning_model,
            n_threads=4,
        )

        # Run optimization
        result = optimizer.optimize_prompt(
            prompt=prompt,
            dataset=dataset,
            metric=self._effectiveness_metric,
            max_trials=max_trials,
            n_samples=n_samples,
        )

        # Extract results
        optimized_prompt = result.best_prompt.messages[0]["content"]

        return OptimizationResult(
            strategy=strategy.value,
            original_prompt=base_prompt_text,
            optimized_prompt=optimized_prompt,
            original_score=result.initial_score or 0.0,
            optimized_score=result.best_score or 0.0,
            improvement_percentage=((result.best_score - result.initial_score) / result.initial_score * 100) if result.initial_score else 0,
            num_trials=max_trials,
        )

    @track(name="optimize_with_few_shot")
    def optimize_with_few_shot(
        self,
        strategy: InterventionStrategy,
        user_interventions: List[Dict],
        min_examples: int = 2,
        max_examples: int = 5,
    ) -> OptimizationResult:
        """
        Optimize using Few-Shot Bayesian optimization.

        Finds the optimal number and combination of examples to include
        in the prompt for this strategy.

        Args:
            strategy: The motivation strategy to optimize
            user_interventions: Historical intervention data
            min_examples: Minimum few-shot examples
            max_examples: Maximum few-shot examples

        Returns:
            OptimizationResult with optimal examples
        """
        dataset = self._create_dataset_from_history(user_interventions, strategy)

        base_prompt_text = STRATEGY_BASE_PROMPTS.get(
            strategy,
            STRATEGY_BASE_PROMPTS[InterventionStrategy.GENTLE_REMINDER]
        )

        prompt = ChatPrompt(
            project_name=f"resolution-lab-{strategy.value}-fewshot",
            messages=[
                {"role": "system", "content": base_prompt_text},
                {"role": "user", "content": "Goal: {goal_title}\n\nGenerate a motivation message:"},
            ],
            model="gemini/gemini-2.0-flash"
        )

        optimizer = FewShotBayesianOptimizer(
            model=self.reasoning_model,
            min_examples=min_examples,
            max_examples=max_examples,
            n_threads=4,
            seed=42,
        )

        result = optimizer.optimize_prompt(
            prompt=prompt,
            dataset=dataset,
            metric=self._effectiveness_metric,
            n_samples=30,
        )

        # Extract best examples
        best_examples = []
        if hasattr(result, 'best_examples'):
            best_examples = result.best_examples

        return OptimizationResult(
            strategy=strategy.value,
            original_prompt=base_prompt_text,
            optimized_prompt=str(result.best_prompt.messages),
            original_score=result.initial_score or 0.0,
            optimized_score=result.best_score or 0.0,
            improvement_percentage=((result.best_score - result.initial_score) / result.initial_score * 100) if result.initial_score else 0,
            num_trials=max_examples - min_examples + 1,
            best_examples=best_examples,
        )

    @track(name="evolve_prompts")
    def evolve_prompts(
        self,
        strategy: InterventionStrategy,
        user_interventions: List[Dict],
        population_size: int = 10,
        generations: int = 5,
    ) -> OptimizationResult:
        """
        Evolve prompts using genetic algorithms.

        Uses EvolutionaryOptimizer to discover novel prompt structures
        through mutation and crossover operations.

        Args:
            strategy: The motivation strategy to optimize
            user_interventions: Historical intervention data
            population_size: Size of prompt population
            generations: Number of evolution generations

        Returns:
            OptimizationResult with evolved prompt
        """
        dataset = self._create_dataset_from_history(user_interventions, strategy)

        base_prompt_text = STRATEGY_BASE_PROMPTS.get(
            strategy,
            STRATEGY_BASE_PROMPTS[InterventionStrategy.GENTLE_REMINDER]
        )

        prompt = ChatPrompt(
            project_name=f"resolution-lab-{strategy.value}-evolution",
            messages=[
                {"role": "system", "content": base_prompt_text},
                {"role": "user", "content": "Goal: {goal_title}\n\nGenerate a motivation message:"},
            ],
            model="gemini/gemini-2.0-flash"
        )

        optimizer = EvolutionaryOptimizer(
            model=self.reasoning_model,
            population_size=population_size,
            num_generations=generations,
            n_threads=4,
        )

        result = optimizer.optimize_prompt(
            prompt=prompt,
            dataset=dataset,
            metric=self._effectiveness_metric,
            n_samples=20,
        )

        return OptimizationResult(
            strategy=strategy.value,
            original_prompt=base_prompt_text,
            optimized_prompt=result.best_prompt.messages[0]["content"],
            original_score=result.initial_score or 0.0,
            optimized_score=result.best_score or 0.0,
            improvement_percentage=((result.best_score - result.initial_score) / result.initial_score * 100) if result.initial_score else 0,
            num_trials=population_size * generations,
        )


# Singleton instance
_optimizer_instance: Optional[MotivationPromptOptimizer] = None


def get_prompt_optimizer() -> Optional[MotivationPromptOptimizer]:
    """Get or create the prompt optimizer singleton."""
    global _optimizer_instance

    if not OPTIMIZER_AVAILABLE:
        return None

    if _optimizer_instance is None:
        try:
            _optimizer_instance = MotivationPromptOptimizer()
        except Exception as e:
            print(f"Failed to initialize prompt optimizer: {e}")
            return None

    return _optimizer_instance


# Store optimized prompts in memory (could be persisted to DB)
OPTIMIZED_PROMPTS: Dict[str, str] = {}


def get_optimized_prompt(strategy: InterventionStrategy) -> str:
    """
    Get the optimized prompt for a strategy, falling back to base if not optimized.
    """
    if strategy.value in OPTIMIZED_PROMPTS:
        return OPTIMIZED_PROMPTS[strategy.value]
    return STRATEGY_BASE_PROMPTS.get(strategy, STRATEGY_BASE_PROMPTS[InterventionStrategy.GENTLE_REMINDER])


def save_optimized_prompt(strategy: InterventionStrategy, prompt: str) -> None:
    """Save an optimized prompt for a strategy."""
    OPTIMIZED_PROMPTS[strategy.value] = prompt
