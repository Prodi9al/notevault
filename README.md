# NoteVault

**Your notes. Your courses. One place.**

NoteVault is a local-first, AWS-ready course notes & document-sharing platform.
The backend is **FastAPI** (SQLAlchemy 2.0 + Alembic + Pydantic v2) and the
frontend is **Next.js 14** (App Router, TypeScript, Tailwind). Files are stored
in **S3** (MinIO locally, real S3 in production) via presigned URLs — nothing is
ever written to local/EC2 disk.

It runs fully locally with a single command:

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API + Swagger UI: http://localhost:8000/docs
- MinIO console: http://localhost:9001 (user `minioadmin` / `minioadmin`)

---

## Architecture

```
┌────────────┐   presigned URL   ┌──────────────┐
│  Frontend  │ ────────────────▶ │  MinIO / S3  │
│ (Next.js)  │                   └──────────────┘
└─────┬──────┘
      │  REST + httpOnly JWT cookie
┌─────▼──────┐   presigned URL   ┌──────────────┐
│  Backend   │ ────────────────▶ │  MinIO / S3  │
│ (FastAPI)  │                   └──────────────┘
└─────┬──────┘
      │  SQLAlchemy 2.0
┌─────▼──────┐
│ PostgreSQL │
└────────────┘
```

- **Auth**: bcrypt-hashed passwords, JWT access token in an `httpOnly` cookie.
  The browser never reads the token; it calls `GET /auth/me` to learn who is
  logged in.
- **Uploads**: the client requests `POST /documents/upload-url`, uploads the
  file **directly** to S3 with the presigned PUT URL (`XHR` for progress), then
  confirms with `POST /documents`. Files never pass through the backend.
- **Downloads**: `GET /documents/{id}` returns a fresh, short-lived (5 min)
  presigned GET URL.
- **Courses/Categories**: the backend aggregates document counts on the fly via
  `GET /courses` and `GET /categories`, so the frontend never paginates an
  entire document list just to derive counts.

---

## Repository layout

```
notevault/
├── backend/
│   ├── app/
│   │   ├── config.py          # pydantic-settings, all values from env
│   │   ├── database.py
│   │   ├── main.py            # app + /health + JSON logging
│   │   ├── models/            # user.py, document.py
│   │   ├── schemas/           # Pydantic request/response models
│   │   ├── routers/           # auth.py, documents.py (incl. /courses, /categories)
│   │   ├── auth/              # security.py, dependencies.py
│   │   └── storage/s3.py      # boto3 client factory + presigned URLs
│   ├── alembic/               # migrations (auto env.py)
│   ├── alembic.ini
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/                   # routes: /, /login, /register, /upload,
│   │                         #   /documents/[id], /documents/[id]/edit,
│   │                         #   /courses, /categories
│   ├── components/            # Navbar, DocumentCard, Modal, AuthShell, ...
│   ├── lib/                   # api.ts, format.ts
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Local setup

1. Copy the env file and adjust if needed (the defaults work out of the box):

   ```bash
   cp .env.example .env
   ```

2. Build and start everything:

   ```bash
   docker compose up --build
   ```

   The backend automatically runs `alembic upgrade head` on startup, creates the
   MinIO bucket (with CORS), and starts `uvicorn`.

3. Open http://localhost:3000.

### Quick smoke test

```bash
# Register
curl -s -X POST http://localhost:8000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@b.com","password":"Password1","full_name":"Ada"}'

# Login (sets httpOnly cookie in the cookie jar)
curl -s -c cookies.txt -X POST http://localhost:8000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"a@b.com","password":"Password1"}'
```

---

## Configuration

**Every** value comes from the environment (see `.env.example`). No secrets are
hardcoded. Key variables:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLAlchemy async URL (psycopg) |
| `JWT_SECRET` | HMAC secret for JWTs |
| `JWT_EXPIRE_MINUTES` | Access token lifetime |
| `S3_BUCKET_NAME` | Bucket for uploads |
| `S3_REGION` | AWS region |
| `S3_ENDPOINT_URL` | Empty/unset ⇒ real AWS S3; `http://minio:9000` locally |
| `S3_PUBLIC_ENDPOINT_URL` | Browser-reachable endpoint for rewritten presigned URLs (local only) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Local MinIO creds; **unset in prod** (use EC2 IAM role) |
| `COOKIE_SECURE` | `true` in prod (HTTPS) |
| `NEXT_PUBLIC_API_URL` | Backend URL visible to the browser (e.g. `http://localhost:8000`) |

The boto3 client factory (`app/storage/s3.py`) works both ways: when the AWS
keys are unset it falls back to the EC2 instance's IAM role automatically.

---

## Deploying to AWS

No code changes are required — only environment variables.

1. **Database → RDS**
   Point `DATABASE_URL` at your RDS PostgreSQL endpoint:
   `postgresql+psycopg://<user>:<pass>@<rds-endpoint>:5432/notevault`.
   Run `alembic upgrade head` once during deploy.

2. **File storage → S3**
   - **Unset** `S3_ENDPOINT_URL`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY`.
   - Attach an **IAM instance role** to the EC2 instance, scoped to the bucket:
     `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`.
   - Set `S3_BUCKET_NAME` / `S3_REGION` to your real values.
   - Configure the S3 bucket CORS to allow `GET`/`PUT` from your frontend origin.

3. **Auth cookie**
   Set `COOKIE_SECURE=true` (HTTPS via ALB / CloudFront).

4. **Secrets**
   Set `JWT_SECRET` via the EC2 environment / Secrets Manager — never commit it.

5. **Frontend**
   Build with `NEXT_PUBLIC_API_URL` pointing at the ALB / backend DNS name
   (e.g. `https://api.notevault.example.com`).

6. **Health checks**
   The backend exposes `GET /health` for ALB / CloudWatch target checks.
   Structured JSON logs are written to stdout for easy shipping to CloudWatch.

---

## API summary

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | – | Create account |
| `POST` | `/auth/login` | – | Sets httpOnly JWT cookie |
| `POST` | `/auth/logout` | – | Clears cookie |
| `GET` | `/auth/me` | cookie | Current user (returns `null`-safe JSON; frontend treats 401 as logged out) |
| `GET` | `/documents` | – | Paginated, filter by `course_code`, `category`, `q` |
| `GET` | `/courses` | – | Distinct courses with document counts and course names |
| `GET` | `/categories` | – | Distinct categories with document counts |
| `POST` | `/documents/upload-url` | user | Returns presigned PUT URL + `s3_key` |
| `POST` | `/documents` | user | Saves metadata after S3 upload |
| `GET` | `/documents/{id}` | – | Detail + fresh presigned GET URL (5 min expiry) |
| `PATCH` | `/documents/{id}` | owner/staff | Edit metadata |
| `DELETE` | `/documents/{id}` | owner/staff | Deletes S3 object + database row |
| `GET` | `/health` | – | Liveness check |

Upload validation: max 25 MB, allowed extensions `.pdf .docx .pptx .png .jpg`.

---

## Course codes (seed / demo data)

NoteVault uses **free-text** `course_code` fields (no foreign key to a fixed
catalog). For realistic demo content, the following verified real GCTU course
codes (BSc Computer Science – Cyber Security option, Levels 100–200) are
pre-populated in the backend's course-name lookup and the frontend:

| Prefix | Department |
| --- | --- |
| CSPC | Physics for Computing |
| CSSD | Computer Science & Software Development |
| CSNS | Network & Systems Security |
| CSBC | Cybersecurity Core |
| GTGE | General Technical / Engineering |
| MATH | Mathematics |
| ENGL | English / Communication Skills |
| FREN | French |

Example documents:

- `CSBC 252 — Introduction to Cloud Computing`
- `CSSD 201 — Data Structures & Algorithms Past Questions`
- `CSNS 242 — Computer Networks Lecture Slides`
- `CSSD 216 — Operating Systems Revision Guide`

---

## Frontend routes

| Route | Description |
| --- | --- |
| `/` | Browse/search documents with hero, category shortcuts and filterable listing |
| `/courses` | Course directory with document counts |
| `/categories` | Category directory (notes, past questions, slides, other) |
| `/login` | Sign in (split layout with branding) |
| `/register` | Create account with password requirements |
| `/upload` | Drag-and-drop upload → presigned URL → metadata form → publish |
| `/documents/[id]` | Document detail, download, edit/delete (owner/staff) |
| `/documents/[id]/edit` | Edit document metadata |
