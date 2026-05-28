# TinyPM Quick Start

This guide gets TinyPM running locally with Docker Compose.

## Prerequisites

- Docker Desktop or Docker Engine with Compose support
- Git
- A browser

## 1. Clone and configure

```bash
git clone https://github.com/waternie/tinypm.git
cd tinypm
copy .env.example .env
```

Edit `.env` before production use:

```env
POSTGRES_PASSWORD=your-db-password
JWT_SECRET=your-jwt-secret
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=change-this-password
INITIAL_ADMIN_DISPLAY_NAME=Platform Administrator
```

## 2. Start TinyPM

```bash
docker compose up --build -d
```

Default services:

| Service | URL |
|---|---|
| Frontend | http://localhost:6101 |
| Backend API | http://localhost:6100 |
| PostgreSQL | localhost:6105 |

## 3. Sign in

If you keep the example values unchanged:

- Username: `admin`
- Password: `admin`

Change the password and secrets before exposing the service to a network.

## 4. First project flow

1. Create members in the member library.
2. Create a project.
3. Add milestones, plans, requirements, and issues.
4. Import a project plan from Excel if you already have one.
5. Open the AI assistant workspace.
6. Bind the current project and ask for a project review or weekly summary.

## Local development

Backend:

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 6100 --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```
