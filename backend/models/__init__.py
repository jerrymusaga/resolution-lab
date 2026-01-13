"""
Resolution Lab - Models Package
Database models and Pydantic schemas.
"""

from .schemas import (
    # Enums
    GoalFrequency,
    GoalStatus,
    InterventionStrategy,
    UserSentiment,
    
    # User
    UserProfileBase,
    UserProfileCreate,
    UserProfile,
    
    # Goal
    GoalBase,
    GoalCreate,
    GoalUpdate,
    Goal,
    
    # Intervention
    InterventionBase,
    InterventionCreate,
    Intervention,
    InterventionResponse,
    
    # Outcome
    OutcomeCreate,
    Outcome,
    
    # Stats & Insights
    StrategyStats,
    UserInsights,
    ExperimentRun,
    
    # API
    APIResponse,
    PaginatedResponse,
)

from .database import (
    get_supabase_client,
    get_db,
    DATABASE_SCHEMA,
)

__all__ = [
    # Enums
    "GoalFrequency",
    "GoalStatus", 
    "InterventionStrategy",
    "UserSentiment",
    
    # Schemas
    "UserProfileBase",
    "UserProfileCreate",
    "UserProfile",
    "GoalBase",
    "GoalCreate",
    "GoalUpdate",
    "Goal",
    "InterventionBase",
    "InterventionCreate",
    "Intervention",
    "InterventionResponse",
    "OutcomeCreate",
    "Outcome",
    "StrategyStats",
    "UserInsights",
    "ExperimentRun",
    "APIResponse",
    "PaginatedResponse",
    
    # Database
    "get_supabase_client",
    "get_db",
    "DATABASE_SCHEMA",
]
