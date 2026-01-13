"""
Resolution Lab - Main FastAPI Application
An AI coach that runs behavioral experiments to discover what motivates YOU.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import opik
import litellm

from config import get_settings
from routers import goals_router, interventions_router, insights_router

# Load settings
settings = get_settings()


def configure_opik():
    """Configure Opik for tracing and observability."""
    if settings.opik_api_key:
        opik.configure(
            api_key=settings.opik_api_key,
            workspace=settings.opik_workspace,
            project_name=settings.opik_project_name,
        )
        print(f"✅ Opik configured for project: {settings.opik_project_name}")
    else:
        print("⚠️ OPIK_API_KEY not set - tracing disabled")


def configure_litellm():
    """Configure LiteLLM for LLM calls with Opik callback."""
    # Set Google API key for Gemini
    if settings.google_api_key:
        os.environ["GEMINI_API_KEY"] = settings.google_api_key
        print("✅ Google Gemini API configured")
    else:
        print("⚠️ GOOGLE_API_KEY not set - LLM calls will fail")
    
    # Enable Opik callback for automatic tracing of all LLM calls
    litellm.callbacks = ["opik"]
    print("✅ LiteLLM Opik callback enabled")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan - startup and shutdown."""
    # Startup
    print(f"🚀 Starting {settings.app_name} v{settings.app_version}")
    configure_opik()
    configure_litellm()
    
    yield
    
    # Shutdown
    print("👋 Shutting down Resolution Lab")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="An AI coach that runs behavioral experiments to discover your personal motivation formula.",
    version=settings.app_version,
    lifespan=lifespan,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Update in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(goals_router, prefix="/api")
app.include_router(interventions_router, prefix="/api")
app.include_router(insights_router, prefix="/api")


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.app_version,
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "message": "Welcome to Resolution Lab API",
        "docs": "/docs",
        "health": "/health",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
