# Production Deployment & Cloud Infrastructure Guide

This guide details how to deploy the **JECRC Centralized Hackathon Management Platform** to production environments, including cloud serverless platforms (Vercel), container services (Render/Railway), and self-hosted Docker servers.

---

## 1. Cloud Architecture Overview

```
                        [ Cloudflare / CDN ]
                                 │
                                 ▼
                   [ Next.js Production Runtime ]
                 (Vercel Edge or Docker Container)
                                 │
            ┌────────────────────┴────────────────────┐
            ▼                                         ▼
[ Managed PostgreSQL (Neon / Supabase) ]   [ Object Storage (S3 / Uploads) ]
            │
            ▼
[ Automated GitHub Actions CI/CD ]
```

---

## 2. Option A: Deploy to Vercel (Recommended for Next.js)

Vercel provides native support for Next.js App Router, Route Handlers, and Edge caching.

### Step 1: Push Repository to GitHub
Ensure your repository is up to date on `main`:
```bash
git push origin main
```

### Step 2: Import Project to Vercel
1. Log into your [Vercel Dashboard](https://vercel.com).
2. Click **Add New Project** and select `hackathon-management-system`.
3. Choose **Next.js** as Framework Preset.
4. Root Directory: `./`

### Step 3: Configure Environment Variables
Set the following environment variables in Vercel Project Settings:

| Variable | Recommended Production Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true` | Production connection string with pooling |
| `DIRECT_URL` | `postgresql://...supabase.com:5432/postgres` | Direct connection for Prisma migrations |
| `NEXTAUTH_URL` | `https://your-domain.vercel.app` | Canonical app URL |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` | JWT session signature secret |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console | JECRC Google Workspace OAuth |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console | OAuth Secret |
| `GOOGLE_ALLOWED_DOMAIN` | `@jecrcu.edu.in` | Campus domain gate |
| `GITHUB_API_TOKEN` | Optional GitHub Personal Access Token | For high rate-limit repo auditing |

### Step 4: Build & Output Settings
* **Build Command**: `pnpm prisma generate && pnpm build`
* **Install Command**: `pnpm install`

---

## 3. Option B: Docker Container Deployment (Self-Hosted / VPS)

For deploying on AWS EC2, DigitalOcean Droplet, Linode, or campus on-premise servers.

### 1-Command Production Launch:
Run the production orchestrator that spins up the Next.js standalone container alongside a dedicated PostgreSQL database:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Verify Container Status:
```bash
docker compose -f docker-compose.prod.yml ps
```

### Run Migrations & Seed inside Container:
```bash
docker exec -it hackathon-app pnpm prisma db push
docker exec -it hackathon-app pnpm db:seed
```

---

## 4. Option C: Render / Railway Deployment

### Railway:
1. Connect GitHub repository `AshishForCode/hackathon-management-system`.
2. Add a **PostgreSQL** service plugin.
3. Railway automatically detects `Dockerfile` and builds the production standalone container.
4. Set `DATABASE_URL` referencing the Railway Postgres connection.

### Render:
1. Create a **Web Service** from GitHub repo.
2. Select **Docker** environment.
3. Attach a **Render PostgreSQL** instance.
4. Add environment variables: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.

---

## 5. Automated CI/CD Pipeline (GitHub Actions)

Every pull request or push to `main` automatically runs our `.github/workflows/ci.yml` pipeline:

1. **Lint & Typecheck**: Runs ESLint rules and TypeScript strict compiler (`tsc --noEmit`).
2. **PostgreSQL Test Service**: Boots an isolated PostgreSQL service container in GitHub runner.
3. **Database Migration & Seed**: Validates schema drift and seeds test data.
4. **Lifecycle Suite**: Runs all 10 automated lifecycle integration checks (`pnpm test:lifecycle`).
5. **Production Build**: Compiles all 22 static and dynamic App Router routes with zero runtime errors.

---

## 6. Production Health Monitoring

Check platform health, uptime, and database connectivity at:
```http
GET https://your-domain.com/api/health
```

Sample JSON Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-10-22T18:15:00.000Z",
  "database": "connected",
  "version": "1.0.0",
  "environment": "production"
}
```
