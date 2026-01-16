"""
Resolution Lab - Services Package
Core business logic for the application.
"""

from .intervention_generator import (
    generate_intervention_message,
    batch_generate_interventions,
    get_fallback_message,
    STRATEGY_PROMPTS,
)

from .experiment_engine import (
    ExperimentEngine,
    experiment_engine,
    StrategyArm,
    UserBanditState,
    EPSILON,
    MIN_SAMPLES_FOR_EXPLOITATION,
    ALL_STRATEGIES,
)

from .analysis_engine import (
    analyze_user_sentiment,
    judge_goal_completion,
    generate_user_recommendation,
    InterventionEffectivenessMetric,
    EngagementMetric,
)

from .coach_agent import (
    AICoachAgent,
    coach_agent,
    CoachAgentResponse,
    AgentThought,
    AgentPlan,
    AgentAction,
    AgentEvaluation,
)

from .opik_experiments import (
    PromptExperiment,
    prompt_experiment,
    PROMPT_VARIANTS,
    MessageQualityMetric,
    StrategyAlignmentMetric,
    CUSTOM_METRICS,
)

__all__ = [
    # Intervention Generator
    "generate_intervention_message",
    "batch_generate_interventions",
    "get_fallback_message",
    "STRATEGY_PROMPTS",
    
    # Experiment Engine
    "ExperimentEngine",
    "experiment_engine",
    "StrategyArm",
    "UserBanditState",
    "EPSILON",
    "MIN_SAMPLES_FOR_EXPLOITATION",
    "ALL_STRATEGIES",
    
    # Analysis Engine
    "analyze_user_sentiment",
    "judge_goal_completion",
    "generate_user_recommendation",
    "InterventionEffectivenessMetric",
    "EngagementMetric",
    
    # AI Coach Agent
    "AICoachAgent",
    "coach_agent",
    "CoachAgentResponse",
    "AgentThought",
    "AgentPlan",
    "AgentAction",
    "AgentEvaluation",
    
    # Opik Experiments
    "PromptExperiment",
    "prompt_experiment",
    "PROMPT_VARIANTS",
    "MessageQualityMetric",
    "StrategyAlignmentMetric",
    "CUSTOM_METRICS",
]
