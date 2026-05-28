# TinyPM

[![Version](https://img.shields.io/badge/version-1.1.0-blue)](./README.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![Open Source](https://img.shields.io/badge/Open%20Source-Yes-1f6feb)](./LICENSE)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://react.dev/)

TinyPM 是一个面向小型研发、测试和交付团队的 **私有化 AI-native 项目管理平台**。

它不是另一个重型 Jira 替代品，而是把项目计划、需求、问题、成本、成员和公告沉淀成结构化数据，再通过 **MCP 项目数据工具** 暴露给 AI Agent，让 Agent 能做项目总审、计划审核、风险清单和周会摘要。

```text
项目数据
  -> MCP 工具
  -> AI 项目助理
  -> 项目总审 / 计划审核 / 风险清单 / 周会摘要
```

当前版本：`1.1.0`

- English README: [README.en.md](./README.en.md)

> 本项目基于 **MIT License** 开源。
> 个人使用、团队内部使用、商用集成、二次开发都可以。

## 特性

- AI-native 项目管理
  - Agent 可通过 MCP 工具读取项目、计划、需求和问题
  - 支持项目总审、当前计划审核、风险清单和周会摘要
  - 适合小团队把项目数据交给 AI 复盘，而不是只靠口头描述
- 智能助理
  - 默认模型：`deepseek-v4-flash`
  - 用户可在页面中自行填写 API Key
  - 支持会话持久化、新对话、Skill 和系统 Prompt
  - 支持项目总审、当前计划审核、风险清单和周会摘要
  - 大模型调用带重试机制，并在失败时显示 HTTP 状态、响应体摘要或网络异常原因
- 项目数据 MCP
  - Agent 通过 MCP 工具访问后端项目数据
  - 支持查询项目、计划、需求、问题
  - 支持通过 MCP 新增或更新项目计划
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
  - 项目计划管理，支持一级任务、二级任务、依赖项、工期和进度字段
  - 项目计划支持 Excel 导入和导出
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

## 3 分钟体验路径

1. 用 Docker Compose 启动 TinyPM。
2. 登录默认管理员账号。
3. 创建一个项目，导入或录入项目计划。
4. 打开智能助理工作台，绑定当前项目。
5. 让 Agent 生成项目总审、风险清单或周会摘要。

完整演示见 [docs/demo.md](./docs/demo.md)，部署细节见 [docs/quickstart.md](./docs/quickstart.md)。

## 界面截图

### 智能助理工作台

![智能助理工作台](./capture/1.png)

### 项目数据 Agent

![项目数据 Agent](./capture/2.png)

### 项目总审报告

![项目总审报告](./capture/3.png)

### 单条计划审核

![单条计划审核](./capture/4.png)

### 项目详情

![项目详情](./capture/5.png)

### 成员库和用户管理

![成员库](./capture/6.png)

![用户管理](./capture/7.png)

## 技术栈

### 后端

- Python 3.11
- FastAPI
- SQLAlchemy 2.0
- PostgreSQL 16
- Pydantic / pydantic-settings
- python-jose + bcrypt
- openpyxl

### 前端

- React 18
- React Router 6
- Axios
- Lucide React
- Vite 5
- react-markdown
- xlsx

## 目录结构

```text
.
├── backend/                 # FastAPI 后端
├── frontend/                # React 前端
├── capture/                 # README 截图
├── docs/                    # 演示、架构和发布说明
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

这是为了本地快速体验保留的默认值。生产环境或对外部署前，请在 `.env` 中修改初始化管理员密码，并同步修改 `JWT_SECRET` 和数据库密码。

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

### 智能助理与 MCP

- 智能助理入口位于平台首页
- 每个 Agent 会话可绑定当前项目
- 项目数据读写通过 MCP 工具完成，减少直接暴露后端接口细节
- 用户可维护系统 Prompt，默认角色为车载电子 OTA / 远程诊断项目经理
- 支持 `deepseek-v4-flash` 与 `deepseek-v4-pro`
- 大模型不可用时会展示具体原因，并在后端日志中记录每次失败

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

### 项目计划 Excel

- 导入 `项目开发计划` sheet
- 支持识别阶段、一级任务、二级任务、依赖项、状态、工期、进度和计划时间
- 支持导出与导入模板字段一致的 Excel 文件

## 安全建议

- 生产环境务必修改：
  - `POSTGRES_PASSWORD`
  - `JWT_SECRET`
  - 初始化管理员密码
- 不要把真实账号、密码、客户敏感信息直接提交到仓库
- DeepSeek API Key 由用户在页面中填写并保存到本地部署数据库，仓库中不包含真实 API Key

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
- 更完整的成本统计分析
- 更完整的导出报表与审计日志
- 更多 Agent Skill 和项目管理自动化能力

详细路线图见 [ROADMAP.md](./ROADMAP.md)。

## Contributing

欢迎提交 issue 和 pull request。适合优先参与的方向：

- 补充项目管理 Agent Skill
- 改进 MCP 项目数据工具
- 增加报表、审计和导出能力
- 补充 Docker、自托管和本地开发文档

贡献说明见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## License

MIT
