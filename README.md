# Centralized Hackathon Management Platform
### JECRC University & JECRC Foundation

A modern, enterprise-grade platform designed to track the entire lifecycle of multi-campus hackathons:
**Registration → Team Formation → Repository Tracking → Mentor/Jury Evaluation → Winner Announcement → Long-Term Archive**.

---

## 1. Tech Stack

- **Frontend**: Next.js 14+ (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, React Hook Form + Zod
- **Backend**: Next.js Route Handlers (`/api/v1`) & Server Actions with clean service architecture
- **Database & ORM**: PostgreSQL with Prisma ORM (28 models, full relational constraints)
- **Authentication**: Auth.js / NextAuth (Email/Password + Google OAuth restricted to `@jecrcu.edu.in`) with 7-role RBAC
- **Integrations**: GitHub REST API (commit verification, contributor stats, timeline validation)
- **Evaluation Engine**: Dynamic weighted rubrics, multi-round jury scoring, conflict-of-interest flagging
- **DevOps**: Docker, Docker Compose, GitHub Actions CI (lint, typecheck, test, build)

---

## 2. User Roles & Permissions (RBAC)

| Role | Scope & Key Capabilities |
| :--- | :--- |
| **Super Admin** | Manages all hackathons across both campuses, system settings, user roles, score overrides |
| **Campus Admin** | Scoped to JECRC University or JECRC Foundation; creates and manages campus hackathons |
| **Organizer** | Assigned to specific hackathons; manages tracks, participants, deadlines, announcements |
| **Participant** | Registers for hackathons, creates/joins teams, invites members, submits repositories |
| **Mentor** | Assigned to teams, conducts check-ins, leaves qualitative feedback logs |
| **Jury** | Scores submissions using configurable weighted rubrics with conflict-of-interest checks |
| **Guest / Public** | Browses public hackathons, final leaderboards, and the historical project archive |

---

## 3. Getting Started (Local Development)

### Prerequisites
- **Node.js**: v20+ LTS
- **pnpm**: v10+ (`npm install -g pnpm`)
- **Docker & Docker Compose**: for local PostgreSQL

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd "hackathon management system"
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` matches your local database settings (defaults match `docker-compose.yml`):
```env
DATABASE_URL="postgresql://hackathon_user:hackathon_pass@localhost:5432/hackathon_db?schema=public"
```

### 3. Start Database via Docker
```bash
docker compose up -d
```
*(PostgreSQL will run on port `5432`, and optional pgAdmin on port `5050`)*

### 4. Run Database Migrations & Generate Prisma Client
```bash
# Push schema to database
pnpm db:push

# Generate typed Prisma client
pnpm db:generate

# Seed initial campuses, users, tracks, rubrics, and sample hackathon
pnpm db:seed
```

### 5. Start Development Server
```bash
pnpm dev
```
Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 4. Demo Seed Accounts

All accounts share the default password: **`Password@123`**

| Role | Email | Campus | Notes |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@hackathon.jecrc.ac.in` | Global | Complete platform control |
| **Campus Admin (Univ)** | `admin.university@jecrc.ac.in` | JECRC University | Scoped admin |
| **Campus Admin (Found)** | `admin.foundation@jecrc.ac.in` | JECRC Foundation | Scoped admin |
| **Mentor** | `mentor@jecrc.ac.in` | JECRC University | Dr. Rajesh Sharma |
| **Jury 1** | `jury1@jecrc.ac.in` | JECRC University | Prof. Anita Verma |
| **Jury 2** | `jury2@jecrc.ac.in` | JECRC Foundation | Mr. Vikram Singh |
| **Student 1** | `student1@jecrcu.edu.in` | JECRC University | Aashi Gupta (3rd Year CS) |
| **Student 2** | `student2@jecrcu.edu.in` | JECRC University | Rahul Meena (3rd Year CS) |
| **Student 3** | `student3@jecrcu.edu.in` | JECRC University | Priya Sharma (3rd Year IT) |
| **Student 4** | `student4@jecrcf.edu.in` | JECRC Foundation | Arjun Patel (3rd Year CS) |
| **Student 5** | `student5@jecrcf.edu.in` | JECRC Foundation | Sneha Joshi (2nd Year ECE) |

---

## 5. Project Structure

```
├── .github/workflows/ci.yml       # GitHub Actions CI (lint, typecheck, test)
├── Dockerfile                     # Multi-stage production container
├── docker-compose.yml             # Local Postgres & pgAdmin service
├── prisma/
│   ├── schema.prisma              # 28 models covering the complete hackathon lifecycle
│   └── seed.ts                    # Idempotent database seeder with realistic demo data
├── src/
│   ├── app/                       # Next.js App Router (pages and /api/v1 routes)
│   ├── components/                # Domain-driven UI components
│   ├── lib/
│   │   ├── auth/rbac.ts           # 40+ granular permissions & role hierarchy checks
│   │   ├── db/prisma.ts           # Singleton Prisma client with HMR cache protection
│   │   └── utils/                 # Structured logger, rate-limiter, API response envelope
│   └── types/                     # Shared TypeScript interfaces
└── tests/                         # Unit & E2E test suites
```

---

## 6. Scripts Reference

- `pnpm dev`: Starts Next.js development server
- `pnpm build`: Builds production bundle with TypeScript checks
- `pnpm lint`: Runs ESLint across all files
- `pnpm typecheck`: Validates TypeScript types (`tsc --noEmit`)
- `pnpm db:generate`: Regenerates `@prisma/client` types
- `pnpm db:push`: Synchronizes database schema with PostgreSQL
- `pnpm db:seed`: Seeds database with initial campuses, roles, and sample hackathon

---

## 7. Phased Delivery Roadmap

- [x] **Phase 0 (Week 1)**: Requirements recap, architecture document, DB schema (28 models), repo setup, CI, Docker, seed scripts.
- [ ] **Phase 1 (Weeks 2-3)**: Authentication, RBAC enforcement, user profiles, campus setup, hackathon CRUD.
- [ ] **Phase 2 (Weeks 4-5)**: Participant registration, custom form fields, team management, invite codes, teammate matchmaking.
- [ ] **Phase 3 (Weeks 6-7)**: Submission workflows, GitHub/GitLab integration, commit validation, timeline enforcement.
- [ ] **Phase 4 (Weeks 8-9)**: Rubric builder, mentor assignment, jury scoring interface, score normalization.
- [ ] **Phase 5 (Week 10)**: Results calculation, automated PDF certificates, notification system, public archive.
- [ ] **Phase 6 (Week 11)**: Role-specific analytical dashboards, CSV/PDF export, accessibility audit.
- [ ] **Phase 7 (Week 12)**: End-to-end testing, security penetration review, production deployment.
