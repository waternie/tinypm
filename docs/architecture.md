# TinyPM Architecture

TinyPM is a self-hosted project management system with an AI assistant workspace and project data MCP tools.

## System Overview

```text
Browser
  -> React frontend
  -> FastAPI backend
  -> PostgreSQL

AI assistant
  -> project-scoped session
  -> MCP project data tools
  -> project review / plan review / weekly summary
```

## Components

| Component | Path | Responsibility |
|---|---|---|
| Frontend | `frontend/` | React UI, routing, pages, project workspace |
| Backend API | `backend/app/` | FastAPI routes, auth, services, schemas |
| Database | PostgreSQL | Users, members, projects, plans, requirements, issues, costs |
| Agent service | `backend/app/services/agent.py` | AI assistant orchestration |
| Project MCP service | `backend/app/services/project_mcp.py` | Project data tools for agent workflows |

## AI-native Project Data Flow

1. User creates or imports project data.
2. TinyPM stores structured project entities in PostgreSQL.
3. The assistant session binds to a project.
4. The agent uses MCP-style tools to read or update project data.
5. The agent produces review output with project context.

## Design Principles

- Keep core project management lightweight.
- Prefer structured project data over free-form chat memory.
- Keep the system self-hosted and easy to inspect.
- Make agent actions reviewable by humans.
- Avoid hiding project risk behind generic AI summaries.

## Security Notes

- Change default secrets before production use.
- Store model API keys only in the deployed environment.
- Do not commit customer project data.
- Treat AI project review output as decision support, not final authority.
