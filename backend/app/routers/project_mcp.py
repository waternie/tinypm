"""项目数据 MCP 路由。"""

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.services import project_mcp as project_mcp_service

router = APIRouter(prefix="/api/mcp/project-data", tags=["项目数据MCP"])


@router.get("/tools", summary="获取项目数据 MCP 工具")
def list_tools(
    current_user: User = Depends(get_current_user),
) -> dict[str, list[dict[str, Any]]]:
    """获取项目数据 MCP 工具定义。"""
    del current_user
    return {"tools": project_mcp_service.list_tools()}


@router.post("/tools/{tool_name}", summary="调用项目数据 MCP 工具")
def call_tool(
    tool_name: str,
    arguments: dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """调用项目数据 MCP 工具。"""
    return project_mcp_service.call_tool(db, current_user, tool_name, arguments)
