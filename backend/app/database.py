"""
数据库连接模块
基于 SQLAlchemy 2.0 提供 PostgreSQL 引擎、会话工厂、Base 声明基类以及 FastAPI 依赖注入函数。
"""

from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

# 创建数据库引擎
# pool_pre_ping=True: 每次从连接池取连接时先检测存活，避免数据库重启后出现 stale connection
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=False,
)

# 会话工厂，autocommit/autoflush 均关闭，由业务层手动控制事务提交
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """SQLAlchemy 2.0 声明式基类，所有模型均继承此类。"""
    pass


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI 依赖注入：获取数据库会话。
    在请求结束后自动关闭会话，确保连接归还连接池。

    用法:
        @app.get("/items")
        def read_items(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
