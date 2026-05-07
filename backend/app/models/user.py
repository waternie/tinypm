"""用户模型。"""

from sqlalchemy import Boolean, Column, DateTime, Integer, String, func

from app.database import Base

USER_ROLE_ADMIN = "admin"
USER_ROLE_MANAGER = "manager"
USER_ROLE_MEMBER = "member"
USER_ROLES = (
    USER_ROLE_ADMIN,
    USER_ROLE_MANAGER,
    USER_ROLE_MEMBER,
)


class User(Base):
    """平台用户表。"""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="用户ID")
    username = Column(String(64), unique=True, nullable=False, index=True, comment="登录用户名")
    display_name = Column(String(64), nullable=True, comment="展示名称")
    password_hash = Column(String(128), nullable=False, comment="密码哈希")
    role = Column(String(32), nullable=False, default=USER_ROLE_MEMBER, comment="权限角色")
    is_active = Column(Boolean, nullable=False, default=True, comment="是否启用")
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="创建时间",
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="更新时间",
    )

    def __repr__(self) -> str:
        """返回调试信息。"""
        return f"<User(id={self.id}, username='{self.username}', role='{self.role}')>"
