# Contributing to NoteVault

Thanks for helping out! NoteVault is a local-first course-notes platform:
**FastAPI** backend (SQLAlchemy 2.0 + Alembic + Pydantic v2) and a **Next.js 14**
frontend, with files stored in S3 (MinIO locally) via presigned URLs.

## Quick start

```bash
cp .env.example .env      # fill in required values
docker compose up --build
```

- Frontend: http://localhost:3000
- API + Swagger: http://localhost:8000/docs
- MinIO console: http://localhost:9001

See [README.md](README.md) for the full architecture and [RUNBOOK.md](RUNBOOK.md)
for deployment.

## Project layout

| Path | Purpose |
|------|---------|
| `backend/` | FastAPI app, models, Alembic migrations |
| `frontend/` | Next.js 14 (App Router, TypeScript, Tailwind) |
| `docker-compose.yml` | Local Postgres + MinIO + backend + frontend |
| `.github/workflows/` | Backend / Frontend / Docker CI |

## Workflow

1. Branch off `main`.
2. Keep changes scoped; match the existing code style.
3. Run the relevant checks locally before pushing:
   - Backend: `ruff check backend/` and `pytest` (if present)
   - Frontend: `npm run lint` and `npm run build` inside `frontend/`
   - Docker: `docker compose build`
4. Open a PR with a clear description and link any related issue.

CI runs Backend CI, Frontend CI, and Docker Build on push to `main`.

## Rules

- **Never commit secrets.** `.env` is git-ignored; use `.env.example`.
- Presigned URLs only — never write uploaded files to local/EC2 disk.
- Password hashing stays on `bcrypt`; don't reintroduce `passlib`.
- Keep the API contract; update Swagger-visible schemas when changing routes.

## License

By contributing you agree your changes are licensed under the MIT License
(see [LICENSE](LICENSE)).
