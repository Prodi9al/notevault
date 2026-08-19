# AWS Deployment Runbook — Document Management Platform
**Group Admin / Cloud Security Architect: Prodigal**
**Deadline: 25 August 2026**

This runbook sequences the deployment so the Deployment Proof Portfolio screenshots can be taken as each stage goes live. Order matters — IAM first, then data layer, then compute, then monitoring. Each section tags who owns it.

---

## 0. Architecture Overview (Your deliverable — owns the diagram)

```
                        ┌─────────────────────┐
                        │      Route53/DNS     │ (optional)
                        └──────────┬───────────┘
                                   │
                        ┌──────────▼───────────┐
                        │   EC2 (App Server)    │  ← WISDOM
                        │  FastAPI + Nginx      │
                        │  Security Group: SG-app│  ← you
                        └───┬───────────────┬───┘
                            │               │
              ┌─────────────▼──┐      ┌─────▼──────────┐
              │   RDS (Postgres)│      │   S3 Bucket     │
              │  SG: SG-db      │      │  presigned URLs │  ← WISDOM
              │  private subnet │      │  no public ACLs │
              └─────────────────┘      └─────────────────┘
                            │
                  ┌─────────▼─────────┐
                  │    CloudWatch      │  ← WISDOM
                  │  logs + metrics    │
                  └────────────────────┘

IAM: EC2 instance role (S3 read/write scoped to bucket, no admin) ← you
     Per-user IAM console access, least privilege only            ← you
```

Draw this in draw.io / Excalidraw / Lucidchart for the System Design Document — this ASCII version is just the working reference. Screenshot it as the "AWS Architecture Diagram" deliverable.

---

## 1. IAM Setup (You — do this first, before anyone touches the console)

### 1.1 Create IAM users for each teammate (not root logins)
For each group member, in IAM Console → Users → Create user:
- Enable AWS Management Console access
- Attach to a group with scoped permissions (below), not directly to the user
- Require MFA if you have time — bonus marks territory and genuinely good practice to show in the security review section

### 1.2 Create IAM groups with least-privilege policies
- **DevOps-Group** (WISDOM): `AmazonEC2FullAccess`, `AmazonS3FullAccess` scoped to the project bucket only (custom policy, not the AWS managed one — see below), `CloudWatchFullAccess`
- **DBA-Group** (shekiel): `AmazonRDSFullAccess` or scoped to the one RDS instance, read access to relevant Secrets Manager entry if you use one for DB creds
- **Dev-Group** (backend + frontend devs): read-only console access, no ability to create/delete infra
- **Admin-Group** (you): full access, but this is the one you screenshot to show "least privilege was actually designed, not just claimed"

### 1.3 Scoped S3 bucket policy (attach to IAM role, not the bucket)
Don't use `AmazonS3FullAccess` for the app's runtime role. Scope it to the bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME"
    }
  ]
}
```

### 1.4 EC2 Instance Role (not access keys on the box)
Create an IAM role for EC2, attach the S3 policy above, attach it to the instance at launch (WISDOM does the launch, but the role should already exist from your side first). This means no AWS access keys ever sit in `.env` on the server — this is your strongest "security review" talking point.

**Screenshot targets for Portfolio:** IAM users list, IAM groups + attached policies, the custom S3 policy JSON, the EC2 instance role attached to the running instance.

---

## 2. Security Groups (You)

| SG Name | Attached to | Inbound Rules | Notes |
|---|---|---|---|
| `SG-app` | EC2 | 22 (SSH, your IP only), 80/443 (0.0.0.0/0) | Never open 22 to 0.0.0.0/0 |
| `SG-db` | RDS | 5432 (Postgres) from `SG-app` only, not from internet | RDS should have **no public accessibility** enabled |

Put RDS in a private subnet if you're setting up a custom VPC; if using the default VPC, at minimum disable "Publicly Accessible" on the RDS instance and restrict inbound to `SG-app`'s security group ID (not an IP range).

**Screenshot targets:** both security groups with their inbound rule tables, RDS "Publicly Accessible: No" setting.

---

## 3. RDS Setup (shekiel — DBA, you review before go-live)

1. RDS Console → Create database → PostgreSQL, Free Tier eligible instance class
2. Publicly accessible: **No**
3. VPC security group: `SG-db`
4. Set master username/password — password goes into `.env` on EC2, never committed to the repo (check `.gitignore` covers this)
5. Run migrations against it once EC2 can reach it (shekiel + backend dev coordinate this)
6. shekiel builds ERD from the actual deployed schema for the System Design Document

**Screenshot targets:** RDS instance running, configuration tab showing SG-db and "not publicly accessible," connection successful from the app (e.g. a working `/health` endpoint hitting the DB).

---

## 4. S3 Bucket (WISDOM)

1. S3 Console → Create bucket → block all public access (keep this ON — presigned URLs handle access, not public ACLs)
2. Enable versioning (optional, easy bonus point for "we thought about data durability")
3. CORS config if the frontend uploads directly via presigned URL from the browser:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["*"]
  }
]
```
(Tighten `AllowedOrigins` to your actual EC2/domain before final submission — `*` is fine for testing, flag it as a fix in the report if you leave it.)

**Screenshot targets:** bucket with "Block all public access: On," a real uploaded object from testing, bucket policy/permissions tab.

---

## 5. EC2 Provisioning + Deployment (WISDOM)

1. Launch EC2 (t2.micro/t3.micro, free tier), attach `SG-app`, attach the IAM instance role from step 1.4
2. Elastic IP so the address doesn't change between screenshots/testing sessions
3. SSH in, install Docker if you're using docker-compose in prod, or set up directly:
   - Python + venv, install `requirements.txt` — **pin `bcrypt<4.1` or `bcrypt==4.1.3` exactly**, since anything newer breaks passlib hashing (confirmed this in testing — see note below)
   - Nginx as reverse proxy → gunicorn/uvicorn on the app
   - `.env` file on the box with DB creds + any secrets — permissions `chmod 600`, owned by the app user, never world-readable
   - systemd service or PM2 to keep it running after SSH disconnects
4. Point the domain (if you have one) or just use the Elastic IP for the video demo

**Known bug to fix before deploy:** `passlib==1.7.4` + `bcrypt>=4.1.4` throws `AttributeError: module 'bcrypt' has no attribute '__about__'` on every hash/verify call — it still works but spams CloudWatch logs. Either pin `bcrypt==4.1.3` in `requirements.txt`, or swap passlib for calling `bcrypt` directly. Worth fixing before deploy specifically because it'll otherwise pollute every CloudWatch log entry you screenshot.

**Screenshot targets:** EC2 instance running with Elastic IP, security group attached, instance role attached, app reachable via browser at the public IP/domain.

---

## 6. CloudWatch (WISDOM, you review)

1. Install/enable CloudWatch agent on EC2, or at minimum ship application logs via the standard EC2 → CloudWatch Logs integration
2. Create a log group for the app (e.g. `/docmgmt/app`)
3. Basic metrics dashboard: CPU utilization, network in/out — free tier default metrics are enough, no custom metrics needed unless going for bonus marks
4. Let it run for a bit before taking screenshots so there's real traffic data, not an empty graph

**Screenshot targets:** CloudWatch log group with real entries (auth events, requests), a metrics dashboard/graph with visible data over time.

---

## 7. Environment Variable Protection (You — security review)

- `.env` never committed — confirm `.gitignore` has it and do a `git log -p -- .env` check across the whole history, not just HEAD, in case it was committed early and later removed
- On EC2: `.env` file permissions locked to the app's running user only
- DB password, JWT secret, any API keys — not hardcoded anywhere in the repo (grep for them before final submission: `grep -rn "SECRET\|PASSWORD\|API_KEY" --include=*.py .`)
- No AWS access keys anywhere in code or `.env` — this is the payoff of using the EC2 instance role from step 1.4 instead

This section becomes your "security review" writeup in the Final Technical Report — you can literally walk through this checklist as the narrative.

---

## Suggested order given 8 days left

| Day | Task | Owner |
|---|---|---|
| 1 | IAM users/groups/policies, security groups | You |
| 1–2 | RDS provisioned, reachable, migrated | shekiel |
| 2 | S3 bucket + policy live | WISDOM |
| 2–3 | EC2 launched, app deployed, bcrypt pin fixed | WISDOM + backend dev |
| 3 | Frontend wired to live backend URL | Lil T |
| 3–4 | CloudWatch logging confirmed with real traffic | WISDOM |
| 4 | Full security review pass (env vars, IAM, SGs) | You |
| 4–5 | charlie_ryde starts test plan execution + Portfolio screenshots | charlie_ryde |
| 5–6 | System Design Document (ERD, wireframes, architecture diagram) finalized | shekiel + Lil T + you |
| 6–7 | Final Technical Report written | charlie_ryde + all |
| 7–8 | Video presentation recorded + merged | charlie_ryde |
| 8 | Buffer / submit | All |

Want me to also draft the actual IAM policy JSON files as ready-to-paste files, or the Nginx/systemd config for step 5, so WISDOM can move faster on the EC2 side?
