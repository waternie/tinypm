"""应用配置模块。"""

from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """全局应用配置。"""

    DATABASE_URL: str = "postgresql://tinypm:tinypm@localhost:6105/tinypm"

    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440

    CORS_ORIGINS: List[str] = ["http://localhost:6101"]

    INITIAL_ADMIN_USERNAME: str = "admin"
    INITIAL_ADMIN_PASSWORD: str = "admin"
    INITIAL_ADMIN_DISPLAY_NAME: str = "平台管理员"

    class Config:
        """环境变量读取配置。"""

        env_file = ".env"
        env_file_encoding = "utf-8"
        json_parse_env_vars = True


settings = Settings()
