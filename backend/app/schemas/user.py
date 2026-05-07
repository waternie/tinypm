"""用户管理 Schema。"""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.user import USER_ROLES


class UserCreate(BaseModel):
    """创建用户请求体。"""

    username: str = Field(..., min_length=3, max_length=64, description="登录用户名")
    display_name: str | None = Field(None, max_length=64, description="展示名称")
    password: str = Field(..., min_length=4, max_length=128, description="登录密码")
    role: str = Field(..., description="权限角色")
    is_active: bool = Field(default=True, description="是否启用")

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        """校验角色值。"""
        if value not in USER_ROLES:
            raise ValueError("角色不合法")
        return value


class UserUpdate(BaseModel):
    """更新用户请求体。"""

    username: str | None = Field(None, min_length=3, max_length=64, description="登录用户名")
    display_name: str | None = Field(None, max_length=64, description="展示名称")
    password: str | None = Field(None, min_length=4, max_length=128, description="登录密码")
    role: str | None = Field(None, description="权限角色")
    is_active: bool | None = Field(None, description="是否启用")

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str | None) -> str | None:
        """校验角色值。"""
        if value is not None and value not in USER_ROLES:
            raise ValueError("角色不合法")
        return value


class UserResponse(BaseModel):
    """用户响应体。"""

    id: int = Field(..., description="用户ID")
    username: str = Field(..., description="登录用户名")
    display_name: str | None = Field(None, description="展示名称")
    role: str = Field(..., description="权限角色")
    is_active: bool = Field(..., description="是否启用")
    created_at: datetime = Field(..., description="创建时间")
    updated_at: datetime = Field(..., description="更新时间")

    class Config:
        """Pydantic 配置。"""

        from_attributes = True
