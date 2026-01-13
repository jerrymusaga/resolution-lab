"""
Resolution Lab - Goals Router
API endpoints for goal management.
"""

from datetime import date, datetime
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Depends, Query

from models.schemas import (
    Goal, 
    GoalCreate, 
    GoalUpdate, 
    GoalStatus,
    GoalFrequency,
    APIResponse,
)
from models.database import get_db

router = APIRouter(prefix="/goals", tags=["Goals"])


# ===================
# In-Memory Storage (for development without Supabase)
# In production, these would use Supabase
# ===================

# Temporary in-memory storage for development
_goals_db: dict[str, Goal] = {}


def _create_mock_goal(goal_create: GoalCreate, user_id: str) -> Goal:
    """Create a Goal object from GoalCreate data."""
    goal_id = uuid4()
    now = datetime.utcnow()
    
    return Goal(
        id=goal_id,
        user_id=UUID(user_id),
        title=goal_create.title,
        description=goal_create.description,
        frequency=goal_create.frequency,
        target_count=goal_create.target_count,
        start_date=goal_create.start_date or date.today(),
        end_date=goal_create.end_date,
        status=GoalStatus.ACTIVE,
        created_at=now,
        current_streak=0,
        total_completions=0,
        completion_rate=0.0,
    )


# ===================
# API Endpoints
# ===================

@router.post("", response_model=Goal, status_code=201)
async def create_goal(
    goal: GoalCreate,
    user_id: str = Query(..., description="User ID (would come from auth in production)"),
):
    """
    Create a new goal for a user.
    
    In production, user_id would come from authentication.
    """
    new_goal = _create_mock_goal(goal, user_id)
    _goals_db[str(new_goal.id)] = new_goal
    
    return new_goal


@router.get("", response_model=List[Goal])
async def list_goals(
    user_id: str = Query(..., description="User ID"),
    status: Optional[GoalStatus] = Query(None, description="Filter by status"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    List all goals for a user.
    
    Optionally filter by status (active, completed, abandoned, paused).
    """
    user_goals = [
        goal for goal in _goals_db.values()
        if str(goal.user_id) == user_id
    ]
    
    if status:
        user_goals = [g for g in user_goals if g.status == status]
    
    # Sort by created_at descending
    user_goals.sort(key=lambda g: g.created_at, reverse=True)
    
    return user_goals[offset:offset + limit]


@router.get("/{goal_id}", response_model=Goal)
async def get_goal(
    goal_id: UUID,
    user_id: str = Query(..., description="User ID"),
):
    """Get a specific goal by ID."""
    goal = _goals_db.get(str(goal_id))
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    if str(goal.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this goal")
    
    return goal


@router.patch("/{goal_id}", response_model=Goal)
async def update_goal(
    goal_id: UUID,
    goal_update: GoalUpdate,
    user_id: str = Query(..., description="User ID"),
):
    """Update a goal."""
    goal = _goals_db.get(str(goal_id))
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    if str(goal.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this goal")
    
    # Update fields
    update_data = goal_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(goal, field, value)
    
    _goals_db[str(goal_id)] = goal
    
    return goal


@router.delete("/{goal_id}", response_model=APIResponse)
async def delete_goal(
    goal_id: UUID,
    user_id: str = Query(..., description="User ID"),
):
    """Delete a goal."""
    goal = _goals_db.get(str(goal_id))
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    if str(goal.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this goal")
    
    del _goals_db[str(goal_id)]
    
    return APIResponse(
        success=True,
        message=f"Goal '{goal.title}' deleted successfully",
    )


@router.post("/{goal_id}/complete", response_model=Goal)
async def mark_goal_complete(
    goal_id: UUID,
    user_id: str = Query(..., description="User ID"),
):
    """Mark a goal as completed."""
    goal = _goals_db.get(str(goal_id))
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    if str(goal.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    goal.status = GoalStatus.COMPLETED
    _goals_db[str(goal_id)] = goal
    
    return goal


@router.post("/{goal_id}/pause", response_model=Goal)
async def pause_goal(
    goal_id: UUID,
    user_id: str = Query(..., description="User ID"),
):
    """Pause a goal temporarily."""
    goal = _goals_db.get(str(goal_id))
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    if str(goal.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    goal.status = GoalStatus.PAUSED
    _goals_db[str(goal_id)] = goal
    
    return goal


@router.post("/{goal_id}/resume", response_model=Goal)
async def resume_goal(
    goal_id: UUID,
    user_id: str = Query(..., description="User ID"),
):
    """Resume a paused goal."""
    goal = _goals_db.get(str(goal_id))
    
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    if str(goal.user_id) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if goal.status != GoalStatus.PAUSED:
        raise HTTPException(status_code=400, detail="Goal is not paused")
    
    goal.status = GoalStatus.ACTIVE
    _goals_db[str(goal_id)] = goal
    
    return goal


# ===================
# Helper function to access goals from other routers
# ===================

def get_goal_by_id(goal_id: str) -> Optional[Goal]:
    """Get a goal by ID (used by other routers)."""
    return _goals_db.get(goal_id)


def update_goal_stats(goal_id: str, completed: bool):
    """Update goal statistics after a check-in."""
    goal = _goals_db.get(goal_id)
    if goal:
        goal.total_completions = (goal.total_completions or 0) + (1 if completed else 0)
        if completed:
            goal.current_streak = (goal.current_streak or 0) + 1
        else:
            goal.current_streak = 0
        _goals_db[goal_id] = goal
