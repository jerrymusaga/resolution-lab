"""
Resolution Lab - Reminder Service

Manages goal reminders with full Opik tracing and evaluation.
Tracks reminder effectiveness to optimize notification timing and content.
"""

import opik
from opik import track
from opik.opik_context import get_current_trace_data, update_current_trace
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from dataclasses import dataclass


@dataclass
class ReminderResult:
    """Result from generating a reminder."""
    user_id: str
    goals_needing_checkin: List[Dict[str, Any]]
    reminder_count: int
    reminder_message: str
    urgency_level: str  # low, medium, high
    generated_at: str


class ReminderService:
    """
    Manages reminders with Opik observability.

    Tracks:
    - When reminders are shown to users
    - Which goals trigger reminders
    - User engagement with reminders
    - Reminder effectiveness over time
    """

    def __init__(self):
        self.client = opik.Opik()

    @track(name="generate_reminder", tags=["reminder", "notification"])
    def generate_reminder(
        self,
        user_id: str,
        goals: List[Dict[str, Any]],
        goal_id: Optional[str] = None
    ) -> ReminderResult:
        """
        Generate a reminder for goals that need check-in.

        This is traced in Opik to measure:
        - How often users see reminders
        - Which goals trigger the most reminders
        - Reminder timing patterns
        """
        # Set thread_id if specific goal
        if goal_id:
            update_current_trace(thread_id=f"goal_{goal_id}")

        # Filter goals needing check-in
        goals_needing = [
            g for g in goals
            if g.get("status") == "active"
            and not g.get("checked_in_today", False)
            and g.get("can_check_in", True)
        ]

        # Determine urgency based on various factors
        urgency = self._calculate_urgency(goals_needing)

        # Generate appropriate reminder message
        message = self._generate_reminder_message(goals_needing, urgency)

        result = ReminderResult(
            user_id=user_id,
            goals_needing_checkin=[
                {"id": g.get("id"), "title": g.get("title")}
                for g in goals_needing
            ],
            reminder_count=len(goals_needing),
            reminder_message=message,
            urgency_level=urgency,
            generated_at=datetime.now(timezone.utc).isoformat()
        )

        # Log feedback scores for reminder generation
        self._log_reminder_scores(result)

        return result

    @track(name="track_reminder_interaction", tags=["reminder", "engagement"])
    def track_reminder_interaction(
        self,
        user_id: str,
        goal_id: str,
        interaction_type: str,  # "viewed", "clicked", "dismissed"
        time_to_action_seconds: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Track how users interact with reminders.

        This helps evaluate reminder effectiveness:
        - Click-through rate
        - Time to action
        - Dismissal patterns
        """
        update_current_trace(thread_id=f"goal_{goal_id}")

        # Calculate engagement score
        if interaction_type == "clicked":
            engagement_score = 1.0
        elif interaction_type == "viewed":
            engagement_score = 0.5
        else:  # dismissed
            engagement_score = 0.2

        # Adjust for response time
        if time_to_action_seconds is not None:
            if time_to_action_seconds < 60:
                time_score = 1.0
            elif time_to_action_seconds < 300:
                time_score = 0.8
            elif time_to_action_seconds < 900:
                time_score = 0.5
            else:
                time_score = 0.3
        else:
            time_score = 0.5

        # Log feedback scores
        try:
            trace_data = get_current_trace_data()
            if trace_data and trace_data.id:
                scores = [
                    {
                        "id": trace_data.id,
                        "name": "reminder_engagement",
                        "value": engagement_score,
                        "reason": f"User {interaction_type} reminder"
                    },
                    {
                        "id": trace_data.id,
                        "name": "reminder_response_time",
                        "value": time_score,
                        "reason": f"Response time: {time_to_action_seconds}s" if time_to_action_seconds else "No timing data"
                    }
                ]
                self.client.log_traces_feedback_scores(scores=scores)
                print(f"✅ Logged reminder interaction scores for {interaction_type}")
        except Exception as e:
            print(f"❌ Failed to log reminder scores: {e}")

        return {
            "user_id": user_id,
            "goal_id": goal_id,
            "interaction_type": interaction_type,
            "engagement_score": engagement_score,
            "time_score": time_score,
            "tracked_at": datetime.now(timezone.utc).isoformat()
        }

    def _calculate_urgency(self, goals: List[Dict[str, Any]]) -> str:
        """Calculate reminder urgency based on goal data."""
        if not goals:
            return "low"

        # High urgency: multiple goals or goals with streaks at risk
        streak_goals = [g for g in goals if (g.get("current_streak") or 0) > 0]

        if len(goals) >= 3 or len(streak_goals) >= 2:
            return "high"
        elif len(goals) >= 2 or len(streak_goals) >= 1:
            return "medium"
        else:
            return "low"

    def _generate_reminder_message(
        self,
        goals: List[Dict[str, Any]],
        urgency: str
    ) -> str:
        """Generate an appropriate reminder message."""
        if not goals:
            return ""

        count = len(goals)

        if count == 1:
            title = goals[0].get("title", "your goal")
            streak = goals[0].get("current_streak", 0)

            if streak > 0:
                return f"Don't break your {streak}-day streak on '{title}'!"
            else:
                return f"Time to check in on '{title}'"
        else:
            if urgency == "high":
                return f"You have {count} goals waiting - stay on track!"
            else:
                return f"{count} goals are ready for your check-in today"

    def _log_reminder_scores(self, result: ReminderResult) -> None:
        """Log feedback scores for reminder generation."""
        try:
            trace_data = get_current_trace_data()
            if trace_data and trace_data.id:
                # Score based on reminder characteristics
                urgency_scores = {"low": 0.3, "medium": 0.6, "high": 0.9}
                urgency_score = urgency_scores.get(result.urgency_level, 0.5)

                scores = [
                    {
                        "id": trace_data.id,
                        "name": "reminder_urgency",
                        "value": urgency_score,
                        "reason": f"Urgency: {result.urgency_level}"
                    },
                    {
                        "id": trace_data.id,
                        "name": "reminder_goal_count",
                        "value": min(result.reminder_count / 5, 1.0),  # Normalize to 0-1
                        "reason": f"{result.reminder_count} goals need check-in"
                    }
                ]
                self.client.log_traces_feedback_scores(scores=scores)
        except Exception as e:
            print(f"⚠️ Failed to log reminder scores: {e}")


# Singleton instance
_reminder_service: Optional[ReminderService] = None


def get_reminder_service() -> ReminderService:
    """Get or create the reminder service singleton."""
    global _reminder_service
    if _reminder_service is None:
        _reminder_service = ReminderService()
    return _reminder_service
