"""项目数据 MCP 工具服务。"""

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.project import Project, ProjectPlan
from app.models.user import USER_ROLE_ADMIN, USER_ROLE_MANAGER, User
from app.schemas.project import PlanCreate, PlanUpdate
from app.services import project as project_service


PROJECT_MCP_TOOLS: list[dict[str, Any]] = [
    {
        "name": "list_projects",
        "description": "查询项目列表，可按状态、优先级、负责人和关键词筛选。",
        "input_schema": {
            "type": "object",
            "properties": {
                "status": {"type": "string", "description": "项目状态"},
                "priority": {"type": "string", "description": "项目优先级"},
                "project_manager": {"type": "string", "description": "项目负责人"},
                "keyword": {"type": "string", "description": "关键词"},
            },
            "additionalProperties": False,
        },
    },
    {
        "name": "get_project_detail",
        "description": "按项目 ID 查询项目详情和统计数量。",
        "input_schema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "项目ID"},
            },
            "required": ["project_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "list_project_plans",
        "description": "查询指定项目的计划记录。",
        "input_schema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "项目ID"},
            },
            "required": ["project_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "get_project_plan",
        "description": "按计划 ID 查询单条项目计划记录。用于审核、更新或解释当前选中的计划。",
        "input_schema": {
            "type": "object",
            "properties": {
                "plan_id": {"type": "integer", "description": "计划ID"},
            },
            "required": ["plan_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "create_project_plan",
        "description": "为指定项目新增计划记录。需要管理员或经理权限。",
        "input_schema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "项目ID"},
                "phase_name": {"type": "string", "description": "阶段"},
                "primary_task": {"type": "string", "description": "一级任务"},
                "secondary_task": {"type": "string", "description": "二级任务"},
                "dependency": {"type": "string", "description": "依赖项"},
                "duration": {"type": "string", "description": "工期"},
                "progress_pct": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 100,
                    "description": "当前进度百分比",
                },
                "status": {"type": "string", "description": "计划状态"},
                "assignee": {"type": "string", "description": "负责人"},
                "planned_start": {"type": "string", "description": "计划开始日期，格式 YYYY-MM-DD"},
                "planned_end": {"type": "string", "description": "计划结束日期，格式 YYYY-MM-DD"},
                "actual_start": {"type": "string", "description": "实际开始日期，格式 YYYY-MM-DD"},
                "actual_end": {"type": "string", "description": "实际结束日期，格式 YYYY-MM-DD"},
                "description": {"type": "string", "description": "备注"},
            },
            "required": ["project_id", "phase_name"],
            "additionalProperties": False,
        },
    },
    {
        "name": "update_project_plan",
        "description": "更新计划记录。需要管理员或经理权限。",
        "input_schema": {
            "type": "object",
            "properties": {
                "plan_id": {"type": "integer", "description": "计划ID"},
                "phase_name": {"type": "string", "description": "阶段"},
                "primary_task": {"type": "string", "description": "一级任务"},
                "secondary_task": {"type": "string", "description": "二级任务"},
                "dependency": {"type": "string", "description": "依赖项"},
                "duration": {"type": "string", "description": "工期"},
                "progress_pct": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 100,
                    "description": "当前进度百分比",
                },
                "status": {"type": "string", "description": "计划状态"},
                "assignee": {"type": "string", "description": "负责人"},
                "planned_start": {"type": "string", "description": "计划开始日期，格式 YYYY-MM-DD"},
                "planned_end": {"type": "string", "description": "计划结束日期，格式 YYYY-MM-DD"},
                "actual_start": {"type": "string", "description": "实际开始日期，格式 YYYY-MM-DD"},
                "actual_end": {"type": "string", "description": "实际结束日期，格式 YYYY-MM-DD"},
                "description": {"type": "string", "description": "备注"},
            },
            "required": ["plan_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "list_project_requirements",
        "description": "查询指定项目的需求记录。",
        "input_schema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "项目ID"},
            },
            "required": ["project_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "list_project_issues",
        "description": "查询指定项目的问题记录。",
        "input_schema": {
            "type": "object",
            "properties": {
                "project_id": {"type": "integer", "description": "项目ID"},
            },
            "required": ["project_id"],
            "additionalProperties": False,
        },
    },
]


def list_tools() -> list[dict[str, Any]]:
    """返回项目数据 MCP 工具定义。"""
    return PROJECT_MCP_TOOLS


def list_openai_tools() -> list[dict[str, Any]]:
    """返回可供 Chat Completions function calling 使用的工具定义。"""
    return [
        {
            "type": "function",
            "function": {
                "name": tool["name"],
                "description": tool["description"],
                "parameters": tool["input_schema"],
            },
        }
        for tool in PROJECT_MCP_TOOLS
    ]


def call_tool(
    db: Session,
    current_user: User,
    name: str,
    arguments: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """调用项目数据 MCP 工具。"""
    args = arguments or {}
    if name == "list_projects":
        projects = project_service.list_projects(
            db,
            status_filter=args.get("status"),
            priority_filter=args.get("priority"),
            project_manager_filter=args.get("project_manager"),
            keyword=args.get("keyword"),
        )
        return {"projects": [_serialize_project(project) for project in projects]}

    if name == "get_project_detail":
        project = project_service.get_project(db, _required_int(args, "project_id"))
        return {"project": _serialize_project(project, include_counts=True)}

    if name == "list_project_plans":
        plans = project_service.list_plans(db, _required_int(args, "project_id"))
        return {"plans": [_serialize_plan(plan) for plan in plans]}

    if name == "get_project_plan":
        plan = project_service.get_plan(db, _required_int(args, "plan_id"))
        return {"plan": _serialize_plan(plan)}

    if name == "create_project_plan":
        _ensure_can_manage(current_user)
        project_id = _required_int(args, "project_id")
        data = PlanCreate.model_validate(
            {key: value for key, value in args.items() if key != "project_id"}
        )
        plan = project_service.create_plan(
            db,
            project_id=project_id,
            phase_name=data.phase_name,
            primary_task=data.primary_task,
            secondary_task=data.secondary_task,
            dependency=data.dependency,
            duration=data.duration,
            progress_pct=data.progress_pct,
            description=data.description,
            planned_start=data.planned_start,
            planned_end=data.planned_end,
            actual_start=data.actual_start,
            actual_end=data.actual_end,
            status=data.status,
            assignee=data.assignee,
        )
        return {"plan": _serialize_plan(plan)}

    if name == "update_project_plan":
        _ensure_can_manage(current_user)
        plan_id = _required_int(args, "plan_id")
        update_args = {key: value for key, value in args.items() if key != "plan_id"}
        data = PlanUpdate.model_validate(update_args)
        plan = project_service.update_plan(
            db,
            plan_id=plan_id,
            update_data=data.model_dump(exclude_unset=True),
        )
        return {"plan": _serialize_plan(plan)}

    if name == "list_project_requirements":
        requirements = project_service.list_requirements(db, _required_int(args, "project_id"))
        return {
            "requirements": [
                {
                    "id": item.id,
                    "project_id": item.project_id,
                    "req_id": item.req_id,
                    "title": item.title,
                    "description": item.description,
                    "priority": item.priority,
                    "status": item.status,
                    "owner": item.owner,
                }
                for item in requirements
            ]
        }

    if name == "list_project_issues":
        issues = project_service.list_issues(db, _required_int(args, "project_id"))
        return {
            "issues": [
                {
                    "id": item.id,
                    "project_id": item.project_id,
                    "title": item.title,
                    "description": item.description,
                    "severity": item.severity,
                    "status": item.status,
                    "assignee": item.assignee,
                    "resolution": item.resolution,
                }
                for item in issues
            ]
        }

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"MCP 工具 {name} 不存在",
    )


def _ensure_can_manage(user: User) -> None:
    """校验 MCP 写操作权限。"""
    if user.role not in {USER_ROLE_ADMIN, USER_ROLE_MANAGER}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前账号没有权限执行 MCP 写操作",
        )


def _required_int(arguments: dict[str, Any], key: str) -> int:
    """读取必填整数参数。"""
    value = arguments.get(key)
    if value is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"缺少参数 {key}",
        )
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"参数 {key} 必须是整数",
        ) from exc


def _serialize_project(project: Project, include_counts: bool = False) -> dict[str, Any]:
    """序列化项目数据。"""
    data: dict[str, Any] = {
        "id": project.id,
        "name": project.name,
        "status": project.status,
        "priority": project.priority,
        "description": project.description,
        "project_manager": project.project_manager,
        "client_name": project.client_name,
        "git_url": project.git_url,
        "start_date": _date_to_string(project.start_date),
        "planned_end_date": _date_to_string(project.planned_end_date),
        "actual_end_date": _date_to_string(project.actual_end_date),
    }
    if include_counts:
        data.update(
            {
                "milestone_count": len(project.milestones or []),
                "plan_count": len(project.plans or []),
                "requirement_count": len(project.requirements or []),
                "issue_count": len(project.issues or []),
                "cost_count": len(project.cost_records or []),
            }
        )
    return data


def _serialize_plan(plan: ProjectPlan) -> dict[str, Any]:
    """序列化计划数据。"""
    return {
        "id": plan.id,
        "project_id": plan.project_id,
        "phase_name": plan.phase_name,
        "primary_task": plan.primary_task,
        "secondary_task": plan.secondary_task,
        "dependency": plan.dependency,
        "duration": plan.duration,
        "progress_pct": plan.progress_pct,
        "description": plan.description,
        "planned_start": _date_to_string(plan.planned_start),
        "planned_end": _date_to_string(plan.planned_end),
        "actual_start": _date_to_string(plan.actual_start),
        "actual_end": _date_to_string(plan.actual_end),
        "status": plan.status,
        "assignee": plan.assignee,
    }


def _date_to_string(value: Any) -> str | None:
    """将日期转为字符串。"""
    if value is None:
        return None
    return value.isoformat()
