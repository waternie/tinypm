"""项目管理 Schema。"""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


def _validate_git_url(value: str | None) -> str | None:
    """校验 Git URL 协议。"""
    if value is not None and value.strip():
        if not value.startswith(("http://", "https://", "git@", "ssh://")):
            raise ValueError("Git仓库链接必须以 http://、https://、git@ 或 ssh:// 开头")
    return value


class ProjectCreate(BaseModel):
    """创建项目请求体。"""

    name: str = Field(..., min_length=1, max_length=256, description="项目名称")
    status: str = Field(default="规划中", description="项目状态")
    priority: str = Field(default="中", description="优先级")
    description: str | None = Field(None, description="项目描述")
    announcement_markdown: str | None = Field(None, description="项目公告Markdown")
    project_manager: str | None = Field(None, max_length=64, description="项目负责人")
    client_name: str | None = Field(None, max_length=128, description="客户名称")
    git_url: str | None = Field(None, max_length=512, description="Git仓库链接")
    start_date: date | None = Field(None, description="开始日期")
    planned_end_date: date | None = Field(None, description="计划结束日期")
    actual_end_date: date | None = Field(None, description="实际结束日期")

    @field_validator("git_url")
    @classmethod
    def validate_git_url(cls, value: str | None) -> str | None:
        """校验 Git 地址。"""
        return _validate_git_url(value)


class ProjectUpdate(BaseModel):
    """更新项目请求体。"""

    name: str | None = Field(None, min_length=1, max_length=256, description="项目名称")
    status: str | None = Field(None, description="项目状态")
    priority: str | None = Field(None, description="优先级")
    description: str | None = Field(None, description="项目描述")
    announcement_markdown: str | None = Field(None, description="项目公告Markdown")
    project_manager: str | None = Field(None, max_length=64, description="项目负责人")
    client_name: str | None = Field(None, max_length=128, description="客户名称")
    git_url: str | None = Field(None, max_length=512, description="Git仓库链接")
    start_date: date | None = Field(None, description="开始日期")
    planned_end_date: date | None = Field(None, description="计划结束日期")
    actual_end_date: date | None = Field(None, description="实际结束日期")

    @field_validator("git_url")
    @classmethod
    def validate_git_url(cls, value: str | None) -> str | None:
        """校验 Git 地址。"""
        return _validate_git_url(value)


class ProjectResponse(BaseModel):
    """项目响应体。"""

    id: int
    name: str
    status: str
    priority: str
    description: str | None = None
    announcement_markdown: str | None = None
    project_manager: str | None = None
    client_name: str | None = None
    git_url: str | None = None
    start_date: date | None = None
    planned_end_date: date | None = None
    actual_end_date: date | None = None
    created_at: datetime
    updated_at: datetime
    milestone_count: int = 0
    plan_count: int = 0
    requirement_count: int = 0
    issue_count: int = 0
    cost_count: int = 0

    class Config:
        """Pydantic 配置。"""

        from_attributes = True


class MilestoneCreate(BaseModel):
    """创建里程碑请求体。"""

    name: str = Field(..., min_length=1, max_length=256, description="里程碑名称")
    description: str | None = Field(None, description="描述")
    planned_date: date | None = Field(None, description="计划日期")
    actual_date: date | None = Field(None, description="实际日期")
    progress_pct: int = Field(default=0, ge=0, le=100, description="完成百分比")
    status: str = Field(default="待开始", description="状态")


class MilestoneUpdate(BaseModel):
    """更新里程碑请求体。"""

    name: str | None = Field(None, min_length=1, max_length=256, description="里程碑名称")
    description: str | None = Field(None, description="描述")
    planned_date: date | None = Field(None, description="计划日期")
    actual_date: date | None = Field(None, description="实际日期")
    progress_pct: int | None = Field(None, ge=0, le=100, description="完成百分比")
    status: str | None = Field(None, description="状态")


class MilestoneResponse(BaseModel):
    """里程碑响应体。"""

    id: int
    project_id: int
    name: str
    description: str | None = None
    planned_date: date | None = None
    actual_date: date | None = None
    progress_pct: int = 0
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic 配置。"""

        from_attributes = True


class PlanCreate(BaseModel):
    """创建计划请求体。"""

    phase_name: str = Field(..., min_length=1, max_length=256, description="阶段名称")
    description: str | None = Field(None, description="描述")
    planned_start: date | None = Field(None, description="计划开始")
    planned_end: date | None = Field(None, description="计划结束")
    actual_start: date | None = Field(None, description="实际开始")
    actual_end: date | None = Field(None, description="实际结束")
    status: str = Field(default="待开始", description="状态")
    assignee: str | None = Field(None, max_length=64, description="负责人")


class PlanUpdate(BaseModel):
    """更新计划请求体。"""

    phase_name: str | None = Field(None, min_length=1, max_length=256, description="阶段名称")
    description: str | None = Field(None, description="描述")
    planned_start: date | None = Field(None, description="计划开始")
    planned_end: date | None = Field(None, description="计划结束")
    actual_start: date | None = Field(None, description="实际开始")
    actual_end: date | None = Field(None, description="实际结束")
    status: str | None = Field(None, description="状态")
    assignee: str | None = Field(None, max_length=64, description="负责人")


class PlanResponse(BaseModel):
    """计划响应体。"""

    id: int
    project_id: int
    phase_name: str
    description: str | None = None
    planned_start: date | None = None
    planned_end: date | None = None
    actual_start: date | None = None
    actual_end: date | None = None
    status: str
    assignee: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic 配置。"""

        from_attributes = True


class RequirementCreate(BaseModel):
    """创建需求请求体。"""

    req_id: str | None = Field(None, max_length=32, description="需求编号")
    title: str = Field(..., min_length=1, max_length=256, description="需求标题")
    description: str | None = Field(None, description="需求描述")
    priority: str = Field(default="中", description="优先级")
    status: str = Field(default="待评审", description="状态")
    owner: str | None = Field(None, max_length=64, description="负责人")


class RequirementUpdate(BaseModel):
    """更新需求请求体。"""

    req_id: str | None = Field(None, max_length=32, description="需求编号")
    title: str | None = Field(None, min_length=1, max_length=256, description="需求标题")
    description: str | None = Field(None, description="需求描述")
    priority: str | None = Field(None, description="优先级")
    status: str | None = Field(None, description="状态")
    owner: str | None = Field(None, max_length=64, description="负责人")


class RequirementResponse(BaseModel):
    """需求响应体。"""

    id: int
    project_id: int
    req_id: str | None = None
    title: str
    description: str | None = None
    priority: str
    status: str
    owner: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic 配置。"""

        from_attributes = True


class IssueCreate(BaseModel):
    """创建问题请求体。"""

    title: str = Field(..., min_length=1, max_length=256, description="问题标题")
    description: str | None = Field(None, description="问题描述")
    severity: str = Field(default="一般", description="严重程度")
    status: str = Field(default="待处理", description="状态")
    assignee: str | None = Field(None, max_length=64, description="指派人")
    resolution: str | None = Field(None, description="解决方案")


class IssueUpdate(BaseModel):
    """更新问题请求体。"""

    title: str | None = Field(None, min_length=1, max_length=256, description="问题标题")
    description: str | None = Field(None, description="问题描述")
    severity: str | None = Field(None, description="严重程度")
    status: str | None = Field(None, description="状态")
    assignee: str | None = Field(None, max_length=64, description="指派人")
    resolution: str | None = Field(None, description="解决方案")


class IssueResponse(BaseModel):
    """问题响应体。"""

    id: int
    project_id: int
    title: str
    description: str | None = None
    severity: str
    status: str
    assignee: str | None = None
    resolution: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic 配置。"""

        from_attributes = True


class CostRecordCreate(BaseModel):
    """创建成本记录请求体。"""

    title: str = Field(..., min_length=1, max_length=256, description="记录标题")
    record_type: str = Field(default="expense", description="记录类型")
    amount: Decimal = Field(..., gt=0, decimal_places=2, description="金额")
    person: str | None = Field(None, max_length=64, description="关联人员")
    occurred_on: date | None = Field(None, description="发生日期")
    category: str | None = Field(None, max_length=64, description="分类")
    description: str | None = Field(None, description="备注")

    @field_validator("record_type")
    @classmethod
    def validate_record_type(cls, value: str) -> str:
        """校验记录类型。"""
        if value not in {"expense", "income"}:
            raise ValueError("记录类型只允许 expense 或 income")
        return value


class CostRecordUpdate(BaseModel):
    """更新成本记录请求体。"""

    title: str | None = Field(None, min_length=1, max_length=256, description="记录标题")
    record_type: str | None = Field(None, description="记录类型")
    amount: Decimal | None = Field(None, gt=0, decimal_places=2, description="金额")
    person: str | None = Field(None, max_length=64, description="关联人员")
    occurred_on: date | None = Field(None, description="发生日期")
    category: str | None = Field(None, max_length=64, description="分类")
    description: str | None = Field(None, description="备注")

    @field_validator("record_type")
    @classmethod
    def validate_record_type(cls, value: str | None) -> str | None:
        """校验记录类型。"""
        if value is not None and value not in {"expense", "income"}:
            raise ValueError("记录类型只允许 expense 或 income")
        return value


class CostRecordResponse(BaseModel):
    """成本记录响应体。"""

    id: int
    project_id: int
    title: str
    record_type: str
    amount: float
    person: str | None = None
    occurred_on: date | None = None
    category: str | None = None
    description: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        """Pydantic 配置。"""

        from_attributes = True


class CostSummaryResponse(BaseModel):
    """成本汇总响应体。"""

    total_expense: float = Field(..., description="总支出")
    total_income: float = Field(..., description="总收入")
    balance: float = Field(..., description="收支结余")


class CostRecordListResponse(BaseModel):
    """成本列表响应体。"""

    records: list[CostRecordResponse] = Field(..., description="成本记录列表")
    summary: CostSummaryResponse = Field(..., description="收支汇总")
