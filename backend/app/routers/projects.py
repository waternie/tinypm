"""项目管理路由。"""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_manager_or_admin
from app.models.user import User
from app.schemas.project import (
    CostRecordCreate,
    CostRecordListResponse,
    CostRecordResponse,
    CostRecordUpdate,
    IssueCreate,
    IssueResponse,
    IssueUpdate,
    MilestoneCreate,
    MilestoneResponse,
    MilestoneUpdate,
    PlanCreate,
    PlanResponse,
    PlanUpdate,
    ProjectCreate,
    ProjectResponse,
    ProjectUpdate,
    RequirementCreate,
    RequirementResponse,
    RequirementUpdate,
)
from app.services import project as project_service

router = APIRouter(prefix="/api/projects", tags=["项目管理"])


@router.get(
    "",
    response_model=list[ProjectResponse],
    summary="获取项目列表",
    description="支持按状态、优先级、负责人和关键词筛选",
)
def list_projects(
    status: str | None = Query(None, description="状态筛选"),
    priority: str | None = Query(None, description="优先级筛选"),
    project_manager: str | None = Query(None, description="负责人筛选"),
    keyword: str | None = Query(None, description="关键字筛选"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ProjectResponse]:
    """获取项目列表。"""
    del current_user
    projects = project_service.list_projects(
        db,
        status_filter=status,
        priority_filter=priority,
        project_manager_filter=project_manager,
        keyword=keyword,
    )
    responses: list[ProjectResponse] = []
    for project in projects:
        item = ProjectResponse.model_validate(project)
        item.milestone_count = len(project.milestones or [])
        item.plan_count = len(project.plans or [])
        item.requirement_count = len(project.requirements or [])
        item.issue_count = len(project.issues or [])
        item.cost_count = len(project.cost_records or [])
        responses.append(item)
    return responses


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建项目",
)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> ProjectResponse:
    """创建项目。"""
    del current_user
    project = project_service.create_project(
        db,
        name=data.name,
        status=data.status,
        priority=data.priority,
        description=data.description,
        announcement_markdown=data.announcement_markdown,
        project_manager=data.project_manager,
        client_name=data.client_name,
        git_url=data.git_url,
        start_date=data.start_date,
        planned_end_date=data.planned_end_date,
        actual_end_date=data.actual_end_date,
    )
    response = ProjectResponse.model_validate(project)
    response.milestone_count = 0
    response.plan_count = 0
    response.requirement_count = 0
    response.issue_count = 0
    response.cost_count = 0
    return response


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="获取项目详情",
)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectResponse:
    """获取项目详情。"""
    del current_user
    project = project_service.get_project(db, project_id)
    response = ProjectResponse.model_validate(project)
    response.milestone_count = len(project.milestones or [])
    response.plan_count = len(project.plans or [])
    response.requirement_count = len(project.requirements or [])
    response.issue_count = len(project.issues or [])
    response.cost_count = len(project.cost_records or [])
    return response


@router.put(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="更新项目",
)
def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> ProjectResponse:
    """更新项目。"""
    del current_user
    project = project_service.update_project(
        db,
        project_id=project_id,
        update_data=data.model_dump(exclude_unset=True),
    )
    response = ProjectResponse.model_validate(project)
    response.milestone_count = len(project.milestones or [])
    response.plan_count = len(project.plans or [])
    response.requirement_count = len(project.requirements or [])
    response.issue_count = len(project.issues or [])
    response.cost_count = len(project.cost_records or [])
    return response


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除项目",
)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> None:
    """删除项目。"""
    del current_user
    project_service.delete_project(db, project_id)


@router.get(
    "/{project_id}/milestones",
    response_model=list[MilestoneResponse],
    summary="获取里程碑列表",
)
def list_milestones(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MilestoneResponse]:
    """获取里程碑列表。"""
    del current_user
    milestones = project_service.list_milestones(db, project_id)
    return [MilestoneResponse.model_validate(item) for item in milestones]


@router.post(
    "/{project_id}/milestones",
    response_model=MilestoneResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建里程碑",
)
def create_milestone(
    project_id: int,
    data: MilestoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> MilestoneResponse:
    """创建里程碑。"""
    del current_user
    milestone = project_service.create_milestone(
        db,
        project_id=project_id,
        name=data.name,
        description=data.description,
        planned_date=data.planned_date,
        actual_date=data.actual_date,
        progress_pct=data.progress_pct,
        status=data.status,
    )
    return MilestoneResponse.model_validate(milestone)


@router.put(
    "/milestones/{milestone_id}",
    response_model=MilestoneResponse,
    summary="更新里程碑",
)
def update_milestone(
    milestone_id: int,
    data: MilestoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> MilestoneResponse:
    """更新里程碑。"""
    del current_user
    milestone = project_service.update_milestone(
        db,
        milestone_id=milestone_id,
        update_data=data.model_dump(exclude_unset=True),
    )
    return MilestoneResponse.model_validate(milestone)


@router.delete(
    "/milestones/{milestone_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除里程碑",
)
def delete_milestone(
    milestone_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> None:
    """删除里程碑。"""
    del current_user
    project_service.delete_milestone(db, milestone_id)


@router.get(
    "/{project_id}/plans",
    response_model=list[PlanResponse],
    summary="获取计划列表",
)
def list_plans(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PlanResponse]:
    """获取计划列表。"""
    del current_user
    plans = project_service.list_plans(db, project_id)
    return [PlanResponse.model_validate(item) for item in plans]


@router.post(
    "/{project_id}/plans",
    response_model=PlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建计划",
)
def create_plan(
    project_id: int,
    data: PlanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> PlanResponse:
    """创建计划。"""
    del current_user
    plan = project_service.create_plan(
        db,
        project_id=project_id,
        phase_name=data.phase_name,
        description=data.description,
        planned_start=data.planned_start,
        planned_end=data.planned_end,
        actual_start=data.actual_start,
        actual_end=data.actual_end,
        status=data.status,
        assignee=data.assignee,
    )
    return PlanResponse.model_validate(plan)


@router.put(
    "/plans/{plan_id}",
    response_model=PlanResponse,
    summary="更新计划",
)
def update_plan(
    plan_id: int,
    data: PlanUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> PlanResponse:
    """更新计划。"""
    del current_user
    plan = project_service.update_plan(
        db,
        plan_id=plan_id,
        update_data=data.model_dump(exclude_unset=True),
    )
    return PlanResponse.model_validate(plan)


@router.delete(
    "/plans/{plan_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除计划",
)
def delete_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> None:
    """删除计划。"""
    del current_user
    project_service.delete_plan(db, plan_id)


@router.get(
    "/{project_id}/requirements",
    response_model=list[RequirementResponse],
    summary="获取需求列表",
)
def list_requirements(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[RequirementResponse]:
    """获取需求列表。"""
    del current_user
    requirements = project_service.list_requirements(db, project_id)
    return [RequirementResponse.model_validate(item) for item in requirements]


@router.post(
    "/{project_id}/requirements",
    response_model=RequirementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建需求",
)
def create_requirement(
    project_id: int,
    data: RequirementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> RequirementResponse:
    """创建需求。"""
    del current_user
    requirement = project_service.create_requirement(
        db,
        project_id=project_id,
        req_id=data.req_id,
        title=data.title,
        description=data.description,
        priority=data.priority,
        status=data.status,
        owner=data.owner,
    )
    return RequirementResponse.model_validate(requirement)


@router.put(
    "/requirements/{requirement_id}",
    response_model=RequirementResponse,
    summary="更新需求",
)
def update_requirement(
    requirement_id: int,
    data: RequirementUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> RequirementResponse:
    """更新需求。"""
    del current_user
    requirement = project_service.update_requirement(
        db,
        requirement_id=requirement_id,
        update_data=data.model_dump(exclude_unset=True),
    )
    return RequirementResponse.model_validate(requirement)


@router.delete(
    "/requirements/{requirement_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除需求",
)
def delete_requirement(
    requirement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> None:
    """删除需求。"""
    del current_user
    project_service.delete_requirement(db, requirement_id)


@router.get(
    "/{project_id}/issues",
    response_model=list[IssueResponse],
    summary="获取问题列表",
)
def list_issues(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[IssueResponse]:
    """获取问题列表。"""
    del current_user
    issues = project_service.list_issues(db, project_id)
    return [IssueResponse.model_validate(item) for item in issues]


@router.post(
    "/{project_id}/issues",
    response_model=IssueResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建问题",
)
def create_issue(
    project_id: int,
    data: IssueCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> IssueResponse:
    """创建问题。"""
    del current_user
    issue = project_service.create_issue(
        db,
        project_id=project_id,
        title=data.title,
        description=data.description,
        severity=data.severity,
        status=data.status,
        assignee=data.assignee,
        resolution=data.resolution,
    )
    return IssueResponse.model_validate(issue)


@router.put(
    "/issues/{issue_id}",
    response_model=IssueResponse,
    summary="更新问题",
)
def update_issue(
    issue_id: int,
    data: IssueUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> IssueResponse:
    """更新问题。"""
    del current_user
    issue = project_service.update_issue(
        db,
        issue_id=issue_id,
        update_data=data.model_dump(exclude_unset=True),
    )
    return IssueResponse.model_validate(issue)


@router.delete(
    "/issues/{issue_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除问题",
)
def delete_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> None:
    """删除问题。"""
    del current_user
    project_service.delete_issue(db, issue_id)


@router.get(
    "/{project_id}/costs",
    response_model=CostRecordListResponse,
    summary="获取成本记录列表",
)
def list_cost_records(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CostRecordListResponse:
    """获取成本记录列表。"""
    del current_user
    records = project_service.list_cost_records(db, project_id)
    return CostRecordListResponse(
        records=[CostRecordResponse.model_validate(record) for record in records],
        summary=project_service.summarize_cost_records(records),
    )


@router.post(
    "/{project_id}/costs",
    response_model=CostRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建成本记录",
)
def create_cost_record(
    project_id: int,
    data: CostRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> CostRecordResponse:
    """创建成本记录。"""
    del current_user
    record = project_service.create_cost_record(
        db,
        project_id=project_id,
        title=data.title,
        record_type=data.record_type,
        amount=data.amount,
        person=data.person,
        occurred_on=data.occurred_on,
        category=data.category,
        description=data.description,
    )
    return CostRecordResponse.model_validate(record)


@router.put(
    "/costs/{cost_id}",
    response_model=CostRecordResponse,
    summary="更新成本记录",
)
def update_cost_record(
    cost_id: int,
    data: CostRecordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> CostRecordResponse:
    """更新成本记录。"""
    del current_user
    record = project_service.update_cost_record(
        db,
        cost_id=cost_id,
        update_data=data.model_dump(exclude_unset=True),
    )
    return CostRecordResponse.model_validate(record)


@router.delete(
    "/costs/{cost_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="删除成本记录",
)
def delete_cost_record(
    cost_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
) -> None:
    """删除成本记录。"""
    del current_user
    project_service.delete_cost_record(db, cost_id)
