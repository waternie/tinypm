# Contributing to TinyPM

Thanks for considering a contribution.

## Good First Contributions

- Improve documentation.
- Add demo project data.
- Improve Docker setup instructions.
- Add project management agent skills.
- Improve Excel import/export edge cases.
- Add tests around backend services.

## Development Setup

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

## Pull Request Guidelines

- Keep changes focused.
- Include screenshots for UI changes.
- Do not commit `.env`, credentials, customer data, or generated local files.
- Update README or docs when behavior changes.
- Keep project management and AI-agent behavior explicit and reviewable.

## Issue Guidelines

Useful issues include:

- What you tried.
- What happened.
- What you expected.
- Logs or screenshots.
- Deployment mode: Docker Compose or local development.
