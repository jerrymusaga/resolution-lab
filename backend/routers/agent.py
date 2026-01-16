"""
Resolution Lab - Agent API Router

Exposes the AI Coach Agent and Opik Experiments features.
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import opik

from services.coach_agent import coach_agent, CoachAgentResponse
from services.opik_experiments import prompt_experiment, PROMPT_VARIANTS


router = APIRouter(prefix="/api/agent", tags=["agent"])


class AgentRequest(BaseModel):
    goal_title: str
    goal_description: Optional[str] = ""


class AgentRunResponse(BaseModel):
    """Response from running the AI Coach Agent"""
    success: bool
    message: str
    agent_response: Optional[dict] = None
    trace_url: Optional[str] = None


@router.post("/run", response_model=AgentRunResponse)
async def run_agent(
    request: AgentRequest,
    user_id: str = Query(..., description="User ID")
):
    """
    Run the full AI Coach Agent loop.
    
    This triggers the complete agent workflow:
    OBSERVE → THINK → PLAN → ACT → EVALUATE → LEARN
    
    Every step is traced in Opik for full observability.
    """
    
    try:
        response = await coach_agent.run(
            user_id=user_id,
            goal_title=request.goal_title,
            goal_description=request.goal_description or ""
        )
        
        return AgentRunResponse(
            success=True,
            message="Agent completed successfully",
            agent_response={
                "thought": {
                    "observation": response.thought.observation,
                    "analysis": response.thought.analysis,
                    "hypothesis": response.thought.hypothesis,
                    "confidence": response.thought.confidence
                },
                "plan": {
                    "chosen_strategy": response.plan.chosen_strategy.value,
                    "reasoning": response.plan.reasoning,
                    "expected_effectiveness": response.plan.expected_effectiveness,
                    "personalization_notes": response.plan.personalization_notes
                },
                "action": {
                    "message": response.action.message,
                    "strategy_used": response.action.strategy_used.value,
                    "tone": response.action.tone,
                    "estimated_impact": response.action.estimated_impact
                },
                "evaluation": {
                    "quality_score": response.evaluation.quality_score,
                    "relevance_score": response.evaluation.relevance_score,
                    "personalization_score": response.evaluation.personalization_score,
                    "overall_score": response.evaluation.overall_score,
                    "improvement_suggestions": response.evaluation.improvement_suggestions
                }
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@router.get("/explain")
async def explain_agent():
    """
    Get explanation of how the AI Coach Agent works.
    
    Useful for demos and documentation.
    """
    
    return {
        "name": "AI Coach Agent",
        "version": "1.0.0",
        "description": "An autonomous agent that reasons about user motivation patterns",
        "workflow": [
            {
                "step": 1,
                "name": "OBSERVE",
                "description": "Gather user history, experiment data, and context",
                "opik_trace": "agent_observe"
            },
            {
                "step": 2,
                "name": "THINK",
                "description": "Reason about patterns using Chain-of-Thought",
                "opik_trace": "agent_think"
            },
            {
                "step": 3,
                "name": "PLAN",
                "description": "Decide on intervention strategy using multi-armed bandit",
                "opik_trace": "agent_plan"
            },
            {
                "step": 4,
                "name": "ACT",
                "description": "Generate personalized motivation message",
                "opik_trace": "agent_act"
            },
            {
                "step": 5,
                "name": "EVALUATE",
                "description": "Self-assess output quality using LLM-as-judge",
                "opik_trace": "agent_evaluate"
            },
            {
                "step": 6,
                "name": "LEARN",
                "description": "Log learning signals for future improvement",
                "opik_trace": "agent_learn"
            }
        ],
        "opik_features_used": [
            "Nested traces (parent-child relationships)",
            "Custom tags for filtering",
            "Output logging at each step",
            "LLM-as-judge evaluation"
        ]
    }


# ============================================
# Prompt Experiments Endpoints
# ============================================

@router.get("/experiments/variants")
async def list_prompt_variants():
    """List all available prompt variants for A/B testing"""
    
    return {
        "variants": [
            {
                "id": vid,
                "name": variant["name"],
                "description": variant["description"]
            }
            for vid, variant in PROMPT_VARIANTS.items()
        ],
        "total": len(PROMPT_VARIANTS)
    }


@router.get("/experiments/report")
async def get_experiment_report():
    """
    Get the current A/B test results for prompt variants.
    
    Shows which prompt templates are performing best.
    """
    
    return prompt_experiment.get_experiment_report()


@router.post("/experiments/test")
async def run_prompt_experiment(
    goal_title: str = Query(...),
    user_id: str = Query(...)
):
    """
    Run a single prompt experiment.
    
    Selects a prompt variant, generates a message, and evaluates it.
    """
    
    # Select variant
    variant = prompt_experiment.select_variant(user_id)
    
    # For demo purposes, generate a simple quality score
    # In production, this would use the actual LLM output
    import random
    quality_score = random.uniform(0.5, 0.95)
    
    # Record result
    result = prompt_experiment.record_result(
        variant_id=variant["variant_id"],
        quality_score=quality_score
    )
    
    return {
        "selected_variant": variant,
        "quality_score": quality_score,
        "result": result,
        "experiment_report": prompt_experiment.get_experiment_report()
    }
