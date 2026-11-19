# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Instead, report
privately via [GitHub Security Advisories](https://github.com/Prodi9al/notevault/security/advisories/new)
or contact the maintainer directly (@Prodi9al). We aim to acknowledge reports
within a few days.

## Supported versions

NoteVault is a single-track project; only the latest `main` is supported.

## Security model

- **Auth**: REST + httpOnly JWT cookie. No tokens in `localStorage`.
- **Files**: stored in S3 (MinIO locally) and served via short-lived presigned
  URLs — never written to local/EC2 disk.
- **Secrets**: configured via environment (`SHARED_SECRET`, `DATABASE_URL`,
  S3 credentials). Never commit real values; use `.env.example` as the template.
- **Passwords**: hashed with `bcrypt`.

## Hardening checklist for deployers

- [ ] Set a strong, random `SHARED_SECRET` (e.g. `openssl rand -hex 32`).
- [ ] Use a dedicated, least-privilege DB user — not a superuser.
- [ ] Restrict the S3 bucket policy to the app's role; block public access.
- [ ] Serve only over HTTPS; set the JWT cookie `Secure` and `SameSite`.
- [ ] Rotate credentials and review `.env` is in `.gitignore`.

## Out of scope

- Denial-of-service and rate-limit bypass on a self-hosted dev instance
- Reports that require a compromised host or stolen admin credentials
