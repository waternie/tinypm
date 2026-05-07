"""认证相关 Schema。"""

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """登录请求体。"""

    username: str = Field(..., min_length=1, description="登录用户名")
    password: str = Field(..., min_length=1, description="登录密码")


class AuthenticatedUser(BaseModel):
    """登录成功后的用户摘要。"""

    id: int = Field(..., description="用户ID")
    username: str = Field(..., description="登录用户名")
    display_name: str | None = Field(None, description="展示名称")
    role: str = Field(..., description="权限角色")
    is_active: bool = Field(..., description="是否启用")

    class Config:
        """Pydantic 配置。"""

        from_attributes = True


class TokenResponse(BaseModel):
    """JWT 登录响应体。"""

    access_token: str = Field(..., description="JWT访问令牌")
    token_type: str = Field(default="bearer", description="令牌类型")
    user: AuthenticatedUser = Field(..., description="当前登录用户")
