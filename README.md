# Campus Operations Platform (`campus-ops`)

Single-tenant college operations platform featuring **Placement Management** and **Transfer Certificate (TC) Management** modules. Built for independent per-college redeployment with admin-configurable structures and custom field engine.

---

## 🚀 Quick Start (Local Development Setup)

Follow these exact steps on a fresh system to clone, install, configure, and start the local development environment.

### 📋 Prerequisites
Ensure the following tools are installed on your workstation:
- **Node.js**: `v22 LTS` (or v20 LTS minimum)
- **Package Manager**: `pnpm` (`npm install -g pnpm`)
- **Database Options**:
  - **Docker Desktop** (for running local PostgreSQL via Docker Compose), OR
  - A cloud PostgreSQL instance connection string.

---

### Step 1: Clone Repository
```bash
git clone <repository-url> campus-ops
cd campus-ops
```

### Step 2: Install Dependencies
```bash
pnpm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:

```bash
# On Linux / macOS / Git Bash:
cp .env.example .env

# On Windows PowerShell:
Copy-Item .env.example .env
```

> [!NOTE]
> `.env` contains default values for local development. Required Phase 0/1 keys (`DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `NODE_ENV`) are prefilled with local development defaults.

---

### Step 4: Start PostgreSQL Database

#### Option A: Local Docker PostgreSQL (Recommended for offline local dev)
Start the PostgreSQL 16 container using Docker Compose:

```bash
docker compose up -d
```

To verify the container is healthy:
```bash
docker compose ps
```

#### Option B: Cloud PostgreSQL
If using a managed cloud database (Neon, Supabase DB, Railway, etc.), update the `DATABASE_URL` in `.env`:
```env
DATABASE_URL="postgresql://user:password@your-cloud-host:5432/campus_ops?sslmode=require"
```

---

### Step 5: Start Development Server

Run the Next.js development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🛠️ Available Scripts

- `pnpm dev` — Start the Next.js App Router dev server on port 3000.
- `pnpm build` — Create an optimized production build (TypeScript & Next Turbopack build check).
- `pnpm start` — Start the production server after building.
- `pnpm lint` — Run ESLint check over the codebase.
- `pnpm format` — Format all files using Prettier.

---

## 📁 Repository Structure Overview

```text
src/
├── app/                  # Next.js App Router pages and route groups
├── components/           # UI components (shadcn primitives, forms, tables)
├── modules/              # Core feature modules (auth, rbac, departments, tc, placements, etc.)
├── server/               # Business logic services, Prisma repositories, auth & storage
├── config/               # Zod-validated environment config (env.ts)
├── lib/                  # Shared utility functions (utils.ts)
└── types/                # TypeScript shared type definitions

prisma/                   # Database schema & migrations
docs/                     # Architecture & build specifications (docs/ARCHITECTURE.md)
```

---

## ⚙️ Environment Variable Validation

Environment variables are validated at boot time via `src/config/env.ts` using **Zod**. If a required variable is missing or malformed, the application will stop boot and output clear error logs detailing which variables failed.
