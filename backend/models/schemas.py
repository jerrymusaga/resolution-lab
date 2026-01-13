"""
Resolution Lab - Pydantic Schemas
API request and response models.
"""

from datetime import datetime, date
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field
from uuid import UUID


# ===================
# Enums
# ===================

class GoalFrequency(str, Enum):
    """How often the goal should be completed."""
    DAILY = "daily"
    WEEKLY = "weekly"
    CUSTOM = "custom"


class GoalStatus(str, Enum):
    """Current status of a goal."""
    ACTIVE = "active"
    COMPLETED = "completed"
    ABANDONED = "abandoned"
    PAUSED = "paused"


class InterventionStrategy(str, Enum):
    """Types of motivation strategies we test."""
    GENTLE_REMINDER = "gentle_reminder"
    ACCOUNTABILITY = "accountability"
    STREAK_GAMIFICATION = "streak_gamification"
    SOCIAL_COMPARISON = "social_comparison"
    LOSS_AVERSION = "loss_aversion"
    REWARD_PREVIEW = "reward_preview"
    IDENTITY_REINFORCEMENT = "identity_reinforcement"
    MICRO_COMMITMENT = "micro_commitment"


class UserSentiment(str, Enum):
    """Sentiment of user's response to intervention."""
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"


# ===================
# User Schemas
# ===================

class UserProfileBase(BaseModel):
    """Base user profile fields."""
    display_name: Optional[str] = None
    timezone: str = "UTC"


class UserProfileCreate(UserProfileBase):
    """Schema for creating a user profile."""
    pass


class UserProfile(UserProfileBase):
    """Full user profile with ID and timestamps."""
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


# ===================
# Goal Schemas
# ===================

class GoalBase(BaseModel):
    """Base goal fields."""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    frequency: GoalFrequency = GoalFrequency.DAILY
    target_count: int = Field(default=1, ge=1, le=100)


class GoalCreate(GoalBase):
    """Schema for creating a new goal."""
    start_date: Optional[date] = None  # Defaults to today
    end_date: Optional[date] = None


class GoalUpdate(BaseModel):
    """Schema for updating a goal."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    status: Optional[GoalStatus] = None
    end_date: Optional[date] = None


class Goal(GoalBase):
    """Full goal with ID and timestamps."""
    id: UUID
    user_id: UUID
    start_date: date
    end_date: Optional[date]
    status: GoalStatus
    created_at: datetime
    
    # Computed fields for dashboard
    current_streak: Optional[int] = 0
    total_completions: Optional[int] = 0
    completion_rate: Optional[float] = 0.0
    
    class Config:
        from_attributes = True


# ===================
# Intervention Schemas
# ===================

class InterventionBase(BaseModel):
    """Base intervention fields."""
    strategy: InterventionStrategy
    message: str


class InterventionCreate(BaseModel):
    """Schema for creating an intervention (internal use)."""
    goal_id: UUID
    strategy: InterventionStrategy


class Intervention(InterventionBase):
    """Full intervention with tracking info."""
    id: UUID
    user_id: UUID
    goal_id: UUID
    sent_at: datetime
    opik_trace_id: Optional[str] = None
    
    class Config:
        from_attributes = True


class InterventionResponse(BaseModel):
    """Response sent to user with intervention message."""
    intervention_id: UUID
    goal_title: str
    strategy: InterventionStrategy
    message: str
    sent_at: datetime


# ===================
# Outcome Schemas
# ===================

class OutcomeCreate(BaseModel):
    """Schema for recording an outcome (user check-in)."""
    intervention_id: UUID
    completed: bool
    user_feedback: Optional[str] = Field(None, max_length=500)


class Outcome(BaseModel):
    """Full outcome with all tracking info."""
    id: UUID
    intervention_id: UUID
    user_id: UUID
    goal_id: UUID
    completed: bool
    response_time_seconds: Optional[int] = None
    user_feedback: Optional[str] = None
    recorded_at: datetime
    
    class Config:
        from_attributes = True


# ===================
# Strategy Stats Schemas
# ===================

class StrategyStats(BaseModel):
    """Statistics for a single strategy for a user."""
    strategy: InterventionStrategy
    total_interventions: int
    successful_completions: int
    completion_rate: float  # 0.0 to 1.0
    avg_response_time_seconds: Optional[float] = None
    effectiveness_score: float  # Our composite score


class UserInsights(BaseModel):
    """Complete insights for a user's motivation patterns."""
    user_id: UUID
    total_goals: int
    active_goals: int
    overall_completion_rate: float
    
    # Strategy effectiveness ranking
    strategy_stats: List[StrategyStats]
    best_strategy: Optional[InterventionStrategy] = None
    worst_strategy: Optional[InterventionStrategy] = None
    
    # Recommendations
    recommendation: str
    
    # Experiment status
    experiment_phase: str  # "exploring" or "optimizing"
    strategies_tested: int
    data_points_collected: int


# ===================
# Experiment Schemas (for Opik integration)
# ===================

class ExperimentRun(BaseModel):
    """Represents a single experiment run in Opik."""
    experiment_name: str
    strategy: InterventionStrategy
    user_id: UUID
    goal_id: UUID
    intervention_message: str
    user_completed: bool
    response_time_seconds: Optional[int]
    effectiveness_score: float
    opik_trace_id: Optional[str]


# ===================
# API Response Schemas
# ===================

class APIResponse(BaseModel):
    """Standard API response wrapper."""
    success: bool
    message: str
    data: Optional[dict] = None


class PaginatedResponse(BaseModel):
    """Paginated list response."""
    items: List
    total: int
    page: int
    per_page: int
    pages: int
