"""成员相关 Schema。"""

from datetime import datetime

from pydantic import BaseModel, Field


class MemberCreate(BaseModel):
    """创建成员请求体。"""

    name: str = Field(..., min_length=1, max_length=64, description="成员姓名")


class MemberUpdate(BaseModel):
    """更新成员请求体。"""

    name: str | None = Field(None, min_length=1, max_length=64, description="成员姓名")


class MemberResponse(BaseModel):
    """成员响应体。"""

    id: int = Field(..., description="成员ID")
    name: str = Field(..., description="成员姓名")
    created_at: datetime = Field(..., description="创建时间")

    class Config:
        """Pydantic 配置。"""

        from_attributes = True
