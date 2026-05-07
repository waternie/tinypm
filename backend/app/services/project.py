"""项目管理服务模块。"""

from datetime import date
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.project import (
    Project,
    ProjectCostRecord,
    ProjectIssue,
    ProjectMilestone,
    ProjectPlan,
    ProjectRequirement,
)


def list_projects(
    db: Session,
    status_filter: str | None = None,
    priority_filter: str | None = None,
    project_manager_filter: str | None = None,
    keyword: str | None = None,
) -> list[Project]:
    """获取项目列表并支持筛选。"""
    query = db.query(Project)

    if status_filter:
        query = query.filter(Project.status == status_filter)
    if priority_filter:
        query = query.filter(Project.priority == priority_filter)
    if project_manager_filter:
        query = query.filter(Project.project_manager == project_manager_filter)
    if keyword:
        fuzzy_keyword = f"%{keyword.strip()}%"
        query = query.filter(
            or_(
                Project.name.ilike(fuzzy_keyword),
                Project.description.ilike(fuzzy_keyword),
                Project.client_name.ilike(fuzzy_keyword),
            )
        )

    return query.order_by(Project.created_at.desc(), Project.id.desc()).all()


def get_project(db: Session, project_id: int) -> Project:
    """根据ID获取项目。"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if project is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"项目ID {project_id} 不存在",
        )
    return project


def create_project(
    db: Session,
    name: str,
    status: str = "规划中",
    priority: str = "中",
    description: str | None = None,
    announcement_markdown: str | None = None,
    project_manager: str | None = None,
    client_name: str | None = None,
    git_url: str | None = None,
    start_date: date | None = None,
    planned_end_date: date | None = None,
    actual_end_date: date | None = None,
) -> Project:
    """创建项目。"""
    project = Project(
        name=name.strip(),
        status=status,
        priority=priority,
        description=description,
        announcement_markdown=announcement_markdown,
        project_manager=project_manager,
        client_name=client_name,
        git_url=git_url,
        start_date=start_date,
        planned_end_date=planned_end_date,
        actual_end_date=actual_end_date,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def update_project(db: Session, project_id: int, update_data: dict) -> Project:
    """更新项目。"""
    project = get_project(db, project_id)

    if "name" in update_data:
        project.name = update_data["name"].strip()
    if "status" in update_data:
        project.status = update_data["status"]
    if "priority" in update_data:
        project.priority = update_data["priority"]
    if "description" in update_data:
        project.description = update_data["description"]
    if "announcement_markdown" in update_data:
        project.announcement_markdown = update_data["announcement_markdown"]
    if "project_manager" in update_data:
        project.project_manager = update_data["project_manager"]
    if "client_name" in update_data:
        project.client_name = update_data["client_name"]
    if "git_url" in update_data:
        project.git_url = update_data["git_url"]
    if "start_date" in update_data:
        project.start_date = update_data["start_date"]
    if "planned_end_date" in update_data:
        project.planned_end_date = update_data["planned_end_date"]
    if "actual_end_date" in update_data:
        project.actual_end_date = update_data["actual_end_date"]

    db.commit()
    db.refresh(project)
    return project


def delete_project(db: Session, project_id: int) -> None:
    """删除项目。"""
    project = get_project(db, project_id)
    db.delete(project)
    db.commit()


def list_milestones(db: Session, project_id: int) -> list[ProjectMilestone]:
    """获取项目里程碑列表。"""
    get_project(db, project_id)
    return (
        db.query(ProjectMilestone)
        .filter(ProjectMilestone.project_id == project_id)
        .order_by(ProjectMilestone.planned_date.asc().nullslast(), ProjectMilestone.created_at.asc())
        .all()
    )


def create_milestone(
    db: Session,
    project_id: int,
    name: str,
    description: str | None = None,
    planned_date: date | None = None,
    actual_date: date | None = None,
    progress_pct: int = 0,
    status: str = "待开始",
) -> ProjectMilestone:
    """创建里程碑。"""
    get_project(db, project_id)
    milestone = ProjectMilestone(
        project_id=project_id,
        name=name.strip(),
        description=description,
        planned_date=planned_date,
        actual_date=actual_date,
        progress_pct=progress_pct,
        status=status,
    )
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return milestone


def update_milestone(db: Session, milestone_id: int, update_data: dict) -> ProjectMilestone:
    """更新里程碑。"""
    milestone = db.query(ProjectMilestone).filter(ProjectMilestone.id == milestone_id).first()
    if milestone is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"里程碑ID {milestone_id} 不存在",
        )

    if "name" in update_data:
        milestone.name = update_data["name"].strip()
    if "description" in update_data:
        milestone.description = update_data["description"]
    if "planned_date" in update_data:
        milestone.planned_date = update_data["planned_date"]
    if "actual_date" in update_data:
        milestone.actual_date = update_data["actual_date"]
    if "progress_pct" in update_data:
        milestone.progress_pct = update_data["progress_pct"]
    if "status" in update_data:
        milestone.status = update_data["status"]

    db.commit()
    db.refresh(milestone)
    return milestone


def delete_milestone(db: Session, milestone_id: int) -> None:
    """删除里程碑。"""
    milestone = db.query(ProjectMilestone).filter(ProjectMilestone.id == milestone_id).first()
    if milestone is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"里程碑ID {milestone_id} 不存在",
        )
    db.delete(milestone)
    db.commit()


def list_plans(db: Session, project_id: int) -> list[ProjectPlan]:
    """获取项目计划列表。"""
    get_project(db, project_id)
    return (
        db.query(ProjectPlan)
        .filter(ProjectPlan.project_id == project_id)
        .order_by(ProjectPlan.planned_start.asc().nullslast(), ProjectPlan.created_at.asc())
        .all()
    )


def create_plan(
    db: Session,
    project_id: int,
    phase_name: str,
    description: str | None = None,
    planned_start: date | None = None,
    planned_end: date | None = None,
    actual_start: date | None = None,
    actual_end: date | None = None,
    status: str = "待开始",
    assignee: str | None = None,
) -> ProjectPlan:
    """创建项目计划。"""
    get_project(db, project_id)
    plan = ProjectPlan(
        project_id=project_id,
        phase_name=phase_name.strip(),
        description=description,
        planned_start=planned_start,
        planned_end=planned_end,
        actual_start=actual_start,
        actual_end=actual_end,
        status=status,
        assignee=assignee,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


def update_plan(db: Session, plan_id: int, update_data: dict) -> ProjectPlan:
    """更新项目计划。"""
    plan = db.query(ProjectPlan).filter(ProjectPlan.id == plan_id).first()
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"计划ID {plan_id} 不存在",
        )

    if "phase_name" in update_data:
        plan.phase_name = update_data["phase_name"].strip()
    if "description" in update_data:
        plan.description = update_data["description"]
    if "planned_start" in update_data:
        plan.planned_start = update_data["planned_start"]
    if "planned_end" in update_data:
        plan.planned_end = update_data["planned_end"]
    if "actual_start" in update_data:
        plan.actual_start = update_data["actual_start"]
    if "actual_end" in update_data:
        plan.actual_end = update_data["actual_end"]
    if "status" in update_data:
        plan.status = update_data["status"]
    if "assignee" in update_data:
        plan.assignee = update_data["assignee"]

    db.commit()
    db.refresh(plan)
    return plan


def delete_plan(db: Session, plan_id: int) -> None:
    """删除计划。"""
    plan = db.query(ProjectPlan).filter(ProjectPlan.id == plan_id).first()
    if plan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"计划ID {plan_id} 不存在",
        )
    db.delete(plan)
    db.commit()


def list_requirements(db: Session, project_id: int) -> list[ProjectRequirement]:
    """获取项目需求列表。"""
    get_project(db, project_id)
    return (
        db.query(ProjectRequirement)
        .filter(ProjectRequirement.project_id == project_id)
        .order_by(ProjectRequirement.created_at.asc())
        .all()
    )


def create_requirement(
    db: Session,
    project_id: int,
    title: str,
    req_id: str | None = None,
    description: str | None = None,
    priority: str = "中",
    status: str = "待评审",
    owner: str | None = None,
) -> ProjectRequirement:
    """创建需求。"""
    get_project(db, project_id)
    requirement = ProjectRequirement(
        project_id=project_id,
        req_id=req_id,
        title=title.strip(),
        description=description,
        priority=priority,
        status=status,
        owner=owner,
    )
    db.add(requirement)
    db.commit()
    db.refresh(requirement)
    return requirement


def update_requirement(
    db: Session,
    requirement_id: int,
    update_data: dict,
) -> ProjectRequirement:
    """更新需求。"""
    requirement = (
        db.query(ProjectRequirement).filter(ProjectRequirement.id == requirement_id).first()
    )
    if requirement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"需求ID {requirement_id} 不存在",
        )

    if "title" in update_data:
        requirement.title = update_data["title"].strip()
    if "req_id" in update_data:
        requirement.req_id = update_data["req_id"]
    if "description" in update_data:
        requirement.description = update_data["description"]
    if "priority" in update_data:
        requirement.priority = update_data["priority"]
    if "status" in update_data:
        requirement.status = update_data["status"]
    if "owner" in update_data:
        requirement.owner = update_data["owner"]

    db.commit()
    db.refresh(requirement)
    return requirement


def delete_requirement(db: Session, requirement_id: int) -> None:
    """删除需求。"""
    requirement = (
        db.query(ProjectRequirement).filter(ProjectRequirement.id == requirement_id).first()
    )
    if requirement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"需求ID {requirement_id} 不存在",
        )
    db.delete(requirement)
    db.commit()


def list_issues(db: Session, project_id: int) -> list[ProjectIssue]:
    """获取项目问题列表。"""
    get_project(db, project_id)
    return (
        db.query(ProjectIssue)
        .filter(ProjectIssue.project_id == project_id)
        .order_by(ProjectIssue.created_at.desc())
        .all()
    )


def create_issue(
    db: Session,
    project_id: int,
    title: str,
    description: str | None = None,
    severity: str = "一般",
    status: str = "待处理",
    assignee: str | None = None,
    resolution: str | None = None,
) -> ProjectIssue:
    """创建问题。"""
    get_project(db, project_id)
    issue = ProjectIssue(
        project_id=project_id,
        title=title.strip(),
        description=description,
        severity=severity,
        status=status,
        assignee=assignee,
        resolution=resolution,
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue


def update_issue(db: Session, issue_id: int, update_data: dict) -> ProjectIssue:
    """更新问题。"""
    issue = db.query(ProjectIssue).filter(ProjectIssue.id == issue_id).first()
    if issue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"问题ID {issue_id} 不存在",
        )

    if "title" in update_data:
        issue.title = update_data["title"].strip()
    if "description" in update_data:
        issue.description = update_data["description"]
    if "severity" in update_data:
        issue.severity = update_data["severity"]
    if "status" in update_data:
        issue.status = update_data["status"]
    if "assignee" in update_data:
        issue.assignee = update_data["assignee"]
    if "resolution" in update_data:
        issue.resolution = update_data["resolution"]

    db.commit()
    db.refresh(issue)
    return issue


def delete_issue(db: Session, issue_id: int) -> None:
    """删除问题。"""
    issue = db.query(ProjectIssue).filter(ProjectIssue.id == issue_id).first()
    if issue is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"问题ID {issue_id} 不存在",
        )
    db.delete(issue)
    db.commit()


def list_cost_records(db: Session, project_id: int) -> list[ProjectCostRecord]:
    """获取项目成本记录列表。"""
    get_project(db, project_id)
    return (
        db.query(ProjectCostRecord)
        .filter(ProjectCostRecord.project_id == project_id)
        .order_by(
            ProjectCostRecord.occurred_on.desc().nullslast(),
            ProjectCostRecord.created_at.desc(),
        )
        .all()
    )


def create_cost_record(
    db: Session,
    project_id: int,
    title: str,
    record_type: str,
    amount: Decimal,
    person: str | None = None,
    occurred_on: date | None = None,
    category: str | None = None,
    description: str | None = None,
) -> ProjectCostRecord:
    """创建项目成本记录。"""
    get_project(db, project_id)
    record = ProjectCostRecord(
        project_id=project_id,
        title=title.strip(),
        record_type=record_type,
        amount=amount,
        person=person,
        occurred_on=occurred_on,
        category=category,
        description=description,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def update_cost_record(db: Session, cost_id: int, update_data: dict) -> ProjectCostRecord:
    """更新项目成本记录。"""
    record = db.query(ProjectCostRecord).filter(ProjectCostRecord.id == cost_id).first()
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"成本记录ID {cost_id} 不存在",
        )

    if "title" in update_data:
        record.title = update_data["title"].strip()
    if "record_type" in update_data:
        record.record_type = update_data["record_type"]
    if "amount" in update_data:
        record.amount = update_data["amount"]
    if "person" in update_data:
        record.person = update_data["person"]
    if "occurred_on" in update_data:
        record.occurred_on = update_data["occurred_on"]
    if "category" in update_data:
        record.category = update_data["category"]
    if "description" in update_data:
        record.description = update_data["description"]

    db.commit()
    db.refresh(record)
    return record


def delete_cost_record(db: Session, cost_id: int) -> None:
    """删除项目成本记录。"""
    record = db.query(ProjectCostRecord).filter(ProjectCostRecord.id == cost_id).first()
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"成本记录ID {cost_id} 不存在",
        )
    db.delete(record)
    db.commit()


def summarize_cost_records(records: list[ProjectCostRecord]) -> dict[str, float]:
    """汇总项目收支。"""
    total_expense = sum(float(record.amount) for record in records if record.record_type == "expense")
    total_income = sum(float(record.amount) for record in records if record.record_type == "income")
    return {
        "total_expense": round(total_expense, 2),
        "total_income": round(total_income, 2),
        "balance": round(total_income - total_expense, 2),
    }
