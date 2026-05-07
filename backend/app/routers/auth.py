"""认证路由。"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.auth import AuthenticatedUser, LoginRequest, TokenResponse
from app.services.auth import authenticate_user, create_access_token

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="用户登录",
    description="验证用户名密码，返回 JWT 访问令牌和当前用户信息",
)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    """登录并返回访问令牌。"""
    user = authenticate_user(request.username, request.password, db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(user.id)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=AuthenticatedUser.model_validate(user),
    )


@router.get(
    "/me",
    response_model=AuthenticatedUser,
    summary="获取当前用户",
    description="返回当前登录用户的基本信息",
)
def get_me(current_user: User = Depends(get_current_user)) -> AuthenticatedUser:
    """返回当前登录用户信息。"""
    return AuthenticatedUser.model_validate(current_user)
