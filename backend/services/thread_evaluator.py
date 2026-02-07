"""
Resolution Lab - Thread Evaluation Service

Manages Opik thread lifecycle and evaluation:
- Closing threads to mark them as inactive
- Evaluating inactive threads with feedback scores
- Built-in metrics: Conversation Coherence, User Frustration
"""

import os
import httpx
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
import opik
from opik import track

# Check if evaluation metrics are available
THREAD_EVAL_AVAILABLE = False
evaluate_threads = None
ConversationalCoherenceMetric = None
UserFrustrationMetric = None

try:
    from opik.evaluation import evaluate_threads
    from opik.evaluation.metrics import ConversationalCoherenceMetric, UserFrustrationMetric
    THREAD_EVAL_AVAILABLE = True
except (ImportError, Exception) as e:
    print(f"Thread evaluation metrics not available: {e}")


# Opik API configuration
OPIK_API_URL = os.getenv("OPIK_URL_OVERRIDE", "https://www.comet.com/opik/api")
OPIK_API_KEY = os.getenv("OPIK_API_KEY", "")
OPIK_WORKSPACE = os.getenv("OPIK_WORKSPACE", "default")
OPIK_PROJECT = os.getenv("OPIK_PROJECT_NAME", "resolution-lab")


@dataclass
class ThreadEvaluationResult:
    """Result from evaluating a thread."""
    thread_id: str
    status: str  # "success", "error", "thread_still_active"
    coherence_score: Optional[float] = None
    frustration_score: Optional[float] = None
    feedback_logged: bool = False
    error_message: Optional[str] = None


class ThreadEvaluator:
    """
    Manages Opik thread lifecycle and evaluation.

    Key features:
    1. Close threads programmatically (mark as inactive)
    2. Evaluate inactive threads with built-in metrics
    3. Log aggregated feedback scores to threads
    """

    def __init__(self):
        self.client = opik.Opik()
        self.api_headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OPIK_API_KEY}" if OPIK_API_KEY else "",
            "Comet-Workspace": OPIK_WORKSPACE,
        }

    @track(name="close_thread")
    def close_thread(self, thread_id: str, project_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Close a thread to mark it as inactive.

        Threads must be inactive before feedback scores can be assigned.
        By default, threads become inactive after 15 minutes of no activity.
        This method forces immediate closure.

        Args:
            thread_id: The thread ID to close (e.g., "goal_abc123")
            project_name: Optional project name (defaults to OPIK_PROJECT)

        Returns:
            Dict with status and details
        """
        project = project_name or OPIK_PROJECT

        # Use REST API to close the thread
        url = f"{OPIK_API_URL}/v1/private/traces/threads/close"

        payload = {
            "project_name": project,
            "thread_id": thread_id,
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.put(url, json=payload, headers=self.api_headers)

                if response.status_code == 204:
                    return {
                        "success": True,
                        "thread_id": thread_id,
                        "status": "closed",
                        "message": f"Thread {thread_id} marked as inactive"
                    }
                elif response.status_code == 404:
                    return {
                        "success": False,
                        "thread_id": thread_id,
                        "status": "not_found",
                        "message": f"Thread {thread_id} not found"
                    }
                else:
                    return {
                        "success": False,
                        "thread_id": thread_id,
                        "status": "error",
                        "message": f"Failed to close thread: {response.status_code}"
                    }
        except Exception as e:
            return {
                "success": False,
                "thread_id": thread_id,
                "status": "error",
                "message": f"Error closing thread: {str(e)}"
            }

    @track(name="close_threads_batch")
    def close_threads_batch(self, thread_ids: List[str], project_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Close multiple threads in a batch operation.

        Args:
            thread_ids: List of thread IDs to close
            project_name: Optional project name

        Returns:
            Dict with batch operation results
        """
        project = project_name or OPIK_PROJECT

        url = f"{OPIK_API_URL}/v1/private/traces/threads/close"

        payload = {
            "project_name": project,
            "thread_ids": thread_ids,
        }

        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.put(url, json=payload, headers=self.api_headers)

                if response.status_code == 204:
                    return {
                        "success": True,
                        "thread_ids": thread_ids,
                        "count": len(thread_ids),
                        "status": "closed",
                        "message": f"Closed {len(thread_ids)} threads"
                    }
                else:
                    return {
                        "success": False,
                        "thread_ids": thread_ids,
                        "status": "error",
                        "message": f"Batch close failed: {response.status_code}"
                    }
        except Exception as e:
            return {
                "success": False,
                "thread_ids": thread_ids,
                "status": "error",
                "message": f"Error in batch close: {str(e)}"
            }

    @track(name="evaluate_goal_thread")
    def evaluate_goal_thread(
        self,
        goal_id: str,
        project_name: Optional[str] = None,
        close_first: bool = True
    ) -> ThreadEvaluationResult:
        """
        Evaluate a goal's conversation thread with built-in metrics.

        This evaluates the entire conversation history for a goal,
        measuring coherence and user frustration across all interactions.

        Args:
            goal_id: The goal ID (thread will be "goal_{goal_id}")
            project_name: Optional project name
            close_first: Whether to close the thread first (required for evaluation)

        Returns:
            ThreadEvaluationResult with scores
        """
        if not THREAD_EVAL_AVAILABLE:
            return ThreadEvaluationResult(
                thread_id=f"goal_{goal_id}",
                status="error",
                error_message="Thread evaluation metrics not available. Install opik with evaluation extras."
            )

        thread_id = f"goal_{goal_id}"
        project = project_name or OPIK_PROJECT

        # Close the thread first if requested
        if close_first:
            close_result = self.close_thread(thread_id, project)
            if not close_result.get("success") and close_result.get("status") != "not_found":
                # Thread might already be closed, continue anyway
                pass

        try:
            # Initialize evaluation metrics
            coherence_metric = ConversationalCoherenceMetric()
            frustration_metric = UserFrustrationMetric()

            # Transform functions to extract meaningful text from trace data
            # Coach agent traces have structured input/output - we need to extract text
            def extract_input(trace_input):
                """Extract user's goal/request from trace input."""
                if isinstance(trace_input, dict):
                    # Try common patterns from our traces
                    if "goal_title" in trace_input:
                        return f"Goal: {trace_input.get('goal_title', '')}. {trace_input.get('goal_description', '')}"
                    if "content" in trace_input:
                        return trace_input["content"]
                    if "input" in trace_input:
                        return str(trace_input["input"])
                    # Fallback: stringify the dict
                    return str(trace_input)
                return str(trace_input) if trace_input else ""

            def extract_output(trace_output):
                """Extract agent's response from trace output."""
                if isinstance(trace_output, dict):
                    # Try common patterns from our traces
                    if "action" in trace_output and isinstance(trace_output["action"], dict):
                        return trace_output["action"].get("message", str(trace_output))
                    if "message" in trace_output:
                        return trace_output["message"]
                    if "output" in trace_output:
                        return str(trace_output["output"])
                    if "content" in trace_output:
                        return trace_output["content"]
                    # Fallback: stringify the dict
                    return str(trace_output)
                return str(trace_output) if trace_output else ""

            # Run thread evaluation - filter for inactive threads with matching ID
            results = evaluate_threads(
                project_name=project,
                filter_string=f'id = "{thread_id}" AND status = "inactive"',
                eval_project_name=f"{project}_thread_evaluation",
                metrics=[coherence_metric, frustration_metric],
                trace_input_transform=extract_input,
                trace_output_transform=extract_output,
            )

            # Extract scores from results
            coherence_score = None
            frustration_score = None

            if hasattr(results, 'scores') and results.scores:
                for score in results.scores:
                    if "coherence" in score.name.lower():
                        coherence_score = score.value
                    elif "frustration" in score.name.lower():
                        frustration_score = score.value

            return ThreadEvaluationResult(
                thread_id=thread_id,
                status="success",
                coherence_score=coherence_score,
                frustration_score=frustration_score,
                feedback_logged=True
            )

        except Exception as e:
            return ThreadEvaluationResult(
                thread_id=thread_id,
                status="error",
                error_message=str(e)
            )

    def get_thread_status(self) -> Dict[str, Any]:
        """
        Get the status of thread evaluation capabilities.
        """
        return {
            "thread_eval_available": THREAD_EVAL_AVAILABLE,
            "opik_project": OPIK_PROJECT,
            "opik_workspace": OPIK_WORKSPACE,
            "capabilities": {
                "close_thread": True,
                "close_threads_batch": True,
                "evaluate_thread": THREAD_EVAL_AVAILABLE,
                "built_in_metrics": [
                    "ConversationalCoherenceMetric",
                    "UserFrustrationMetric"
                ] if THREAD_EVAL_AVAILABLE else []
            },
            "thread_id_format": "goal_{goal_id}",
            "notes": [
                "Threads must be inactive before evaluation",
                "Default inactivity timeout: 15 minutes",
                "Use close_thread() to force immediate closure",
                "Feedback scores are visible in Opik Thread view"
            ]
        }


# Singleton instance
_evaluator_instance: Optional[ThreadEvaluator] = None


def get_thread_evaluator() -> ThreadEvaluator:
    """Get or create the thread evaluator singleton."""
    global _evaluator_instance
    if _evaluator_instance is None:
        _evaluator_instance = ThreadEvaluator()
    return _evaluator_instance
