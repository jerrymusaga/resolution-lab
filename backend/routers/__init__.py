"""
Resolution Lab - Routers Package
API route handlers.
"""

from .goals import router as goals_router
from .interventions import router as interventions_router
from .insights import router as insights_router

__all__ = [
    "goals_router",
    "interventions_router", 
    "insights_router",
]
