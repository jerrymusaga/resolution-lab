"""
Resolution Lab - Authentication Service
Handles Supabase JWT verification and user authentication.
"""

import os
from typing import Optional
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from dotenv import load_dotenv
import jwt

load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# JWT secret is derived from Supabase project
# The JWT secret is your Supabase project's JWT secret (found in Settings > API)
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")

# Initialize clients
supabase_anon: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Security scheme
security = HTTPBearer(auto_error=False)


class AuthUser:
    """Authenticated user data."""
    def __init__(self, id: str, email: str, user_metadata: dict = None):
        self.id = id
        self.email = email
        self.user_metadata = user_metadata or {}
        self.full_name = self.user_metadata.get("full_name", "")
        self.avatar_url = self.user_metadata.get("avatar_url", "")


async def verify_token(token: str) -> Optional[dict]:
    """Verify a Supabase JWT token."""
    try:
        # Use Supabase to verify the token
        response = supabase_admin.auth.get_user(token)
        if response and response.user:
            return {
                "id": response.user.id,
                "email": response.user.email,
                "user_metadata": response.user.user_metadata
            }
        return None
    except Exception as e:
        print(f"Token verification error: {e}")
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> AuthUser:
    """
    Dependency to get the current authenticated user.
    Raises 401 if not authenticated.
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = credentials.credentials
    user_data = await verify_token(token)

    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return AuthUser(
        id=user_data["id"],
        email=user_data["email"],
        user_metadata=user_data.get("user_metadata", {})
    )


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Optional[AuthUser]:
    """
    Dependency to get the current user if authenticated, None otherwise.
    Does not raise an error if not authenticated.
    """
    if not credentials:
        return None

    token = credentials.credentials
    user_data = await verify_token(token)

    if not user_data:
        return None

    return AuthUser(
        id=user_data["id"],
        email=user_data["email"],
        user_metadata=user_data.get("user_metadata", {})
    )


async def get_user_id_from_request(request: Request) -> Optional[str]:
    """
    Extract user_id from request - either from auth token or query param.
    This allows gradual migration from anonymous to authenticated users.
    """
    # First try to get from auth header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        user_data = await verify_token(token)
        if user_data:
            return user_data["id"]

    # Fall back to query parameter (for backwards compatibility)
    user_id = request.query_params.get("user_id")
    return user_id


# Helper functions for Supabase Auth operations

def get_auth_url(provider: str = "google", redirect_to: str = None) -> str:
    """Get OAuth URL for a provider."""
    options = {}
    if redirect_to:
        options["redirect_to"] = redirect_to

    response = supabase_anon.auth.sign_in_with_oauth({
        "provider": provider,
        "options": options
    })
    return response.url if response else None


async def sign_out(token: str) -> bool:
    """Sign out a user."""
    try:
        supabase_admin.auth.admin.sign_out(token)
        return True
    except Exception:
        return False
