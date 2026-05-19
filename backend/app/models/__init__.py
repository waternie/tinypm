"""模型包初始化模块。"""

from sqlalchemy.orm import Session

from app.config import settings
from app.models.member import Member
from app.models.project import (
    Project,
    ProjectCostRecord,
    ProjectDocumentFile,
    ProjectIssue,
    ProjectIssueImage,
    ProjectMilestone,
    ProjectPlan,
    ProjectRequirement,
)
from app.models.user import USER_ROLE_ADMIN, User

__all__ = [
    "User",
    "Member",
    "Project",
    "ProjectMilestone",
    "ProjectPlan",
    "ProjectRequirement",
    "ProjectIssue",
    "ProjectIssueImage",
    "ProjectCostRecord",
    "ProjectDocumentFile",
]


def seed_all(db: Session) -> None:
    """初始化平台默认管理员。"""
    if db.query(User).count() > 0:
        return

    from app.services.auth import hash_password

    admin_user = User(
        username=settings.INITIAL_ADMIN_USERNAME,
        display_name=settings.INITIAL_ADMIN_DISPLAY_NAME,
        password_hash=hash_password(settings.INITIAL_ADMIN_PASSWORD),
        role=USER_ROLE_ADMIN,
        is_active=True,
    )
    db.add(admin_user)
    db.commit()
