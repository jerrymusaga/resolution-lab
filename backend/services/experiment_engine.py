"""
Resolution Lab - Experiment Engine Service
Multi-armed bandit algorithm for strategy selection.
Uses epsilon-greedy approach to balance exploration vs exploitation.
"""

import random
from typing import Optional
from dataclasses import dataclass, field
from collections import defaultdict

import opik

from models.schemas import InterventionStrategy, StrategyStats


# ===================
# Configuration
# ===================

# Exploration rate: probability of trying a random strategy
EPSILON = 0.2  # 20% exploration, 80% exploitation

# Minimum samples before we trust a strategy's effectiveness
MIN_SAMPLES_FOR_EXPLOITATION = 3

# All available strategies
ALL_STRATEGIES = list(InterventionStrategy)


# ===================
# Bandit State
# ===================

@dataclass
class StrategyArm:
    """Represents a single strategy 'arm' in the bandit."""
    strategy: InterventionStrategy
    total_pulls: int = 0  # Number of times this strategy was used
    total_reward: float = 0.0  # Sum of effectiveness scores
    successes: int = 0  # Number of goal completions
    
    @property
    def mean_reward(self) -> float:
        """Average effectiveness score."""
        if self.total_pulls == 0:
            return 0.0
        return self.total_reward / self.total_pulls
    
    @property
    def completion_rate(self) -> float:
        """Goal completion rate."""
        if self.total_pulls == 0:
            return 0.0
        return self.successes / self.total_pulls
    
    def update(self, reward: float, success: bool):
        """Update arm statistics after a pull."""
        self.total_pulls += 1
        self.total_reward += reward
        if success:
            self.successes += 1


@dataclass
class UserBanditState:
    """Bandit state for a single user."""
    user_id: str
    arms: dict[InterventionStrategy, StrategyArm] = field(default_factory=dict)
    total_interventions: int = 0
    # User's locked-in preferred strategy (from experiment results)
    preferred_strategy: Optional[InterventionStrategy] = None
    formula_applied: bool = False  # Whether user has applied their discovered formula

    def __post_init__(self):
        # Initialize all strategy arms
        if not self.arms:
            for strategy in ALL_STRATEGIES:
                self.arms[strategy] = StrategyArm(strategy=strategy)
    
    def get_arm(self, strategy: InterventionStrategy) -> StrategyArm:
        """Get arm for a strategy, creating if needed."""
        if strategy not in self.arms:
            self.arms[strategy] = StrategyArm(strategy=strategy)
        return self.arms[strategy]
    
    @property
    def exploration_phase(self) -> bool:
        """Are we still in the initial exploration phase?"""
        # Stay in exploration until each strategy has been tried at least MIN_SAMPLES times
        return any(
            arm.total_pulls < MIN_SAMPLES_FOR_EXPLOITATION 
            for arm in self.arms.values()
        )
    
    @property
    def best_strategy(self) -> Optional[InterventionStrategy]:
        """Get the strategy with highest mean reward."""
        valid_arms = [
            arm for arm in self.arms.values()
            if arm.total_pulls >= MIN_SAMPLES_FOR_EXPLOITATION
        ]
        if not valid_arms:
            return None
        return max(valid_arms, key=lambda a: a.mean_reward).strategy

    def apply_formula(self, strategy: Optional[InterventionStrategy] = None) -> dict:
        """
        Lock in the user's preferred strategy based on experiment results.

        Args:
            strategy: Specific strategy to lock in, or None to use best_strategy

        Returns:
            dict with applied strategy info
        """
        if strategy:
            self.preferred_strategy = strategy
        elif self.best_strategy:
            self.preferred_strategy = self.best_strategy
        else:
            return {"success": False, "reason": "No best strategy found yet"}

        self.formula_applied = True
        return {
            "success": True,
            "preferred_strategy": self.preferred_strategy.value,
            "message": f"Your motivation formula is now active! The AI will prioritize '{self.preferred_strategy.value}' strategy."
        }

    def clear_formula(self) -> dict:
        """Clear the user's preferred strategy and return to exploration."""
        self.preferred_strategy = None
        self.formula_applied = False
        return {
            "success": True,
            "message": "Formula cleared. The AI will resume experimenting with different strategies."
        }


class ExperimentEngine:
    """
    Multi-armed bandit experiment engine.
    
    Uses epsilon-greedy strategy:
    - With probability epsilon: explore (try random strategy)
    - With probability 1-epsilon: exploit (use best known strategy)
    
    During initial exploration phase, ensures each strategy is tried
    at least MIN_SAMPLES_FOR_EXPLOITATION times.
    """
    
    def __init__(self, epsilon: float = EPSILON):
        self.epsilon = epsilon
        # In-memory state (in production, this would be backed by database)
        self._user_states: dict[str, UserBanditState] = {}
    
    def get_user_state(self, user_id: str) -> UserBanditState:
        """Get or create bandit state for a user."""
        if user_id not in self._user_states:
            self._user_states[user_id] = UserBanditState(user_id=user_id)
        return self._user_states[user_id]
    
    def load_user_state_from_stats(
        self, 
        user_id: str, 
        stats: list[StrategyStats]
    ) -> UserBanditState:
        """Load user state from database statistics."""
        state = self.get_user_state(user_id)
        
        for stat in stats:
            arm = state.get_arm(stat.strategy)
            arm.total_pulls = stat.total_interventions
            arm.successes = stat.successful_completions
            arm.total_reward = stat.effectiveness_score * stat.total_interventions
        
        return state
    
    @opik.track(name="select_strategy")
    def select_strategy(
        self,
        user_id: str,
        goal_id: Optional[str] = None,
        excluded_strategies: Optional[list[InterventionStrategy]] = None
    ) -> dict:
        """
        Select the next strategy to use for a user.

        Uses epsilon-greedy multi-armed bandit algorithm:
        1. If user has applied their formula: use preferred strategy (90% of time)
        2. In exploration phase: cycle through untried strategies
        3. After exploration: epsilon chance to explore, else exploit best

        Args:
            user_id: The user's ID
            goal_id: Optional goal ID for context
            excluded_strategies: Strategies to exclude from selection

        Returns:
            dict with strategy and selection metadata
        """
        state = self.get_user_state(user_id)
        excluded = set(excluded_strategies or [])
        available = [s for s in ALL_STRATEGIES if s not in excluded]

        if not available:
            available = ALL_STRATEGIES

        # Priority 0: If user has applied their formula, use it most of the time
        if state.formula_applied and state.preferred_strategy:
            if state.preferred_strategy in available:
                # 90% use preferred, 10% still explore to gather data
                if random.random() < 0.9:
                    self._log_selection(state, state.preferred_strategy, "formula_applied")
                    return {
                        "strategy": state.preferred_strategy.value,
                        "reason": "formula_applied",
                        "preferred_strategy": state.preferred_strategy.value,
                        "formula_active": True
                    }

        # Phase 1: Initial exploration - ensure each strategy is tried
        if state.exploration_phase:
            # Find strategies that haven't been tried enough
            undertried = [
                strategy for strategy in available
                if state.get_arm(strategy).total_pulls < MIN_SAMPLES_FOR_EXPLOITATION
            ]

            if undertried:
                selected = random.choice(undertried)
                self._log_selection(state, selected, "exploration_phase")
                return {
                    "strategy": selected.value,
                    "reason": "exploration_phase",
                    "formula_active": state.formula_applied
                }

        # Phase 2: Epsilon-greedy
        if random.random() < self.epsilon:
            # Explore: random strategy
            selected = random.choice(available)
            self._log_selection(state, selected, "epsilon_explore")
            return {
                "strategy": selected.value,
                "reason": "epsilon_explore",
                "formula_active": state.formula_applied
            }
        else:
            # Exploit: best known strategy
            available_arms = [
                state.get_arm(s) for s in available
                if state.get_arm(s).total_pulls > 0
            ]

            if available_arms:
                best_arm = max(available_arms, key=lambda a: a.mean_reward)
                selected = best_arm.strategy
                self._log_selection(state, selected, "exploit_best")
            else:
                # No data yet, random selection
                selected = random.choice(available)
                self._log_selection(state, selected, "no_data_random")

            return {
                "strategy": selected.value,
                "reason": "exploit_best" if available_arms else "no_data_random",
                "formula_active": state.formula_applied
            }
    
    def _log_selection(
        self, 
        state: UserBanditState, 
        strategy: InterventionStrategy,
        reason: str
    ):
        """Log strategy selection to Opik."""
        try:
            span = opik.get_current_span()
            if span:
                span.log_metadata({
                    "user_id": state.user_id,
                    "selected_strategy": strategy.value,
                    "selection_reason": reason,
                    "exploration_phase": state.exploration_phase,
                    "total_interventions": state.total_interventions,
                    "epsilon": self.epsilon,
                })
        except:
            pass  # Tracing is optional
    
    @opik.track(name="record_outcome")
    def record_outcome(
        self,
        user_id: str,
        strategy: InterventionStrategy,
        completed: bool,
        response_time_seconds: Optional[int] = None,
        sentiment: str = "neutral"
    ) -> float:
        """
        Record the outcome of an intervention.
        
        Args:
            user_id: The user's ID
            strategy: The strategy that was used
            completed: Whether the user completed their goal
            response_time_seconds: Time from intervention to response
            sentiment: User's sentiment (positive/neutral/negative)
        
        Returns:
            Calculated effectiveness score
        """
        state = self.get_user_state(user_id)
        arm = state.get_arm(strategy)
        
        # Calculate effectiveness score
        effectiveness = self.calculate_effectiveness(
            completed=completed,
            response_time_seconds=response_time_seconds,
            sentiment=sentiment
        )
        
        # Update arm statistics
        arm.update(reward=effectiveness, success=completed)
        state.total_interventions += 1
        
        # Log to Opik
        try:
            span = opik.get_current_span()
            if span:
                span.log_metadata({
                    "user_id": user_id,
                    "strategy": strategy.value,
                    "completed": completed,
                    "response_time_seconds": response_time_seconds,
                    "sentiment": sentiment,
                    "effectiveness_score": effectiveness,
                    "arm_total_pulls": arm.total_pulls,
                    "arm_mean_reward": arm.mean_reward,
                    "arm_completion_rate": arm.completion_rate,
                })
        except:
            pass
        
        return effectiveness
    
    def calculate_effectiveness(
        self,
        completed: bool,
        response_time_seconds: Optional[int] = None,
        sentiment: str = "neutral"
    ) -> float:
        """
        Calculate effectiveness score (0.0 to 1.0).
        
        Composite score:
        - 60% weight: Goal completion (binary)
        - 20% weight: Response speed (faster = better engagement)
        - 20% weight: User sentiment (positive reaction to intervention)
        """
        # Completion score (60%)
        completion_score = 1.0 if completed else 0.0
        
        # Speed score (20%) - decay over 1 hour
        if response_time_seconds is not None:
            speed_score = max(0.0, 1.0 - (response_time_seconds / 3600))
        else:
            speed_score = 0.5  # Default middle score if unknown
        
        # Sentiment score (20%)
        sentiment_scores = {
            "positive": 1.0,
            "neutral": 0.5,
            "negative": 0.0
        }
        sentiment_score = sentiment_scores.get(sentiment.lower(), 0.5)
        
        # Weighted composite
        effectiveness = (
            0.6 * completion_score +
            0.2 * speed_score +
            0.2 * sentiment_score
        )
        
        return round(effectiveness, 4)
    
    def get_user_insights(self, user_id: str) -> dict:
        """
        Get insights about a user's strategy effectiveness.

        Returns dict with:
        - strategy_stats: List of stats per strategy
        - best_strategy: Highest performing strategy
        - worst_strategy: Lowest performing strategy
        - experiment_phase: "exploring" or "optimizing"
        - formula_applied: Whether user has applied their formula
        - preferred_strategy: User's locked-in preferred strategy
        """
        state = self.get_user_state(user_id)

        strategy_stats = []
        for strategy in ALL_STRATEGIES:
            arm = state.get_arm(strategy)
            if arm.total_pulls > 0:
                strategy_stats.append({
                    "strategy": strategy.value,
                    "total_interventions": arm.total_pulls,
                    "successful_completions": arm.successes,
                    "completion_rate": round(arm.completion_rate, 3),
                    "effectiveness_score": round(arm.mean_reward, 3),
                })

        # Sort by effectiveness
        strategy_stats.sort(key=lambda x: x["effectiveness_score"], reverse=True)

        best = state.best_strategy
        worst = None
        if strategy_stats:
            worst_stat = min(
                [s for s in strategy_stats if s["total_interventions"] >= MIN_SAMPLES_FOR_EXPLOITATION],
                key=lambda x: x["effectiveness_score"],
                default=None
            )
            if worst_stat:
                worst = worst_stat["strategy"]

        return {
            "user_id": user_id,
            "strategy_stats": strategy_stats,
            "best_strategy": best.value if best else None,
            "worst_strategy": worst,
            "experiment_phase": "exploring" if state.exploration_phase else "optimizing",
            "total_interventions": state.total_interventions,
            "strategies_tested": len([s for s in strategy_stats if s["total_interventions"] > 0]),
            # New fields for formula application
            "formula_applied": state.formula_applied,
            "preferred_strategy": state.preferred_strategy.value if state.preferred_strategy else None,
        }

    def apply_user_formula(
        self,
        user_id: str,
        strategy: Optional[str] = None
    ) -> dict:
        """
        Apply the user's discovered motivation formula.

        Args:
            user_id: The user's ID
            strategy: Optional specific strategy to lock in (uses best if not provided)

        Returns:
            dict with result of applying formula
        """
        state = self.get_user_state(user_id)

        # Convert string to enum if provided
        strategy_enum = None
        if strategy:
            try:
                strategy_enum = InterventionStrategy(strategy)
            except ValueError:
                return {"success": False, "reason": f"Invalid strategy: {strategy}"}

        return state.apply_formula(strategy_enum)

    def clear_user_formula(self, user_id: str) -> dict:
        """
        Clear the user's formula and return to experimentation mode.

        Args:
            user_id: The user's ID

        Returns:
            dict with result
        """
        state = self.get_user_state(user_id)
        return state.clear_formula()

    def get_formula_status(self, user_id: str) -> dict:
        """
        Get the current formula status for a user.

        Returns:
            dict with formula status info
        """
        state = self.get_user_state(user_id)
        best = state.best_strategy

        return {
            "user_id": user_id,
            "formula_applied": state.formula_applied,
            "preferred_strategy": state.preferred_strategy.value if state.preferred_strategy else None,
            "best_strategy": best.value if best else None,
            "ready_to_apply": best is not None and not state.formula_applied,
            "total_interventions": state.total_interventions,
            "exploration_complete": not state.exploration_phase,
        }


# Global instance
experiment_engine = ExperimentEngine()


# ===================
# Testing
# ===================

def test_experiment_engine():
    """Test the experiment engine."""
    print("Testing Experiment Engine...")
    print("=" * 50)
    
    engine = ExperimentEngine(epsilon=0.2)
    user_id = "test_user_123"
    
    # Simulate 20 interventions
    for i in range(20):
        strategy = engine.select_strategy(user_id)
        
        # Simulate outcome - accountability works best for this user
        if strategy == InterventionStrategy.ACCOUNTABILITY:
            completed = random.random() < 0.8  # 80% success
        elif strategy == InterventionStrategy.STREAK_GAMIFICATION:
            completed = random.random() < 0.6  # 60% success
        else:
            completed = random.random() < 0.3  # 30% success
        
        effectiveness = engine.record_outcome(
            user_id=user_id,
            strategy=strategy,
            completed=completed,
            response_time_seconds=random.randint(300, 3600),
            sentiment=random.choice(["positive", "neutral", "negative"])
        )
        
        print(f"Round {i+1}: {strategy.value} -> {'✅' if completed else '❌'} (score: {effectiveness:.2f})")
    
    print("\n" + "=" * 50)
    print("User Insights:")
    insights = engine.get_user_insights(user_id)
    print(f"  Phase: {insights['experiment_phase']}")
    print(f"  Best strategy: {insights['best_strategy']}")
    print(f"  Strategies tested: {insights['strategies_tested']}")
    print("\n  Strategy Stats:")
    for stat in insights['strategy_stats']:
        print(f"    {stat['strategy']}: {stat['completion_rate']*100:.0f}% completion, {stat['effectiveness_score']:.2f} score")
    
    print("\n✅ Experiment engine test complete!")


if __name__ == "__main__":
    test_experiment_engine()
