# AGENTS.md

本文件为 AI 编程助手提供项目背景、技术架构、构建方式与开发规范指引。

## 项目概述

**TinyPM** 是一个独立部署的项目管理平台，面向中小团队的内部项目协作场景。当前包含三类核心能力：

- **平台用户与权限**
  - 登录认证
  - 用户管理
  - 角色权限控制（`admin` / `manager` / `member`）
- **成员库**
  - 维护项目负责人、需求负责人、问题指派人的可选成员
- **项目管理**
  - 项目基本信息
  - 里程碑
  - 项目计划
  - 需求管理
  - 问题管理

项目采用前后端分离架构，通过 Docker Compose 一键部署。

## 技术栈

### 后端
- **Python 3.11**
- **FastAPI 0.115**
- **SQLAlchemy 2.0**
- **Pydantic / pydantic-settings**
- **PostgreSQL 16**
- **python-jose + bcrypt**

### 前端
- **React 18**
- **React Router 6**
- **Axios**
- **Lucide React**
- **Vite 5**
- 单文件样式系统：`frontend/src/styles/design-system.css`

### 部署
- **Docker + Docker Compose**
- 后端镜像基于 `python:3.11-slim`
- 前端镜像基于 `node:22` 多阶段构建 + `nginx:1.27`

## 项目结构

```text
.
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── deps.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── member.py
│   │   │   ├── project.py
│   │   │   └── __init__.py
│   │   ├── routers/
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── members.py
│   │   │   └── projects.py
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── user.py
│   │   │   ├── member.py
│   │   │   └── project.py
│   │   └── services/
│   │       ├── auth.py
│   │       ├── user.py
│   │       ├── member.py
│   │       └── project.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── api/client.js
│   │   ├── hooks/useMembers.js
│   │   ├── utils/auth.js
│   │   ├── components/
│   │   └── pages/
│   ├── package.json
│   ├── vite.config.js
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── .env
├── .env.example
└── README.md
```

## 构建与运行

### 本地开发

```bash
# 后端
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 6100 --reload

# 前端
cd frontend
npm install
npm run dev
```

### Docker Compose

```bash
copy .env.example .env
docker compose up --build
```

服务映射：

- PostgreSQL: `localhost:6105`
- 后端 API: `localhost:6100`
- 前端页面: `localhost:6101`

## 代码规范

### 语言与注释
- 所有自然语言输出使用 **简体中文**。
- 代码标识符、技术术语保持英文。
- **代码注释使用中文**，且**禁止行尾注释**。

### 后端规范
- 使用 SQLAlchemy 2.0 声明式基类（`DeclarativeBase`）。
- 所有函数必须有类型注解和 docstring（中文）。
- 路由层只做参数校验和服务调用。
- 业务异常统一使用 `HTTPException`。
- 配置统一走 `app.config.settings`。
- 数据库会话通过 `Depends(get_db)` 注入。

### 前端规范
- 使用函数组件 + Hooks。
- 路由页面组件使用 `React.lazy()` 懒加载。
- API 调用统一使用 `src/api/client.js`。
- 样式优先复用 `design-system.css` 中的变量与工具类。
- 错误提示优先读取 `err.response?.data?.detail`。

### 数据库与模型
- 新增模型必须继承 `app.database.Base`。
- 所有外键必须声明 `ondelete` 行为。
- 模型字段必须写 `comment` 参数。

## 关键业务规则

### 平台用户
- 角色仅允许：`admin`、`manager`、`member`。
- `admin` 可以管理平台用户和角色。
- 平台至少保留一个启用中的管理员账号。

### 成员库
- 成员库不预置默认数据。
- 项目负责人、计划负责人、需求负责人、问题指派人都从成员库中选择。

### 项目管理
- 项目状态默认值：`规划中`。
- 项目优先级默认值：`中`。
- 项目列表支持按状态、优先级、负责人和关键字筛选。
- 里程碑、计划、需求、问题都挂在项目下，项目删除时级联删除。

## 认证与安全

- 登录接口：`/api/auth/login`
- 健康检查接口：`/api/health`
- 除登录和健康检查外，其余接口默认要求 `Authorization: Bearer <token>`
- 前端通过 Axios 请求拦截器自动附加 token
- 初始化管理员账号由环境变量驱动：
  - `INITIAL_ADMIN_USERNAME`
  - `INITIAL_ADMIN_PASSWORD`
  - `INITIAL_ADMIN_DISPLAY_NAME`
- 生产环境部署前必须修改 `JWT_SECRET` 和初始化管理员密码

## 测试

当前仓库未内置自动化测试。如需补充测试，请遵循以下约定：

- 后端使用 **pytest**
- 测试文件放在 `backend/tests/`
- 前端使用 **Jest + React Testing Library**

## 环境变量

关键变量参见 `.env.example`：

| 变量 | 说明 |
|------|------|
| `POSTGRES_PASSWORD` | PostgreSQL 密码 |
| `JWT_SECRET` | JWT 签名密钥 |
| `INITIAL_ADMIN_USERNAME` | 初始化管理员用户名 |
| `INITIAL_ADMIN_PASSWORD` | 初始化管理员密码 |
| `INITIAL_ADMIN_DISPLAY_NAME` | 初始化管理员展示名 |

## 相关文件速查

| 目的 | 文件 |
|------|------|
| 启动后端 | `backend/app/main.py` |
| 环境配置 | `backend/app/config.py`、`.env` |
| 用户权限 | `backend/app/models/user.py`、`backend/app/routers/users.py` |
| 成员库 | `backend/app/routers/members.py` |
| 项目管理 | `backend/app/routers/projects.py` |
| 前端路由 | `frontend/src/App.jsx` |
| 用户管理页 | `frontend/src/pages/users/UserManagement.jsx` |
| 项目筛选与列表 | `frontend/src/pages/ProjectManagement.jsx` |
