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
        excluded_strategies: Optional[list[InterventionStrategy]] = None
    ) -> InterventionStrategy:
        """
        Select the next strategy to use for a user.
        
        Uses epsilon-greedy multi-armed bandit algorithm:
        1. In exploration phase: cycle through untried strategies
        2. After exploration: epsilon chance to explore, else exploit best
        
        Args:
            user_id: The user's ID
            excluded_strategies: Strategies to exclude from selection
        
        Returns:
            Selected intervention strategy
        """
        state = self.get_user_state(user_id)
        excluded = set(excluded_strategies or [])
        available = [s for s in ALL_STRATEGIES if s not in excluded]
        
        if not available:
            available = ALL_STRATEGIES
        
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
                return selected
        
        # Phase 2: Epsilon-greedy
        if random.random() < self.epsilon:
            # Explore: random strategy
            selected = random.choice(available)
            self._log_selection(state, selected, "epsilon_explore")
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
        
        return selected
    
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
