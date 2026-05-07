"""成员路由。"""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_manager_or_admin
from app.models.user import User
from app.schemas.member import MemberCreate, MemberResponse, MemberUpdate
from app.services import member as member_service

router = APIRouter(prefix="/api/members", tags=["成员库"])


@router.get(
    "",
    response_model=list[MemberResponse],
    summary="获取成员列表",
    description="返回平台成员库中的所有成员",
)
def list_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MemberResponse]:
    """获取成员列表。"""
    del current_user
    members = member_service.list_members(db)
    return [MemberResponse.model_validate(member) for member in members]


@router.post(
    "",
    response_model=MemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建成员",
    description="新增一名可参与项目分配的成员",
)
def create_member(
    data: MemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> MemberResponse:
    """创建成员。"""
    del current_user
    member = member_service.create_member(db, data.name)
    return MemberResponse.model_validate(member)


@router.put(
    "/{member_id}",
    response_model=MemberResponse,
    summary="更新成员",
    description="更新指定成员的信息",
)
def update_member(
    member_id: int,
    data: MemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> MemberResponse:
    """更新成员。"""
    del current_user
    member = member_service.update_member(db, member_id, data.name)
    return MemberResponse.model_validate(member)


@router.delete(
    "/{member_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除成员",
    description="删除指定成员",
)
def delete_member(
    member_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> None:
    """删除成员。"""
    del current_user
    member_service.delete_member(db, member_id)
