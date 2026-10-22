# Centralized Multi-Campus Hackathon Management Platform
### JECRC University & JECRC Foundation

A modern, production-grade, centralized web platform built to orchestrate and track the complete lifecycle of multi-campus hackathons:
**Registration → Team Formation & Matchmaking → Repository Sync → Jury Rubric Scoring → Dynamic Leaderboard → Official Winners Announcement → Cryptographically Verifiable Certificates → Permanent Innovation Archive**.

---

## 1. Multi-Campus Architecture & Key Innovations

- **Multi-Campus Scope**: Built for **JECRC University** (`JECRC-U`) and **JECRC Foundation** (`JECRC-F`). Supports inter-campus competitions as well as campus-exclusive events with automated student enrollment eligibility guards.
- **7-Role Hierarchical RBAC**: Granular authorization spanning Super Admins, Campus Admins, Organizers, Student Participants, Mentors, Jury Members, and Guests.
- **GitHub Repository Sync & Timeline Audit**: Integrates directly with GitHub REST API to extract total commits, active contributors, language breakdown, and flags commits timestamped outside official hackathon windows.
- **Normalized Weighted Rubric Engine**: Multi-criterion scoring with customizable weights (Innovation, Technical Execution, Impact, UI/UX). Scores are normalized to a standard 100-point scale across judges.
- **Live Dynamic Leaderboard**: Instant standings with campus cohort filtering (`All`, `JECRC-U`, `JECRC-F`), track filtering, and tie-breaking algorithms.
- **Cryptographic Credential Verification**: Public ledger verification endpoint (`/certificates/verify/[code]`) with institutional seals, student identity confirmation, and instant PDF print formatting.
- **Permanent Multi-Campus Innovation Archive**: Searchable repository of past hackathon solutions with GitHub links, live demos, and award badges.

---

## 2. Technology Stack

- **Frontend**: Next.js 16+ App Router, React 19, TypeScript, Tailwind CSS, Lucide Icons, React Hook Form + Zod.
- **Backend**: Next.js Route Handlers (`/api/v1`) with a typed service-repository architecture.
- **Database & ORM**: PostgreSQL with Prisma ORM (28 relational models, indexes, composite unique keys).
- **Authentication**: Auth.js / NextAuth v5 with Credentials provider and Google OAuth restricted to `@jecrcu.edu.in`.
- **DevOps & Containers**: Multi-stage `Dockerfile`, `docker-compose.yml`, and GitHub Actions CI.

---

## 3. Phased Delivery Status (All 7 Phases Complete ✅)

- [x] **Phase 0**: Requirements, architecture specification, Prisma schema (28 models), Docker & CI setup.
- [x] **Phase 1**: Authentication, 7-role RBAC, user profiles, campus setup, hackathon CRUD & status transitions.
- [x] **Phase 2**: Participant registration, eligibility checks, team formation (`JECRC-XXXXX` codes), invite system, "Looking for Teammates" matchmaking board, and streaming CSV export.
- [x] **Phase 3**: Project submissions, multipart file uploads (pitch decks), GitHub sync & commit timeline audit.
- [x] **Phase 4**: Multi-criteria scoring rubrics, interactive jury scoring console, and dynamic live leaderboard.
- [x] **Phase 5**: Official winners announcement, Hall of Fame, bulk verifiable certificates, and project archive.
- [x] **Phase 6**: Multi-campus analytics dashboard (JECRC-U vs JECRC-F cohorts), audit trail explorer, and system health checks.
- [x] **Phase 7**: Automated integration test suite (`pnpm test:lifecycle`), comprehensive documentation, and production build verification.

---

## 4. Complete REST API Reference (`/api/v1`)

### Authentication & Profiles
- `POST /api/v1/auth/register` — Register student or user account
- `GET /api/v1/auth/me` — Fetch current authenticated session user
- `GET /api/v1/auth/profile` / `PUT /api/v1/auth/profile` — Manage student profile (enrollment number, branch, year, skills)

### Campuses & Hackathons
- `GET /api/v1/campuses` — List active JECRC campuses
- `GET /api/v1/hackathons` — List hackathons with mode, status, and campus filters
- `POST /api/v1/hackathons` — Create hackathon (Admin/Organizer)
- `GET /api/v1/hackathons/[id]` — Retrieve hackathon details with tracks, sponsors, and FAQs
- `PATCH /api/v1/hackathons/[id]/status` — Transition hackathon lifecycle status

### Registrations & Teams
- `GET /api/v1/hackathons/[id]/register` — Check current user registration status
- `POST /api/v1/hackathons/[id]/register` — Register participant with track & custom preferences
- `GET /api/v1/hackathons/[id]/registrations` — Admin view of applicants with status filter
- `GET /api/v1/hackathons/[id]/registrations/export` — Stream CSV download of applicant roster
- `PATCH /api/v1/registrations/[id]` — Approve, waitlist, or reject participant
- `GET /api/v1/hackathons/[id]/teams` — Fetch user's active team for the competition
- `POST /api/v1/hackathons/[id]/teams` — Form new team with generated invite code
- `POST /api/v1/teams/join` — Join team via code (`JECRC-XXXXX`)
- `POST /api/v1/teams/[id]/invites` — Send direct team invite to student email
- `DELETE /api/v1/teams/[id]/members/[userId]` — Remove member or leave team
- `GET /api/v1/hackathons/[id]/matchmaking` — Query "Looking for Teammates" board

### Submissions & Git Sync
- `GET /api/v1/hackathons/[id]/submissions` — List submissions gallery (`?mine=true` for team draft)
- `POST /api/v1/hackathons/[id]/submissions` — Create or update project draft
- `POST /api/v1/submissions/[id]/finalize` — Permanently lock submission for jury evaluation
- `POST /api/v1/submissions/[id]/sync` — Trigger immediate repository sync with GitHub
- `POST /api/v1/uploads` — Upload presentation PDF or media attachment (up to 25MB)

### Scoring & Leaderboards
- `GET /api/v1/hackathons/[id]/rubrics` — Get active rubric and standardized criteria
- `POST /api/v1/hackathons/[id]/rubrics` — Configure custom scoring rubric (Admin)
- `GET /api/v1/hackathons/[id]/evaluations` — Jury queue of assigned finalist submissions
- `POST /api/v1/submissions/[id]/evaluations` — Submit jury rubric scores and feedback
- `GET /api/v1/hackathons/[id]/leaderboard` — Live computed standings with campus filters

### Results, Certificates & Archive
- `GET /api/v1/hackathons/[id]/results` — Published winners and honoree rankings
- `POST /api/v1/hackathons/[id]/results` — Generate official results from leaderboard
- `POST /api/v1/hackathons/[id]/certificates/generate` — Bulk issue verified digital certificates
- `GET /api/v1/certificates/me` — List certificates earned by current user
- `GET /api/v1/certificates/verify/[code]` — Public credential verification lookup
- `GET /api/v1/archive` — Permanent multi-campus innovation project archive

### Analytics, Compliance & Health
- `GET /api/v1/analytics/overview` — Multi-campus comparative analytics (JECRC-U vs JECRC-F)
- `GET /api/v1/audit-logs` — Immutable compliance audit ledger (Admin)
- `GET /api/health` — Platform health check (database status, latency, memory utilization)

---

## 5. Local Setup & Quickstart

### Prerequisites
- **Node.js**: v20+ LTS
- **pnpm**: v10+ (or use the provided `.\dev` wrapper script)
- **PostgreSQL**: Local database or Docker Compose

### 1. Installation
```powershell
# Clone the repository
git clone https://github.com/AshishForCode/hackathon-management-system.git
cd "hackathon management system"

# Install dependencies
pnpm install
```

### 2. Environment Configuration
Ensure `.env` contains your PostgreSQL connection string:
```env
DATABASE_URL="postgresql://hackathon_user:hackathon_pass@localhost:5432/hackathon_db?schema=public"
NEXTAUTH_SECRET="jecrc-hackathon-platform-dev-secret-key-32chars"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Database Initialization & Seeding
```powershell
# Push schema & generate client
pnpm db:push
pnpm db:generate

# Seed initial campuses, users, rubrics, and sample hackathon
pnpm db:seed
```

### 4. Run Development Server
```powershell
# In PowerShell:
.\dev

# Or:
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 5. Run Automated Integration Test Suite
```powershell
pnpm test:lifecycle
```

---

## 6. Pre-Configured Demo Accounts (1-Click Switcher)

Every account shares the default password: **`Password@123`**
You can log in instantly using the **1-Click Demo Account Switcher** on the `/login` page:

| Role | Name | Email | Campus |
| :--- | :--- | :--- | :--- |
| **Super Admin** | Dr. Ramesh Gupta | `admin@hackathon.jecrc.ac.in` | Global (All Campuses) |
| **Campus Admin** | Prof. S. K. Sharma | `admin.university@jecrc.ac.in` | JECRC University |
| **Campus Admin** | Dr. Meenakshi Joshi | `admin.foundation@jecrc.ac.in` | JECRC Foundation |
| **Student Leader** | Aarav Sharma | `aarav.sharma@jecrcu.edu.in` | JECRC University |
| **Student Member** | Diya Patel | `diya.patel@jecrcu.edu.in` | JECRC University |
| **Student Member** | Rohan Meena | `rohan.meena@jecrcf.edu.in` | JECRC Foundation |
| **Jury Member** | Ananya Iyer | `jury1@jecrc.ac.in` | JECRC University |
| **Jury Member** | Rajesh Kothari | `jury2@jecrc.ac.in` | JECRC Foundation |
| **Mentor** | Dr. Rajesh Sharma | `mentor@jecrc.ac.in` | JECRC University |

---

## 7. Automated CI/CD Pipeline & Deployment

The platform is integrated with GitHub Actions and multi-stage Docker containerization:
* **CI Workflow**: `.github/workflows/ci.yml` runs on every push and pull request to `main`.
* **Deployment Guide**: See [DEPLOYMENT.md](file:///c:/Users/aashi/Desktop/hackathon%20management%20system/DEPLOYMENT.md) for step-by-step instructions for **Vercel**, **Docker Compose**, and **Render/Railway**.

### Spin Up Full Production Stack with Docker:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 8. License & Credits

Built as part of the Centralized Hackathon Management Platform internship for **JECRC University & JECRC Foundation**.
All rights reserved.
