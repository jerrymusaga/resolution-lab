"""
Resolution Lab - Auto Prompt Optimizer

Automatically triggers prompt optimization when enough data is collected.
Runs in the background without blocking the main request flow.

Features:
- Tracks intervention counts per strategy since last optimization
- Triggers optimization when threshold is reached (default: 15 new interventions)
- Runs optimization in background thread
- Persists optimization state to file
- Logs all optimization runs to Opik
"""

import os
import json
import asyncio
import threading
from datetime import datetime
from typing import Dict, Optional, List, Any
from pathlib import Path
import opik
from opik import track

from models.schemas import InterventionStrategy

# Try to import the optimizer
OPTIMIZER_AVAILABLE = False
try:
    from services.prompt_optimizer import (
        get_prompt_optimizer,
        save_optimized_prompt,
        OPTIMIZER_AVAILABLE as PROMPT_OPTIMIZER_AVAILABLE,
    )
    OPTIMIZER_AVAILABLE = PROMPT_OPTIMIZER_AVAILABLE
except (ImportError, Exception) as e:
    print(f"⚠️ Auto-optimizer: prompt_optimizer not available: {e}")

# Alias expected by routers
AUTO_OPTIMIZER_AVAILABLE = OPTIMIZER_AVAILABLE


# Configuration
OPTIMIZATION_THRESHOLD = 3  # Trigger optimization after this many new interventions per strategy
STATE_FILE_PATH = Path(__file__).parent.parent / "data" / "optimization_state.json"


class OptimizationState:
    """Tracks optimization state per strategy."""

    def __init__(self):
        self.intervention_counts: Dict[str, int] = {}  # strategy -> count since last optimization
        self.last_optimization: Dict[str, str] = {}  # strategy -> ISO timestamp
        self.optimization_results: Dict[str, Dict] = {}  # strategy -> last result
        self._lock = threading.Lock()
        self._load_state()

    def _load_state(self):
        """Load state from file if exists."""
        try:
            if STATE_FILE_PATH.exists():
                with open(STATE_FILE_PATH, 'r') as f:
                    data = json.load(f)
                    self.intervention_counts = data.get('intervention_counts', {})
                    self.last_optimization = data.get('last_optimization', {})
                    self.optimization_results = data.get('optimization_results', {})
                    print(f"🔄 Loaded optimization state: {len(self.intervention_counts)} strategies tracked")
        except Exception as e:
            print(f"⚠️ Failed to load optimization state: {e}")

    def _save_state(self):
        """Save state to file."""
        try:
            STATE_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)
            with open(STATE_FILE_PATH, 'w') as f:
                json.dump({
                    'intervention_counts': self.intervention_counts,
                    'last_optimization': self.last_optimization,
                    'optimization_results': self.optimization_results,
                }, f, indent=2)
        except Exception as e:
            print(f"⚠️ Failed to save optimization state: {e}")

    def increment_count(self, strategy: str) -> int:
        """Increment intervention count for a strategy. Returns new count."""
        with self._lock:
            current = self.intervention_counts.get(strategy, 0)
            self.intervention_counts[strategy] = current + 1
            self._save_state()
            return self.intervention_counts[strategy]

    def should_optimize(self, strategy: str) -> bool:
        """Check if a strategy should be optimized."""
        with self._lock:
            count = self.intervention_counts.get(strategy, 0)
            return count >= OPTIMIZATION_THRESHOLD

    def reset_count(self, strategy: str):
        """Reset count after optimization."""
        with self._lock:
            self.intervention_counts[strategy] = 0
            self.last_optimization[strategy] = datetime.utcnow().isoformat()
            self._save_state()

    def record_result(self, strategy: str, result: Dict):
        """Record optimization result."""
        with self._lock:
            self.optimization_results[strategy] = {
                **result,
                'timestamp': datetime.utcnow().isoformat()
            }
            self._save_state()

    def get_status(self) -> Dict[str, Any]:
        """Get current optimization status."""
        with self._lock:
            return {
                'intervention_counts': dict(self.intervention_counts),
                'last_optimization': dict(self.last_optimization),
                'threshold': OPTIMIZATION_THRESHOLD,
                'strategies_ready': [
                    s for s, c in self.intervention_counts.items()
                    if c >= OPTIMIZATION_THRESHOLD
                ],
                'optimization_results': dict(self.optimization_results),
            }


# Singleton state
_optimization_state: Optional[OptimizationState] = None


def get_optimization_state() -> OptimizationState:
    """Get or create optimization state singleton."""
    global _optimization_state
    if _optimization_state is None:
        _optimization_state = OptimizationState()
    return _optimization_state


@track(name="auto_optimize_strategy", tags=["optimization", "auto"])
def _run_optimization(strategy: str, user_id: str, interventions: List[Dict]) -> Optional[Dict]:
    """
    Run optimization for a strategy (called in background thread).

    This function is traced by Opik for visibility in the dashboard.
    """
    if not OPTIMIZER_AVAILABLE:
        print(f"⚠️ Cannot optimize {strategy}: optimizer not available")
        return None

    optimizer = get_prompt_optimizer()
    if not optimizer:
        print(f"⚠️ Cannot optimize {strategy}: failed to get optimizer")
        return None

    try:
        strategy_enum = InterventionStrategy(strategy)

        print(f"🚀 Starting auto-optimization for strategy: {strategy}")
        print(f"   Using {len(interventions)} interventions for training")

        # Run MetaPrompt optimization (most effective for prompt improvement)
        result = optimizer.optimize_strategy_prompt(
            strategy=strategy_enum,
            user_interventions=interventions,
            max_trials=3,  # Fewer trials for background optimization
            n_samples=15,
        )

        # Save the optimized prompt
        save_optimized_prompt(strategy_enum, result.optimized_prompt)

        result_dict = {
            'strategy': result.strategy,
            'original_score': result.original_score,
            'optimized_score': result.optimized_score,
            'improvement_percentage': result.improvement_percentage,
            'num_trials': result.num_trials,
        }

        print(f"✅ Auto-optimization complete for {strategy}")
        print(f"   Score: {result.original_score:.2f} → {result.optimized_score:.2f}")
        print(f"   Improvement: {result.improvement_percentage:.1f}%")

        # Log to Opik
        try:
            opik_client = opik.Opik()
            opik_client.log_metric(
                name=f"optimization_improvement_{strategy}",
                value=result.improvement_percentage,
            )
        except Exception as e:
            print(f"⚠️ Failed to log optimization metric to Opik: {e}")

        return result_dict

    except Exception as e:
        print(f"❌ Auto-optimization failed for {strategy}: {e}")
        return None


def _background_optimize(strategy: str, user_id: str, interventions: List[Dict]):
    """Run optimization in background thread."""
    state = get_optimization_state()

    try:
        result = _run_optimization(strategy, user_id, interventions)

        if result:
            state.record_result(strategy, result)
            state.reset_count(strategy)
            print(f"🎉 Background optimization for {strategy} completed and saved")
        else:
            # Don't reset count if optimization failed - will retry next time
            print(f"⚠️ Background optimization for {strategy} did not produce results")

    except Exception as e:
        print(f"❌ Background optimization thread error for {strategy}: {e}")


async def check_and_trigger_optimization(
    strategy: str,
    user_id: str,
    get_interventions_func,
) -> bool:
    """
    Check if optimization should run and trigger it in background if needed.

    Args:
        strategy: The intervention strategy that was just used
        user_id: The user ID (for fetching intervention history)
        get_interventions_func: Async function to fetch user's intervention history

    Returns:
        True if optimization was triggered, False otherwise
    """
    if not OPTIMIZER_AVAILABLE:
        return False

    state = get_optimization_state()

    # Increment count for this strategy
    new_count = state.increment_count(strategy)
    print(f"📊 Strategy '{strategy}' count: {new_count}/{OPTIMIZATION_THRESHOLD}")

    # Check if we should optimize
    if not state.should_optimize(strategy):
        return False

    print(f"🔔 Optimization threshold reached for strategy: {strategy}")

    try:
        # Fetch intervention history
        interventions = await get_interventions_func(user_id)

        if len(interventions) < 10:
            print(f"⚠️ Not enough total interventions ({len(interventions)}) for optimization")
            return False

        # Convert to format expected by optimizer
        intervention_dicts = []
        for inv in interventions:
            intervention_dicts.append({
                'strategy': inv.get('strategy', strategy),
                'goal_title': inv.get('goal_title', ''),
                'message': inv.get('message', ''),
                'completed': inv.get('completed', False),
                'effectiveness_score': inv.get('effectiveness_score', 0.5),
                'current_streak': inv.get('current_streak', 0),
            })

        # Run optimization in background thread (non-blocking)
        thread = threading.Thread(
            target=_background_optimize,
            args=(strategy, user_id, intervention_dicts),
            daemon=True
        )
        thread.start()

        print(f"🚀 Started background optimization for strategy: {strategy}")
        return True

    except Exception as e:
        print(f"❌ Failed to trigger optimization: {e}")
        return False


def get_auto_optimization_status() -> Dict[str, Any]:
    """Get current auto-optimization status for API endpoint."""
    state = get_optimization_state()
    status = state.get_status()
    status['optimizer_available'] = OPTIMIZER_AVAILABLE
    return status


def reset_optimization_state():
    """Reset all optimization state (for testing)."""
    global _optimization_state
    _optimization_state = None
    if STATE_FILE_PATH.exists():
        STATE_FILE_PATH.unlink()
    print("🔄 Optimization state reset")
