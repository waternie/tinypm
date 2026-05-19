# TinyPM

[![Version](https://img.shields.io/badge/version-1.0.1-blue)](./README.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Open Source](https://img.shields.io/badge/Open%20Source-Yes-1f6feb)](./LICENSE)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev/)

一个面向团队协作的独立项目管理平台，提供用户权限、成员库、项目公告、成本管理，以及项目执行过程中的计划、需求、问题与里程碑管理能力。

当前版本：`1.0.1`

- English README: [README.en.md](./README.en.md)

> 本项目基于 **MIT License** 开源。
> 个人使用、团队内部使用、商用集成、二次开发都可以。

## 特性

- 用户与权限
  - 默认初始化管理员账号
  - 支持 `admin`、`manager`、`member` 三种角色
  - 管理员可管理平台用户、角色与启用状态
- 成员库
  - 独立维护成员名单
  - 项目负责人、计划负责人、需求负责人、问题指派人、成本记录人员统一从成员库选择
- 项目管理
  - 项目列表、多条件筛选、项目详情
  - 里程碑管理
  - 项目计划管理
  - 需求管理
  - 问题管理
- 项目公告
  - 支持 Markdown 编辑
  - 支持实时预览
- 成本管理
  - 收入 / 支出记录 CRUD
  - 单条记录支持关联人员
  - 自动汇总总收入、总支出与结余
- 部署
  - 前后端分离
  - 支持 Docker Compose 一键部署

## 技术栈

### 后端

- Python 3.11
- FastAPI
- SQLAlchemy 2.0
- PostgreSQL 16
- Pydantic / pydantic-settings
- python-jose + bcrypt

### 前端

- React 18
- React Router 6
- Axios
- Lucide React
- Vite 5
- react-markdown

## 目录结构

```text
.
├── backend/                 # FastAPI 后端
├── frontend/                # React 前端
├── docker-compose.yml       # Docker Compose 编排
├── .env.example             # 环境变量示例
├── LICENSE                  # 开源许可证
├── README.md
└── AGENTS.md
```

## 快速开始

### 1. 准备环境变量

```bash
copy .env.example .env
```

编辑 `.env`，至少修改以下内容：

```env
POSTGRES_PASSWORD=your-db-password
JWT_SECRET=your-jwt-secret
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=change-this-password
INITIAL_ADMIN_DISPLAY_NAME=平台管理员
```

### 2. 使用 Docker 启动

```bash
docker compose up --build -d
```

默认端口：

- 前端：`http://localhost:6101`
- 后端：`http://localhost:6100`
- PostgreSQL：`localhost:6105`

### 3. 默认管理员

如果你未修改 `.env`，默认初始化账号为：

- 用户名：`admin`
- 密码：`admin`

首次启动后建议立即修改密码。

## 本地开发

### 后端

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 6100 --reload
```

### 前端

```bash
cd frontend
npm install
npm run dev
```

## 核心功能说明

### 项目公告

- 公告挂载在项目维度
- 支持 Markdown 输入和预览
- 适合存放环境说明、账号说明、部署说明、阶段通知等信息

### 成本管理

- 每条记录支持：
  - 标题
  - 类型（收入 / 支出）
  - 金额
  - 人员
  - 日期
  - 分类
  - 备注
- 自动计算：
  - 总收入
  - 总支出
  - 当前结余

## 安全建议

- 生产环境务必修改：
  - `POSTGRES_PASSWORD`
  - `JWT_SECRET`
  - 初始化管理员密码
- 不要把真实账号、密码、客户敏感信息直接提交到仓库

## 开源许可

本项目采用 [MIT License](./LICENSE)。

你可以自由地：

- 个人学习和使用
- 团队内部部署
- 商业项目集成
- 二次开发和再发布

你需要保留原许可证与版权声明。

## 适用场景

- 内部项目协作平台
- 小团队项目管理工具
- 研发 / 测试 / 交付团队过程管理
- 需要私有化部署的轻量项目系统

## Roadmap

- 更细粒度的权限控制
- 附件上传与项目文档管理
- 更完整的成本统计分析
- 导出报表与审计日志

## License

MIT
