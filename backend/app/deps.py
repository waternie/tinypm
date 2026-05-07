"""认证依赖模块。"""

from collections.abc import Iterable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import USER_ROLE_ADMIN, USER_ROLE_MANAGER, User
from app.services.auth import decode_access_token

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """解析访问令牌并返回当前登录用户。"""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="缺少认证令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="无效的认证令牌",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="认证令牌缺少用户信息",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="认证令牌中的用户ID格式错误",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = db.query(User).filter(User.id == user_id_int).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="当前用户不可用",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def _ensure_role(user: User, allowed_roles: Iterable[str]) -> User:
    """校验当前用户是否具备指定角色。"""
    if user.role not in set(allowed_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前账号没有权限执行此操作",
        )
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """要求当前用户具备管理员权限。"""
    return _ensure_role(current_user, [USER_ROLE_ADMIN])


def require_manager_or_admin(current_user: User = Depends(get_current_user)) -> User:
    """要求当前用户具备管理员或经理权限。"""
    return _ensure_role(current_user, [USER_ROLE_ADMIN, USER_ROLE_MANAGER])
