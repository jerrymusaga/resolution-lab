"""
Resolution Lab - Opik Statistics Router
Provides endpoints for Opik observability metrics.
"""

import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx

router = APIRouter(prefix="/api/opik", tags=["opik"])

OPIK_API_KEY = os.getenv("OPIK_API_KEY")
OPIK_WORKSPACE = os.getenv("OPIK_WORKSPACE")
OPIK_PROJECT_NAME = os.getenv("OPIK_PROJECT_NAME", "resolution-lab")


class OpikStats(BaseModel):
    workspace: str
    project_name: str
    dashboard_url: str
    traces_url: str
    api_configured: bool


class OpikProjectInfo(BaseModel):
    workspace: str
    project_name: str
    dashboard_url: str
    traces_url: str
    api_configured: bool
    evaluators: list[str]


@router.get("/stats", response_model=OpikStats)
async def get_opik_stats():
    """Get Opik configuration and dashboard links."""
    if not OPIK_API_KEY or not OPIK_WORKSPACE:
        return OpikStats(
            workspace="",
            project_name="",
            dashboard_url="",
            traces_url="",
            api_configured=False
        )

    base_url = f"https://www.comet.com/opik/{OPIK_WORKSPACE}"
    dashboard_url = f"{base_url}/{OPIK_PROJECT_NAME}"
    traces_url = f"{base_url}/{OPIK_PROJECT_NAME}/traces"

    return OpikStats(
        workspace=OPIK_WORKSPACE,
        project_name=OPIK_PROJECT_NAME,
        dashboard_url=dashboard_url,
        traces_url=traces_url,
        api_configured=True
    )


@router.get("/info", response_model=OpikProjectInfo)
async def get_opik_project_info():
    """Get detailed Opik project information including custom evaluators."""
    if not OPIK_API_KEY or not OPIK_WORKSPACE:
        raise HTTPException(status_code=503, detail="Opik not configured")

    base_url = f"https://www.comet.com/opik/{OPIK_WORKSPACE}"
    dashboard_url = f"{base_url}/{OPIK_PROJECT_NAME}"
    traces_url = f"{base_url}/{OPIK_PROJECT_NAME}/traces"

    # List of custom evaluators we've implemented
    evaluators = [
        "MotivationalMessageEvaluator",
        "InsightQualityEvaluator",
        "AgentReasoningEvaluator"
    ]

    return OpikProjectInfo(
        workspace=OPIK_WORKSPACE,
        project_name=OPIK_PROJECT_NAME,
        dashboard_url=dashboard_url,
        traces_url=traces_url,
        api_configured=True,
        evaluators=evaluators
    )
