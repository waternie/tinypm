"""用户管理路由。"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services import user as user_service

router = APIRouter(prefix="/api/users", tags=["用户管理"])


@router.get(
    "",
    response_model=list[UserResponse],
    summary="获取用户列表",
    description="仅管理员可查看平台用户列表",
)
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> list[UserResponse]:
    """获取用户列表。"""
    del current_user
    users = user_service.list_users(db)
    return [UserResponse.model_validate(user) for user in users]


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建用户",
    description="仅管理员可创建平台用户",
)
def create_user(
    data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> UserResponse:
    """创建用户。"""
    del current_user
    user = user_service.create_user(
        db,
        username=data.username,
        password=data.password,
        role=data.role,
        display_name=data.display_name,
        is_active=data.is_active,
    )
    return UserResponse.model_validate(user)


@router.put(
    "/{user_id}",
    response_model=UserResponse,
    summary="更新用户",
    description="仅管理员可更新平台用户",
)
def update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> UserResponse:
    """更新用户。"""
    user = user_service.update_user(
        db,
        user_id=user_id,
        current_user=current_user,
        update_data=data.model_dump(exclude_unset=True),
    )
    return UserResponse.model_validate(user)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除用户",
    description="仅管理员可删除平台用户",
)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
) -> None:
    """删除用户。"""
    user_service.delete_user(db, user_id, current_user)
