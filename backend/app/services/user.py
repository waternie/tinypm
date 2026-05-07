"""用户管理服务模块。"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import USER_ROLE_ADMIN, USER_ROLES, User
from app.services.auth import hash_password


def list_users(db: Session) -> list[User]:
    """获取用户列表。"""
    return db.query(User).order_by(User.created_at.asc(), User.id.asc()).all()


def get_user(db: Session, user_id: int) -> User:
    """根据ID获取用户。"""
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"用户ID {user_id} 不存在",
        )
    return user


def _count_admins(db: Session, exclude_user_id: int | None = None) -> int:
    """统计启用中的管理员数量。"""
    query = db.query(User).filter(User.role == USER_ROLE_ADMIN, User.is_active.is_(True))
    if exclude_user_id is not None:
        query = query.filter(User.id != exclude_user_id)
    return query.count()


def create_user(
    db: Session,
    username: str,
    password: str,
    role: str,
    display_name: str | None,
    is_active: bool,
) -> User:
    """创建平台用户。"""
    normalized_username = username.strip()
    if role not in USER_ROLES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="角色不合法")

    existing = db.query(User).filter(User.username == normalized_username).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"用户名“{normalized_username}”已存在",
        )

    user = User(
        username=normalized_username,
        display_name=display_name.strip() if display_name else None,
        password_hash=hash_password(password),
        role=role,
        is_active=is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(
    db: Session,
    user_id: int,
    current_user: User,
    update_data: dict,
) -> User:
    """更新平台用户。"""
    user = get_user(db, user_id)

    if "username" in update_data:
        normalized_username = update_data["username"].strip()
        conflict = (
            db.query(User)
            .filter(User.username == normalized_username, User.id != user_id)
            .first()
        )
        if conflict is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"用户名“{normalized_username}”已存在",
            )
        user.username = normalized_username

    if "display_name" in update_data:
        display_name = update_data["display_name"]
        user.display_name = display_name.strip() if isinstance(display_name, str) and display_name.strip() else None

    if "password" in update_data and update_data["password"]:
        user.password_hash = hash_password(update_data["password"])

    next_role = update_data.get("role", user.role)
    next_is_active = update_data.get("is_active", user.is_active)

    if next_role not in USER_ROLES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="角色不合法")

    if user.role == USER_ROLE_ADMIN and (next_role != USER_ROLE_ADMIN or not next_is_active):
        if _count_admins(db, exclude_user_id=user.id) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="平台至少需要保留一个启用中的管理员账号",
            )

    if current_user.id == user.id and not next_is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能停用当前登录账号",
        )

    user.role = next_role
    user.is_active = next_is_active

    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int, current_user: User) -> None:
    """删除平台用户。"""
    user = get_user(db, user_id)

    if current_user.id == user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不能删除当前登录账号",
        )

    if user.role == USER_ROLE_ADMIN and _count_admins(db, exclude_user_id=user.id) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="平台至少需要保留一个管理员账号",
        )

    db.delete(user)
    db.commit()
