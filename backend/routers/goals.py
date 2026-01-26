"""
Resolution Lab - Goals Router
API endpoints for goal management.
Uses Supabase for persistence, with in-memory fallback.
"""

from datetime import date, datetime
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query

from models.schemas import (
    Goal,
    GoalCreate,
    GoalUpdate,
    GoalStatus,
    GoalFrequency,
    APIResponse,
)

# Import database service
try:
    from services.database import (
        DB_ENABLED,
        get_user_goals as db_get_user_goals,
        get_goal_by_id as db_get_goal_by_id,
        create_db_goal,
        update_goal as db_update_goal,
        delete_db_goal,
        update_goal_stats as db_update_goal_stats,
    )
except ImportError:
    DB_ENABLED = False

router = APIRouter(prefix="/goals", tags=["Goals"])


# ===================
# In-Memory Storage (fallback when Supabase not configured)
# ===================

_goals_db: dict[str, Goal] = {}


def _db_row_to_goal(row: dict) -> Goal:
    """Convert database row to Goal model."""
    created_at = row.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    elif created_at is None:
        created_at = datetime.utcnow()

    start_date_val = row.get("start_date")
    if isinstance(start_date_val, str):
        start_date_val = date.fromisoformat(start_date_val)
    elif start_date_val is None:
        start_date_val = date.today()

    end_date_val = row.get("end_date")
    if isinstance(end_date_val, str):
        end_date_val = date.fromisoformat(end_date_val)

    return Goal(
        id=UUID(row["id"]),
        user_id=UUID(row["user_id"]),
        title=row["title"],
        description=row.get("description"),
        frequency=GoalFrequency(row.get("frequency", "daily")),
        target_count=row.get("target_count", 1),
        start_date=start_date_val,
        end_date=end_date_val,
        status=GoalStatus(row.get("status", "active")),
        created_at=created_at,
        current_streak=row.get("current_streak", 0),
        total_completions=row.get("total_completions", 0),
        completion_rate=row.get("completion_rate", 0.0),
    )


def _create_mock_goal(goal_create: GoalCreate, user_id: str) -> Goal:
    """Create a Goal object from GoalCreate data (for in-memory fallback)."""
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
    user_id: str = Query(..., description="User ID"),
):
    """Create a new goal for a user."""
    if DB_ENABLED:
        # Use Supabase
        db_goal = create_db_goal(
            user_id=user_id,
            title=goal.title,
            description=goal.description,
            frequency=goal.frequency.value if goal.frequency else "daily",
            target_count=goal.target_count,
            start_date=goal.start_date.isoformat() if goal.start_date else None,
            end_date=goal.end_date.isoformat() if goal.end_date else None,
        )
        if db_goal:
            return _db_row_to_goal(db_goal)
        raise HTTPException(status_code=500, detail="Failed to create goal in database")
    else:
        # Fallback to in-memory
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
    """List all goals for a user."""
    if DB_ENABLED:
        # Use Supabase
        status_str = status.value if status else None
        db_goals = db_get_user_goals(user_id, status=status_str)
        goals = [_db_row_to_goal(row) for row in db_goals]
        return goals[offset:offset + limit]
    else:
        # Fallback to in-memory
        user_goals = [
            goal for goal in _goals_db.values()
            if str(goal.user_id) == user_id
        ]
        if status:
            user_goals = [g for g in user_goals if g.status == status]
        user_goals.sort(key=lambda g: g.created_at, reverse=True)
        return user_goals[offset:offset + limit]


@router.get("/{goal_id}", response_model=Goal)
async def get_goal(
    goal_id: UUID,
    user_id: str = Query(..., description="User ID"),
):
    """Get a specific goal by ID."""
    if DB_ENABLED:
        db_goal = db_get_goal_by_id(str(goal_id))
        if not db_goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        if db_goal["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this goal")
        return _db_row_to_goal(db_goal)
    else:
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
    if DB_ENABLED:
        db_goal = db_get_goal_by_id(str(goal_id))
        if not db_goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        if db_goal["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this goal")

        update_data = goal_update.model_dump(exclude_unset=True)
        # Convert enums to strings
        if "status" in update_data and update_data["status"]:
            update_data["status"] = update_data["status"].value
        if "frequency" in update_data and update_data["frequency"]:
            update_data["frequency"] = update_data["frequency"].value

        updated = db_update_goal(str(goal_id), update_data)
        if updated:
            return _db_row_to_goal(updated)
        raise HTTPException(status_code=500, detail="Failed to update goal")
    else:
        goal = _goals_db.get(str(goal_id))
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        if str(goal.user_id) != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to update this goal")

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
    if DB_ENABLED:
        db_goal = db_get_goal_by_id(str(goal_id))
        if not db_goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        if db_goal["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this goal")

        title = db_goal["title"]
        if delete_db_goal(str(goal_id)):
            return APIResponse(success=True, message=f"Goal '{title}' deleted successfully")
        raise HTTPException(status_code=500, detail="Failed to delete goal")
    else:
        goal = _goals_db.get(str(goal_id))
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        if str(goal.user_id) != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this goal")

        del _goals_db[str(goal_id)]
        return APIResponse(success=True, message=f"Goal '{goal.title}' deleted successfully")


@router.post("/{goal_id}/complete", response_model=Goal)
async def mark_goal_complete(
    goal_id: UUID,
    user_id: str = Query(..., description="User ID"),
):
    """Mark a goal as completed."""
    if DB_ENABLED:
        db_goal = db_get_goal_by_id(str(goal_id))
        if not db_goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        if db_goal["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        updated = db_update_goal(str(goal_id), {"status": "completed"})
        if updated:
            return _db_row_to_goal(updated)
        raise HTTPException(status_code=500, detail="Failed to update goal")
    else:
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
    if DB_ENABLED:
        db_goal = db_get_goal_by_id(str(goal_id))
        if not db_goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        if db_goal["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")

        updated = db_update_goal(str(goal_id), {"status": "paused"})
        if updated:
            return _db_row_to_goal(updated)
        raise HTTPException(status_code=500, detail="Failed to update goal")
    else:
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
    if DB_ENABLED:
        db_goal = db_get_goal_by_id(str(goal_id))
        if not db_goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        if db_goal["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        if db_goal.get("status") != "paused":
            raise HTTPException(status_code=400, detail="Goal is not paused")

        updated = db_update_goal(str(goal_id), {"status": "active"})
        if updated:
            return _db_row_to_goal(updated)
        raise HTTPException(status_code=500, detail="Failed to update goal")
    else:
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
# Helper functions for other routers
# ===================

def get_goal_by_id(goal_id: str) -> Optional[Goal]:
    """Get a goal by ID (used by other routers)."""
    if DB_ENABLED:
        db_goal = db_get_goal_by_id(goal_id)
        if db_goal:
            return _db_row_to_goal(db_goal)
        return None
    else:
        return _goals_db.get(goal_id)


def update_goal_stats(goal_id: str, completed: bool):
    """Update goal statistics after a check-in."""
    if DB_ENABLED:
        db_update_goal_stats(goal_id, completed)
    else:
        goal = _goals_db.get(goal_id)
        if goal:
            goal.total_completions = (goal.total_completions or 0) + (1 if completed else 0)
            if completed:
                goal.current_streak = (goal.current_streak or 0) + 1
            else:
                goal.current_streak = 0
            _goals_db[goal_id] = goal
