"""智能助理模型。"""

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class AgentSetting(Base):
    """用户级智能助理配置。"""

    __tablename__ = "agent_settings"
    __table_args__ = (UniqueConstraint("user_id", name="uq_agent_settings_user_id"),)

    id = Column(Integer, primary_key=True, autoincrement=True, comment="配置ID")
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="关联用户ID",
    )
    model = Column(String(128), nullable=False, comment="默认模型")
    api_key = Column(Text, nullable=True, comment="大模型API Key")
    api_base_url = Column(String(512), nullable=False, comment="大模型API地址")
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
        return f"<AgentSetting(id={self.id}, user_id={self.user_id}, model='{self.model}')>"


class AgentSession(Base):
    """智能助理会话。"""

    __tablename__ = "agent_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="会话ID")
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="关联用户ID",
    )
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        comment="当前项目ID",
    )
    title = Column(String(128), nullable=False, default="新对话", comment="会话标题")
    skill_id = Column(String(64), nullable=False, default="general", comment="技能ID")
    system_prompt = Column(Text, nullable=True, comment="系统角色设定Prompt")
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
    last_message_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="最后消息时间",
    )

    messages = relationship(
        "AgentMessage",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="AgentMessage.id",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        """返回调试信息。"""
        return f"<AgentSession(id={self.id}, user_id={self.user_id}, title='{self.title}')>"


class AgentMessage(Base):
    """智能助理消息。"""

    __tablename__ = "agent_messages"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="消息ID")
    session_id = Column(
        Integer,
        ForeignKey("agent_sessions.id", ondelete="CASCADE"),
        nullable=False,
        comment="关联会话ID",
    )
    role = Column(String(16), nullable=False, comment="消息角色")
    content = Column(Text, nullable=False, comment="消息内容")
    model = Column(String(128), nullable=True, comment="响应模型")
    tool_calls_json = Column(Text, nullable=True, comment="工具调用摘要JSON")
    is_error = Column(Boolean, nullable=False, default=False, comment="是否为错误消息")
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="创建时间",
    )

    session = relationship("AgentSession", back_populates="messages")

    def __repr__(self) -> str:
        """返回调试信息。"""
        return f"<AgentMessage(id={self.id}, session_id={self.session_id}, role='{self.role}')>"
