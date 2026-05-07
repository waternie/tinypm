"""成员模型。"""

from sqlalchemy import Column, DateTime, Integer, String, func

from app.database import Base


class Member(Base):
    """项目成员表。"""

    __tablename__ = "members"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="成员ID")
    name = Column(String(64), unique=True, nullable=False, comment="成员姓名")
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="创建时间",
    )

    def __repr__(self) -> str:
        """返回调试信息。"""
        return f"<Member(id={self.id}, name='{self.name}')>"
