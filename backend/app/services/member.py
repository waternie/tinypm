"""成员服务模块。"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.member import Member


def list_members(db: Session) -> list[Member]:
    """获取成员列表。"""
    return db.query(Member).order_by(Member.name.asc(), Member.id.asc()).all()


def get_member(db: Session, member_id: int) -> Member:
    """根据ID获取成员。"""
    member = db.query(Member).filter(Member.id == member_id).first()
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"成员ID {member_id} 不存在",
        )
    return member


def create_member(db: Session, name: str) -> Member:
    """创建成员。"""
    normalized_name = name.strip()
    existing = db.query(Member).filter(Member.name == normalized_name).first()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"成员姓名“{normalized_name}”已存在",
        )

    member = Member(name=normalized_name)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


def update_member(db: Session, member_id: int, name: str | None) -> Member:
    """更新成员信息。"""
    member = get_member(db, member_id)
    if name is not None:
        normalized_name = name.strip()
        if not normalized_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="成员姓名不能为空",
            )

        conflict = (
            db.query(Member)
            .filter(Member.name == normalized_name, Member.id != member_id)
            .first()
        )
        if conflict is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"成员姓名“{normalized_name}”已被使用",
            )
        member.name = normalized_name

    db.commit()
    db.refresh(member)
    return member


def delete_member(db: Session, member_id: int) -> None:
    """删除成员。"""
    member = get_member(db, member_id)
    db.delete(member)
    db.commit()
