# NoteVault — AWS Deployment Runbook & Operational Guide

> **Project:** NoteVault (local-first, AWS-ready course notes / document-sharing platform)
> **Stack:** FastAPI (Python 3.11) · SQLAlchemy 2.0 + Alembic · Next.js 14 (App Router) · PostgreSQL · S3 (MinIO locally, real S3 in prod)
> **Audience:** The full deployment squad — Cloud Security Architect (Admin), Frontend, Backend, DBA, DevOps, QA/Docs.

This runbook takes NoteVault from `docker compose up --build` (local) all the way to a production deployment on **EC2 + RDS + S3 behind an Application Load Balancer**, with IAM least-privilege, Secrets Manager, CloudWatch logging, and a QA/deployment-proof checklist owned by the assigning lead.

> **No code changes are required to deploy.** Only environment variables change. The boto3 client factory already supports both MinIO and real S3, and the auth cookie + CORS are already production-shaped.

---

## 0. RACI — who owns what (your squad)

| Role | Owner | Primary responsibilities in this runbook |
| --- | --- | --- |
| **Group Admin — Cloud Security Architect** | You | AWS architecture diagram, IAM roles/policies (least-privilege), Security Groups, env-var secret protection, final security sign-off |
| **Lil T — Frontend Developer** | Lil T | UI/UX responsive parity, API wiring, `NEXT_PUBLIC_API_URL`, wireframes for SDD |
| **~.. — Backend Developer** | ~.. | App logic/API layer, auth (register/login/logout), upload routing (presigned URL flow), CORS contract |
| **~shekiel — DBA** | ~shekiel | RDS schema/ERD matches Alembic migrations, CRUD review, query/index validation |
| **~WISDOM — DevOps** | ~WISDOM | EC2 provisioning, Docker deploy, S3 bucket + CORS, CloudWatch, ALB |
| **@charlie_ryde — QA / Docs** | @charlie_ryde | Test plan (functional + security), Deployment Proof Portfolio, Final Technical Report + video |

---

## 1. Target architecture (AWS)

```
                              ┌─────────────────────────────┐
   Browser (HTTPS) ─────────▶ │  Application Load Balancer    │  :443
                              │  (ACM cert, forward to HTTP)  │
                              └───────────┬─────────────────┘
                                          │ (HTTP :80)
                 ┌────────────────────────┼────────────────────────┐
                 │                         │                         │
        ┌────────▼─────────┐     ┌─────────▼─────────┐     ┌─────────▼─────────┐
        │  EC2 (frontend)  │     │  EC2 (backend)     │     │   EC2 (optional:  │
        │  Next.js :3000    │     │  FastAPI :8000     │     │   combined host)  │
        │  NEXT_PUBLIC_API_ │     │  IAM instance role │     └────────────────────┘
        │  URL=ALB DNS      │     │  → S3 only          │
        └────────┬─────────┘     └─────────┬─────────┘
                 │                         │
                 │  REST (cookie)          │  SQLAlchemy (psycopg)
                 │                         │
        ┌────────▼─────────┐     ┌─────────▼─────────┐     ┌──────────────────────┐
        │  S3 (static/     │     │  RDS PostgreSQL    │     │  S3 (uploads)         │
        │  optional)       │     │  notevault db      │     │  notevault bucket     │
        └──────────────────┘     └────────────────────┘     │  presigned PUT/GET    │
                                                             └──────────┬───────────┘
        Backend also talks to S3 directly via presigned URLs ◀──┘
                                       │
                                 CloudWatch
                          (logs, metrics, alarms)
```

**Key decisions**
- **One EC2 instance** is enough for the assignment (backend + frontend as two containers). Split into two hosts only if you want horizontal scaling behind the ALB.
- **Files never touch EC2 disk** — uploads go browser → S3 (presigned PUT), downloads go browser → S3 (presigned GET). The backend only stores metadata in RDS.
- **Backend uses an IAM instance role** scoped to the S3 bucket (no AWS keys on the box).
- **`JWT_SECRET` lives in Secrets Manager / SSM**, injected as an env var at boot — never committed.

---

## 2. Pre-flight checklist (everyone)

- [ ] Local `docker compose up --build` works; app reachable at `localhost:3000`, Swagger at `localhost:8000/docs`.
- [ ] `alembic upgrade head` runs clean locally.
- [ ] `.env.example` reviewed; no real secrets in the repo.
- [ ] Domain + ACM certificate requested (for HTTPS on the ALB).
- [ ] AWS account, IAM permissions to create EC2/RDS/S3/ALB/IAM/CloudWatch.
- [ ] Region chosen (keep RDS + S3 + EC2 in the **same region** to avoid egress cost/latency).

---

## 3. Cloud Security Architect — IAM, Security Groups, secrets

### 3.1 VPC / networking assumptions
Deploy into the **default VPC** (or a dedicated project VPC). Use:
- **Public subnet**: ALB + EC2 (EC2 only needs outbound to internet for `docker pull` + package updates; inbound only via ALB SG).
- **Private subnet (recommended)**: RDS. If you must use default VPC, at minimum lock RDS to the backend SG only.

### 3.2 Security Groups

| SG | Inbound | Outbound | Attached to |
| --- | --- | --- | --- |
| `sg-alb` | 443 from `0.0.0.0/0`; 80 from `0.0.0.0/0` (redirect) | to `sg-ec2` :80/:3000 | ALB |
| `sg-ec2` | 80/3000 from `sg-alb` only; 22 from your admin IP only | 443 to `0.0.0.0/0` (SSM/docker/pull), 5432 to `sg-rds` | EC2 |
| `sg-rds` | 5432 from `sg-ec2` only | none | RDS |
| `sg-minio` (local only — not in AWS) | — | — | n/a |

> Never open 5432, 8000, or 3000 to `0.0.0.0/0`. The public only ever reaches the ALB on 443.

### 3.3 IAM — least privilege

**EC2 instance role** `notevault-ec2-role` (no user keys):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3UploadsScopedToBucket",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::notevault",
        "arn:aws:s3:::notevault/*"
      ]
    },
    {
      "Sid": "CloudWatchAgentLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:CreateLogGroup",
        "logs:PutLogEvents",
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*"
    }
  ]
}
```

Attach the **AWS managed** `AmazonSSMManagedInstanceCore` (for SSM Session Manager instead of open SSH, if you adopt it).

> The backend's `get_s3_client()` leaves `aws_access_key_id`/`aws_secret_access_key` **unset** in prod, so boto3 automatically uses this instance role. That is the whole point of the "zero key" design.

### 3.4 Secrets (no plaintext in env files committed to git)

| Secret | Where |
| --- | --- |
| `JWT_SECRET` | AWS Secrets Manager **or** SSM Parameter Store (SecureString); injected at EC2 boot |
| `DATABASE_URL` password | RDS-generated master password → Secrets Manager; backend reads it via env injected at boot |
| AWS keys | **Not used in prod** (instance role handles it) |

Example boot injection (`/etc/rc.local` or a small `systemd` unit / user-data script):
```bash
JWT_SECRET=$(aws secretsmanager get-secret-value --secret-id notevault/jwt --query SecretString --output text)
# export into the compose env file at runtime; never persist to disk in plaintext outside Secrets Manager
```

---

## 4. ~shekiel (DBA) — RDS schema & data

### 4.1 Provision RDS
- Engine: **PostgreSQL 16** (matches local `postgres:16`).
- Instance: `db.t3.micro` (assignment) → bump for real load.
- Subnet group: private subnets; SG `sg-rds`.
- Enable **automated backups** (7 days) + **Multi-AZ** if marks/HA matter.
- Note the endpoint: `notevault.abcdef.us-east-1.rds.amazonaws.com:5432`.

### 4.2 Schema / ERD
The production schema is **exactly** what Alembic creates — no separate hand-built DDL. Two tables:

```
users (id uuid PK, email unique idx, hashed_password, full_name,
       role enum(student/staff), created_at)
        │ 1
        │
        │ *
documents (id uuid PK, title, description, course_code idx, category enum,
           s3_key, file_size_bytes, content_type, uploaded_by FK→users.id,
           created_at, updated_at)
```

ERD (text):
```
┌──────────┐         ┌──────────────┐
│  users   │ 1 ──── * │  documents   │
│ PK id    │         │ PK id        │
│ email(UQ)│         │ FK uploaded_by│
└──────────┘         └──────────────┘
```

### 4.3 CRUD & validation (review points for ~shekiel)
- **Create/Read/Update/Delete** all implemented in `backend/app/routers/documents.py` + `auth.py`.
- **Validation**: Pydantic v2 schemas + DB-level constraints (`unique` on email, FKs, enums). Upload size/extension validated before any S3 call.
- **Index optimization**: `ix_users_email`, `ix_documents_course_code` exist. The `/documents` list query filters on `course_code`, `category`, `title ILIKE`, ordered by `created_at desc` — confirm RDS query plan once populated.
- **Migration**: `alembic upgrade head` is the ONLY supported way to build the schema. Run it once at deploy.

---

## 5. ~WISDOM (DevOps) — EC2, S3, Docker, CloudWatch, ALB

### 5.1 Launch EC2
- AMI: **Amazon Linux 2023** (or Ubuntu 22.04 LTS).
- Type: `t3.small`+ (backend + frontend containers).
- SG `sg-ec2`, IAM role `notevault-ec2-role`.
- Storage: 20 GB gp3 (ephemeral app host; **state is in RDS + S3**, so EC2 is disposable).
- User-data installs Docker + Docker Compose:
  ```bash
  # Amazon Linux 2023
  dnf install -y docker
  systemctl enable --now docker
  curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
    -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
  ```

### 5.2 S3 bucket + CORS
Create bucket `notevault` in the same region. **Block all public access** (presigned URLs only).

CORS (allow the ALB/frontend origin — replace with your domain):
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedOrigins": ["https://notevault.example.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```
> The backend `ensure_bucket()` also sets this CORS locally against MinIO; in prod create it via console/Terraform since the bucket pre-exists.

### 5.3 Production `docker-compose.yml` (EC2)
This is the **same** compose with prod env values. Write it to `/opt/notevault/docker-compose.yml`:

```yaml
services:
  db:        # REMOVE in prod — use RDS instead
  backend:
    image: <your-ecr-or-dockerhub>/notevault-backend:latest
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql+psycopg://notevault:<PW>@notevault.xyz.rds.amazonaws.com:5432/notevault
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRE_MINUTES: "1440"
      S3_BUCKET_NAME: notevault
      S3_REGION: us-east-1
      # S3_ENDPOINT_URL unset  -> real AWS S3
      # AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY unset -> instance role
      COOKIE_SECURE: "true"
    ports: ["8000:8000"]
  frontend:
    image: <your-ecr-or-dockerhub>/notevault-frontend:latest
    restart: unless-stopped
    environment:
      NEXT_PUBLIC_API_URL: https://notevault.example.com
    ports: ["3000:3000"]
```
Build & push images from local (or CI):
```bash
docker compose -f docker-compose.yml build
docker tag notevault-backend:latest <registry>/notevault-backend:latest && docker push ...
```

### 5.4 Deploy
```bash
cd /opt/notevault
export JWT_SECRET=$(aws secretsmanager get-secret-value --secret-id notevault/jwt --query SecretString --output text)
docker compose pull
docker compose up -d
# run migrations once:
docker compose exec backend alembic upgrade head
curl -f http://localhost:8000/health   # expect {"status":"ok"}
```

### 5.5 CloudWatch
- **Logs**: app writes **structured JSON to stdout** (already implemented in `main.py`). Install the CloudWatch agent (or use `awslogs` Docker log driver) to ship `stdout` → Log group `/notevault/backend`, `/notevault/frontend`.
- **Metrics/Alarms** (stretch):
  - ALB `HTTPCode_Target_5XX` > 0 → alarm.
  - RDS `FreeStorageSpace` low → alarm.
  - EC2 `CPUUtilization` > 80% → alarm.
- Log Insights sample query:
  ```
  fields @timestamp, level, message, user_id
  | filter level = "ERROR"
  | sort @timestamp desc
  | limit 50
  ```

### 5.6 Application Load Balancer (stretch / bonus)
1. Create ALB in public subnets, SG `sg-alb`, internet-facing.
2. **Target groups**: `tg-frontend` → EC2 :3000, `tg-backend` → EC2 :8000.
3. **Listeners**:
   - 443 → default forward to `tg-frontend`; rule `Path=/api/*` (or host-based) → `tg-backend`.
   - 80 → redirect to 443.
4. **ACM cert** attached to 443.
5. Health checks: frontend `/` (200), backend `/health` (200).
6. Frontend `NEXT_PUBLIC_API_URL=https://notevault.example.com` — the ALB routes `/api/*` (or `/documents`, `/auth`) to the backend. (Alternatively set `NEXT_PUBLIC_API_URL=https://api.notevault.example.com` and use a second ALB/listener.)

---

## 6. Lil T (Frontend) — wiring & UX

- **API base**: `NEXT_PUBLIC_API_URL` must equal the ALB HTTPS URL. Rebuild the frontend image after changing it (`next build` bakes it in).
- **Cookie**: backend sets `httpOnly`, `secure=true` (set via `COOKIE_SECURE=true`), `samesite=lax`. Frontend uses `credentials: "include"` on every fetch (already done in `lib/api.ts`) — **do not** switch to `localStorage`.
- **Responsive parity**: confirm `/`, `/courses`, `/categories`, `/upload`, `/documents/[id]` at 320 / 768 / 1280 px. Mobile filters use a bottom sheet (already implemented).
- **SDD wireframes**: export the homepage hero + filter sidebar + document card + upload dropzone screens as the SDD figures.
- **Error UX**: backend errors surface as `.detail` strings; never raw stack traces (handled in `lib/api.ts`).

---

## 7. ~.. (Backend) — API & upload flow review

- **Auth**: `POST /auth/register`, `POST /auth/login` (sets cookie), `POST /auth/logout`, `GET /auth/me`. bcrypt hashing is **direct** (no `passlib`) to avoid the bcrypt-version warning — see `app/auth/security.py`.
- **Upload routing** (no file ever hits the backend disk):
  1. `POST /documents/upload-url` → returns presigned **PUT** URL + `s3_key`.
  2. Browser `PUT`s the file straight to S3 (XHR, with progress).
  3. `POST /documents` → backend verifies the object exists via `head_object`, then writes metadata.
  4. `GET /documents/{id}` → returns a fresh **5-min** presigned GET URL.
- **CORS contract**: backend sets bucket CORS; frontend origin must be in the allowed list (Section 5.2).
- **Validation**: max 25 MB, extensions `.pdf .docx .pptx .png .jpg` (enforced in `app/storage/s3.py:validate_upload`).

---

## 8. @charlie_ryde (QA / Docs) — test plan & proof portfolio

### 8.1 Functional test plan
| # | Area | Steps | Expected |
| --- | --- | --- | --- |
| F1 | Register | POST `/auth/register` via UI | 201; user created |
| F2 | Login | Login with correct creds | httpOnly cookie set; `/auth/me` returns user |
| F3 | Wrong login | Wrong password | 401; message "Incorrect email or password." |
| F4 | Browse | Open `/` | documents listed with correct `total` + pagination past page 1 |
| F5 | Search/filter | `?q=`, `?course_code=`, `?category=` | filtered results; URL state persists |
| F6 | Upload | Drop PDF → PUT to S3 → confirm | document appears in list; download works |
| F7 | Upload reject | `.exe` / 30 MB file | 400 "Unsupported file type" / "File too large" |
| F8 | Download | `/documents/{id}` → open `download_url` | file downloads |
| F9 | Edit/Delete | owner edits; delete confirms | metadata/S3 object removed |
| F10 | Courses/Categories | `/courses`, `/categories` | counts load, no console errors |
| F11 | Logout+refresh | logout, reload | stays logged out, no error state |

### 8.2 Security test plan
| # | Check | Expected |
| --- | --- | --- |
| S1 | JWT in httpOnly cookie | not readable via `document.cookie` JS |
| S2 | No AWS keys on EC2 | `env | grep -i aws` empty; instance role used |
| S3 | RDS not public | SG `sg-rds` only allows `sg-ec2` |
| S4 | S3 private | Block Public Access on; objects only via presigned URLs |
| S5 | Secrets | `JWT_SECRET` from Secrets Manager, not in repo/image |
| S6 | 401 handling | anonymous `/auth/me` → logged-out, no crash |
| S7 | ALB TLS | only 443 open publicly; 80 redirects |

### 8.3 Deployment Proof Portfolio (screenshots)
- IAM: `notevault-ec2-role` + inline policy (Section 3.3).
- EC2: instance with SG + role attached.
- RDS: endpoint, SG, backup config.
- S3: bucket (private) + CORS config.
- CloudWatch: log groups with live JSON log lines.
- ALB (bonus): listeners 443/80, target groups healthy.
- Final: `curl https://notevault.example.com/health` → `{"status":"ok"}` and a real upload/download round-trip.

### 8.4 Final Technical Report + video
- Merge proof + ERD + architecture diagram + test results.
- Video: 3–5 min walkthrough (register → upload → browse → download → ALB URL).

---

## 9. Go-live sequence (single source of truth)

1. **DBA**: provision RDS, note endpoint.
2. **Security**: create S3 bucket + CORS, IAM role, SGs, Secrets Manager secret.
3. **DevOps**: launch EC2, install Docker, push images, write prod `docker-compose.yml`.
4. **Backend**: confirm `S3_ENDPOINT_URL`/AWS keys **unset**, `COOKIE_SECURE=true`.
5. **Frontend**: rebuild with `NEXT_PUBLIC_API_URL=ALB HTTPS`.
6. **DevOps**: `docker compose up -d` → `alembic upgrade head` → `/health` green.
7. **Security**: final review (Sections 3 + 8.2).
8. **QA**: run F1–F11 + S1–S7, capture portfolio.
9. **Frontend**: verify responsive + cookie behavior over HTTPS.
10. **DevOps (bonus)**: ALB + ACM + target groups + alarms.

---

## 10. Rollback & troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| 500 on `/documents` | migration not run | `docker compose exec backend alembic upgrade head` |
| Upload 403 from browser | S3 CORS / origin mismatch | Add frontend origin to bucket CORS |
| Upload 403/401 from backend | instance role missing S3 perms | Attach Section 3.3 policy to EC2 role |
| Login works, refresh logs out | cookie `secure` over HTTP | serve via HTTPS/ALB; `COOKIE_SECURE=true` |
| Presigned URL points to `minio` | `S3_ENDPOINT_URL` still set in prod | unset it; restart backend |
| High CloudWatch noise | bcrypt warning | already fixed — using direct `bcrypt` (no `passlib`) |

**Rollback**: `docker compose down` + redeploy previous image tag; RDS/S3 data is preserved (external state).

---

## 11. Local → AWS env diff (quick reference)

| Var | Local | AWS prod |
| --- | --- | --- |
| `DATABASE_URL` | `...@db:5432/...` | `...@<rds-endpoint>:5432/...` |
| `S3_ENDPOINT_URL` | `http://minio:9000` | **unset** |
| `S3_PUBLIC_ENDPOINT_URL` | `http://localhost:9000` | **unset** |
| `AWS_ACCESS_KEY_ID` | `minioadmin` | **unset** (IAM role) |
| `AWS_SECRET_ACCESS_KEY` | `minioadmin` | **unset** (IAM role) |
| `COOKIE_SECURE` | `false` | `true` |
| `JWT_SECRET` | dummy in `.env` | Secrets Manager |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | `https://<alb-domain>` |

---

*End of runbook. Every step maps to the assigned squad roles; the codebase already satisfies the zero-code-change deployment contract (env-only), presigned-URL S3 flow, httpOnly JWT cookie, and JSON stdout logging required for CloudWatch.*
