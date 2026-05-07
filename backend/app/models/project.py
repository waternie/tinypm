"""项目管理模型。"""

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


class Project(Base):
    """项目主表。"""

    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="项目ID")
    name = Column(String(256), nullable=False, comment="项目名称")
    status = Column(String(16), nullable=False, default="规划中", comment="项目状态")
    priority = Column(String(8), nullable=False, default="中", comment="项目优先级")
    description = Column(Text, nullable=True, comment="项目描述")
    announcement_markdown = Column(Text, nullable=True, comment="项目公告Markdown内容")
    project_manager = Column(String(64), nullable=True, comment="项目负责人")
    client_name = Column(String(128), nullable=True, comment="客户名称")
    git_url = Column(String(512), nullable=True, comment="Git仓库链接")
    start_date = Column(Date, nullable=True, comment="开始日期")
    planned_end_date = Column(Date, nullable=True, comment="计划结束日期")
    actual_end_date = Column(Date, nullable=True, comment="实际结束日期")
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

    milestones = relationship(
        "ProjectMilestone",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    plans = relationship(
        "ProjectPlan",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    requirements = relationship(
        "ProjectRequirement",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    issues = relationship(
        "ProjectIssue",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    cost_records = relationship(
        "ProjectCostRecord",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        """返回调试信息。"""
        return f"<Project(id={self.id}, name='{self.name}')>"


class ProjectMilestone(Base):
    """项目里程碑。"""

    __tablename__ = "project_milestones"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="里程碑ID")
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        comment="关联项目ID",
    )
    name = Column(String(256), nullable=False, comment="里程碑名称")
    description = Column(Text, nullable=True, comment="描述")
    planned_date = Column(Date, nullable=True, comment="计划日期")
    actual_date = Column(Date, nullable=True, comment="实际日期")
    progress_pct = Column(Integer, nullable=False, default=0, comment="完成百分比")
    status = Column(String(16), nullable=False, default="待开始", comment="里程碑状态")
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

    project = relationship("Project", back_populates="milestones")

    def __repr__(self) -> str:
        """返回调试信息。"""
        return f"<ProjectMilestone(id={self.id}, name='{self.name}')>"


class ProjectPlan(Base):
    """项目计划。"""

    __tablename__ = "project_plans"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="计划ID")
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        comment="关联项目ID",
    )
    phase_name = Column(String(256), nullable=False, comment="阶段名称")
    description = Column(Text, nullable=True, comment="描述")
    planned_start = Column(Date, nullable=True, comment="计划开始日期")
    planned_end = Column(Date, nullable=True, comment="计划结束日期")
    actual_start = Column(Date, nullable=True, comment="实际开始日期")
    actual_end = Column(Date, nullable=True, comment="实际结束日期")
    status = Column(String(16), nullable=False, default="待开始", comment="计划状态")
    assignee = Column(String(64), nullable=True, comment="负责人")
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

    project = relationship("Project", back_populates="plans")

    def __repr__(self) -> str:
        """返回调试信息。"""
        return f"<ProjectPlan(id={self.id}, phase_name='{self.phase_name}')>"


class ProjectRequirement(Base):
    """项目需求。"""

    __tablename__ = "project_requirements"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="需求ID")
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        comment="关联项目ID",
    )
    req_id = Column(String(32), nullable=True, comment="需求编号")
    title = Column(String(256), nullable=False, comment="需求标题")
    description = Column(Text, nullable=True, comment="需求描述")
    priority = Column(String(8), nullable=False, default="中", comment="需求优先级")
    status = Column(String(16), nullable=False, default="待评审", comment="需求状态")
    owner = Column(String(64), nullable=True, comment="负责人")
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

    project = relationship("Project", back_populates="requirements")

    def __repr__(self) -> str:
        """返回调试信息。"""
        return f"<ProjectRequirement(id={self.id}, title='{self.title}')>"


class ProjectIssue(Base):
    """项目问题。"""

    __tablename__ = "project_issues"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="问题ID")
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        comment="关联项目ID",
    )
    title = Column(String(256), nullable=False, comment="问题标题")
    description = Column(Text, nullable=True, comment="问题描述")
    severity = Column(String(8), nullable=False, default="一般", comment="严重程度")
    status = Column(String(16), nullable=False, default="待处理", comment="问题状态")
    assignee = Column(String(64), nullable=True, comment="指派人")
    resolution = Column(Text, nullable=True, comment="解决方案")
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

    project = relationship("Project", back_populates="issues")

    def __repr__(self) -> str:
        """返回调试信息。"""
        return f"<ProjectIssue(id={self.id}, title='{self.title}')>"


class ProjectCostRecord(Base):
    """项目成本记录。"""

    __tablename__ = "project_cost_records"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="成本记录ID")
    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        comment="关联项目ID",
    )
    title = Column(String(256), nullable=False, comment="记录标题")
    record_type = Column(String(16), nullable=False, default="expense", comment="记录类型")
    amount = Column(Numeric(12, 2), nullable=False, comment="金额")
    person = Column(String(64), nullable=True, comment="关联人员")
    occurred_on = Column(Date, nullable=True, comment="发生日期")
    category = Column(String(64), nullable=True, comment="分类")
    description = Column(Text, nullable=True, comment="备注")
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

    project = relationship("Project", back_populates="cost_records")

    def __repr__(self) -> str:
        """返回调试信息。"""
        return (
            f"<ProjectCostRecord(id={self.id}, project_id={self.project_id}, "
            f"type='{self.record_type}', amount={self.amount})>"
        )
