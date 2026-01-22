"""
Resolution Lab - Authentication Router
Handles auth-related API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional

from services.auth import get_current_user, get_optional_user, AuthUser
from services.database import get_user_profile, initialize_user_data

router = APIRouter(prefix="/api/auth", tags=["auth"])


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class AuthStatusResponse(BaseModel):
    authenticated: bool
    user: Optional[UserResponse] = None


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: AuthUser = Depends(get_current_user)):
    """Get current authenticated user info."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url
    )


@router.get("/status", response_model=AuthStatusResponse)
async def get_auth_status(current_user: Optional[AuthUser] = Depends(get_optional_user)):
    """Check if user is authenticated."""
    if current_user:
        return AuthStatusResponse(
            authenticated=True,
            user=UserResponse(
                id=current_user.id,
                email=current_user.email,
                full_name=current_user.full_name,
                avatar_url=current_user.avatar_url
            )
        )
    return AuthStatusResponse(authenticated=False, user=None)


@router.post("/initialize")
async def initialize_user(current_user: AuthUser = Depends(get_current_user)):
    """
    Initialize data for a newly authenticated user.
    Call this after first login to set up experiment state.
    """
    result = initialize_user_data(current_user.id)
    return {"success": True, "message": "User data initialized", "data": result}


@router.get("/profile")
async def get_profile(current_user: AuthUser = Depends(get_current_user)):
    """Get full user profile from database."""
    profile = get_user_profile(current_user.id)
    if not profile:
        # Profile might not exist yet, return basic info
        return {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "avatar_url": current_user.avatar_url
        }
    return profile
