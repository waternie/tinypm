"""智能助理 Schema。"""

from datetime import datetime

from pydantic import BaseModel, Field


class AgentSettingResponse(BaseModel):
    """智能助理配置响应体。"""

    model: str = Field(..., description="默认模型")
    api_base_url: str = Field(..., description="大模型API地址")
    has_api_key: bool = Field(..., description="是否已配置API Key")


class AgentSettingUpdate(BaseModel):
    """智能助理配置更新请求体。"""

    model: str | None = Field(None, min_length=1, max_length=128, description="默认模型")
    api_key: str | None = Field(None, max_length=2048, description="大模型API Key")
    api_base_url: str | None = Field(None, min_length=1, max_length=512, description="大模型API地址")


class AgentSkillResponse(BaseModel):
    """技能定义响应体。"""

    id: str = Field(..., description="技能ID")
    name: str = Field(..., description="技能名称")
    description: str = Field(..., description="技能描述")


class AgentToolCallSummary(BaseModel):
    """MCP 工具调用摘要。"""

    name: str = Field(..., description="工具名称")
    arguments: dict = Field(default_factory=dict, description="调用参数")
    success: bool = Field(..., description="是否执行成功")
    result_preview: str = Field(..., description="结果预览")


class AgentSessionMessageResponse(BaseModel):
    """会话消息响应体。"""

    id: int = Field(..., description="消息ID")
    role: str = Field(..., description="消息角色")
    content: str = Field(..., description="消息内容")
    model: str | None = Field(None, description="响应模型")
    tool_calls: list[AgentToolCallSummary] = Field(default_factory=list, description="工具调用摘要")
    is_error: bool = Field(False, description="是否为错误消息")
    created_at: datetime = Field(..., description="创建时间")


class AgentSessionResponse(BaseModel):
    """会话摘要响应体。"""

    id: int = Field(..., description="会话ID")
    title: str = Field(..., description="会话标题")
    project_id: int | None = Field(None, description="当前项目ID")
    skill_id: str = Field(..., description="技能ID")
    system_prompt: str | None = Field(None, description="系统角色设定Prompt")
    message_count: int = Field(..., description="消息数量")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")
    last_message_at: datetime = Field(..., description="最后消息时间")


class AgentSessionDetailResponse(AgentSessionResponse):
    """会话详情响应体。"""

    messages: list[AgentSessionMessageResponse] = Field(default_factory=list, description="会话消息列表")


class AgentSessionCreate(BaseModel):
    """会话创建请求体。"""

    project_id: int | None = Field(None, description="当前项目ID")
    title: str | None = Field(None, min_length=1, max_length=128, description="会话标题")
    skill_id: str | None = Field(None, min_length=1, max_length=64, description="技能ID")
    system_prompt: str | None = Field(None, min_length=1, max_length=12000, description="系统角色设定Prompt")


class AgentSessionUpdate(BaseModel):
    """会话更新请求体。"""

    project_id: int | None = Field(None, description="当前项目ID")
    title: str | None = Field(None, min_length=1, max_length=128, description="会话标题")
    skill_id: str | None = Field(None, min_length=1, max_length=64, description="技能ID")
    system_prompt: str | None = Field(None, min_length=1, max_length=12000, description="系统角色设定Prompt")


class AgentChatRequest(BaseModel):
    """智能助理对话请求体。"""

    message: str = Field(..., min_length=1, max_length=4000, description="用户消息")
    session_id: int | None = Field(None, description="会话ID")
    project_id: int | None = Field(None, description="项目上下文ID")
    skill_id: str | None = Field(None, min_length=1, max_length=64, description="技能ID")
    system_prompt: str | None = Field(None, min_length=1, max_length=12000, description="临时系统角色设定Prompt")
    api_key: str | None = Field(None, max_length=2048, description="临时API Key")
    model: str | None = Field(None, max_length=128, description="临时模型")


class AgentChatResponse(BaseModel):
    """智能助理对话响应体。"""

    session_id: int = Field(..., description="实际会话ID")
    answer: str = Field(..., description="助理回答")
    model: str = Field(..., description="实际使用模型")
    tool_calls: list[AgentToolCallSummary] = Field(
        default_factory=list,
        description="MCP 工具调用摘要",
    )
