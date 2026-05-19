"""TinyPM 后端应用入口。"""

import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.routers import auth, members, projects, users

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="TinyPM API",
    description="独立项目管理平台后端 API",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(members.router)
app.include_router(projects.router)
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.DOCUMENTS_DIR).mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/api/documents-storage", StaticFiles(directory=settings.DOCUMENTS_DIR), name="documents")


@app.on_event("startup")
def on_startup() -> None:
    """应用启动时初始化数据库。"""
    logger.info("正在初始化 TinyPM 数据库表")
    Base.metadata.create_all(bind=engine)
    _ensure_user_schema()
    _ensure_project_schema()
    logger.info("数据库表初始化完成")

    from app.models import seed_all

    db = SessionLocal()
    try:
        seed_all(db)
        logger.info("默认管理员校验完成")
    except Exception as exc:
        logger.error("默认管理员初始化失败: %s", exc)
        db.rollback()
    finally:
        db.close()

    logger.info("TinyPM 后端启动完成")


def _ensure_user_schema() -> None:
    """为旧版本 users 表补齐平台字段。"""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    column_names = {column["name"] for column in inspector.get_columns("users")}
    statements: list[str] = []

    if "display_name" not in column_names:
        statements.append("ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(64)")
    if "role" not in column_names:
        statements.append(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(32) NOT NULL DEFAULT 'member'"
        )
    if "is_active" not in column_names:
        statements.append(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE"
        )
    if "created_at" not in column_names:
        statements.append(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
        )
    if "updated_at" not in column_names:
        statements.append(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()"
        )

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))

    logger.info("users 表结构补齐完成")


def _ensure_project_schema() -> None:
    """为旧版本 projects 表补齐扩展字段。"""
    inspector = inspect(engine)
    if "projects" not in inspector.get_table_names():
        return

    column_names = {column["name"] for column in inspector.get_columns("projects")}
    statements: list[str] = []

    if "announcement_markdown" not in column_names:
        statements.append(
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS announcement_markdown TEXT"
        )
    if "docs_repo_url" not in column_names:
        statements.append(
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS docs_repo_url VARCHAR(512)"
        )
    if "docs_repo_branch" not in column_names:
        statements.append(
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS docs_repo_branch VARCHAR(128)"
        )
    if "docs_repo_subpath" not in column_names:
        statements.append(
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS docs_repo_subpath VARCHAR(255)"
        )
    if "docs_last_synced_at" not in column_names:
        statements.append(
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS docs_last_synced_at TIMESTAMPTZ"
        )
    if "docs_sync_status" not in column_names:
        statements.append(
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS docs_sync_status VARCHAR(32)"
        )
    if "docs_sync_message" not in column_names:
        statements.append(
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS docs_sync_message TEXT"
        )
    if "project_document_files" in inspector.get_table_names():
        document_column_names = {
            column["name"] for column in inspector.get_columns("project_document_files")
        }
        if "directory" not in document_column_names:
            statements.append(
                "ALTER TABLE project_document_files ADD COLUMN IF NOT EXISTS directory VARCHAR(255)"
            )

    if "project_cost_records" in inspector.get_table_names():
        cost_column_names = {
            column["name"] for column in inspector.get_columns("project_cost_records")
        }
        if "person" not in cost_column_names:
            statements.append(
                "ALTER TABLE project_cost_records ADD COLUMN IF NOT EXISTS person VARCHAR(64)"
            )

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))

    logger.info("projects / project_cost_records 表结构补齐完成")


@app.get("/api/health", tags=["系统"])
def health_check() -> dict[str, str]:
    """健康检查接口。"""
    return {"status": "ok", "message": "TinyPM API running"}
