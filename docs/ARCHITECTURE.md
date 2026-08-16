# College Operations Platform — Architecture & Build Specification (v1)

## 0. What this document is

This is the consolidated, corrected version of your two source documents (general full-stack standard + the College Placement/TC platform spec). It resolves every place those two documents left a decision open, fixes a handful of real architectural risks, and becomes the single source of truth you hand to Antigravity for the whole build.

**Action item before you start:** save this file into your repo as `docs/ARCHITECTURE.md`. Prompt 1 in the companion prompts document tells Antigravity to read it and treat it as authoritative.

---

## 1. Product summary

A **college operations platform** sold as a product, not a SaaS. Each customer college gets its own fully independent deployment: own Next.js app instance, own PostgreSQL database, own storage bucket, own email/auth config. No shared data, no `tenant_id`, no cross-college anything. The same codebase is redeployed per customer and configured per customer.

v1 ships two modules on a shared platform foundation:
1. **Placement Management** — replaces WhatsApp groups + manual Excel tracking for campus recruitment drives.
2. **Transfer Certificate (TC) Management** — replaces manual, in-person, multi-office approval chasing.

Every part of both modules that could plausibly differ between colleges (departments, programs, academic structure, fields, forms, workflows, eligibility rules, terminology, Excel formats) is admin-configurable data, not code.

---

## 2. Deployment model

**Verdict: correct call, keep it.** For a product sold to a small number of institutional customers who each care about data ownership and sovereignty, isolated single-tenant deployments are simpler to build, simpler to secure, and simpler to sell ("your data never touches another college's database" is a real sales line) than multi-tenancy. Multi-tenancy would only pay for itself at a scale (hundreds of tenants, self-serve signup) this product isn't targeting.

**The one thing this model costs you:** N deployments means N times the operational surface — N databases to back up, N installs to patch when you fix a bug. Design for that now, not later:

- Keep 100% of college-specific values in environment variables + first-run configuration data, **never** in code or in a branch.
- One `git pull` + `prisma migrate deploy` should be enough to upgrade any college's install.
- Build the deploy path (Prompt 38) as a repeatable script/template from day one, so onboarding college #2 is an afternoon, not a new dev project.

---

## 3. Finalized technology stack

Where your source documents offered a choice or left something open, it's resolved here. Treat this table as final unless you have a specific reason to deviate — and if you do, update this file.

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js, latest stable, App Router | Full-stack: UI, Route Handlers, Server Actions |
| Language | TypeScript, strict mode | No `any` without a comment justifying it |
| Styling / UI | Tailwind CSS + shadcn/ui | |
| Database | PostgreSQL | One database per college deployment |
| ORM | Prisma ORM | |
| **Auth** | **Better Auth**, email/password first | See Correction #2 below |
| Validation | Zod everywhere | API input, forms, env vars — no exceptions |
| Forms | React Hook Form + Zod resolver | |
| Excel | SheetJS (`xlsx`) | |
| Email | Resend + React Email | |
| Background jobs | Inngest | Serverless-friendly, no Redis/worker to run |
| **Realtime notifications** | **Polling** (SWR/React Query revalidation) for v1 | See Correction #3 |
| **File storage** | **Cloudflare R2** (S3-compatible API) | See Correction #4 |
| PDF generation | `@react-pdf/renderer` (server-side) | Component-based, fits a React/TS team |
| QR codes | `qrcode` npm package | |
| Rate limiting | Upstash Redis (free tier) if deploying serverless; in-memory limiter if single-instance | Match to actual hosting, don't over-provision |
| Testing | Vitest (unit/integration) + Playwright (E2E) | |
| Deployment | Vercel or Railway + managed Postgres (Neon / Railway / Supabase-as-DB-only) | Stays free-tier viable |

---

## 4. Key corrections and why

Your architecture is sound and the "highly configurable, independently deployed" model is the right call for this business. These are the changes I'd make before writing code — none of them change your shape, they close gaps.

| # | Area | What the spec said | Decision | Why |
|---|---|---|---|---|
| 1 | Custom fields | EAV table or JSONB, left open (§9, §58) | **JSONB-first**: `custom_field_definitions` holds metadata; a `customFields Json` column (GIN-indexed) sits on Student/Faculty/etc. Core relational fields (department, program, batch, academicPeriod) stay real columns, exactly as §10 already says. | A row-per-value EAV table earns its complexity at multi-tenant, millions-of-rows scale. A single college has thousands of students. JSONB + GIN index is simpler to write, simpler to query, and fast enough. |
| 2 | Auth library | Choice of Supabase Auth / Better Auth / Auth.js | **Better Auth**, sessions stored in the college's own Postgres via the Prisma adapter | Auth.js's own maintainer team merged into Better Auth in late 2025; Auth.js is now maintenance-mode (security patches only, no new features). Better Auth is TypeScript-native, has real RBAC/organization plugins that map cleanly onto your role/department model, and — critically for this deployment model — adds zero external service dependency. Supabase Auth is fine *if* you're already committing to Supabase for storage/realtime anyway; otherwise it quietly makes Supabase mandatory for every single college install. |
| 3 | Realtime notifications | "Supabase Realtime or equivalent" (§46) | **Polling** for v1 (revalidate unread count every 15–30s) | A notification bell in a college admin tool doesn't need sub-second delivery. Polling needs zero extra infrastructure and works on any host, including free tiers. This is exactly the "avoid premature optimization" principle already in your own doc — keep realtime as a documented upgrade path, not a v1 dependency. |
| 4 | File storage | S3 / R2 / Supabase Storage, left open | **Cloudflare R2** specifically, behind the storage abstraction layer | S3-API compatible, so the abstraction layer is unaffected either way; genuinely free tier with no egress fees; doesn't force Supabase as a dependency for every install the way Supabase Storage would. |
| 5 | Eligibility rules vs. workflow conditions | Specified as two separate features (§25 placement, §35 workflow) | **One shared rule/condition-evaluation engine** — operators, AND/OR groups, field resolvers over core + custom fields — consumed by both | They're the same primitive. Building it once satisfies your own §62 ("Placement + TC must use same platform services") and halves the surface you have to test. |
| 6 | Middleware's job | "Middleware for request processing and authentication" (Doc 1); "Never rely only on frontend permission checks" (Doc 2) | Middleware does **one thing**: check a session cookie exists, redirect to login if not. Every real permission and department-scope check happens server-side, in the service layer, on every request. | Next.js Middleware runs on the Edge runtime, which doesn't reliably support a full Prisma client. Trying to do real DB-backed authorization there is a common, painful failure mode. This also matches your own request-flow diagram, where Authorization is a step *after* Authentication, not folded into it. |
| 7 | TC verification | "QR links to `/verify/{secure-token}`... never expose sensitive data" (§40) | A separate, cryptographically random `verificationToken` (UUID), distinct from the human-readable, sequential `tcNumber`. Rate-limit the public verify route. | A sequential TC number (`TC/2026/001`) is guessable. A public page reachable by incrementing a visible ID is a real, common PII leak in systems exactly like this one. |
| 8 | Deleting config entities | "Activate/deactivate... Delete unused periods" (§7) | Hard delete only when **zero references exist**; otherwise force deactivate, never delete. | Prevents orphaning historical student/placement/TC records when a department, program, or academic period is removed after real data already points at it. |
| 9 | Excel upserts | "Safe Excel Upsert" (§21), no transaction strategy specified | **Chunked transactions** (e.g. 200-row batches) with row-level error isolation | One bad row at record 4,000 of 5,000 shouldn't roll back the whole import. This is your own "major selling point" feature (§65) — worth being explicit about. |
| 10 | Errors | "Sanitized error responses" (§66) | A small `AppError` class hierarchy + one central error-translation layer at the service boundary that maps Prisma/system errors to the friendly messages your own doc's example describes | Turns a stated principle into an actual pattern every service function uses, instead of ad hoc `try/catch` blocks with inconsistent messaging. |
| 11 | Scope & expectations | "Completely generate the project" | 38 prompts, covering all 12 of your original phases, produce a **complete, coherent, working v1** end to end | An agent pass at this scope gets you a genuinely functioning system. A dedicated security/performance/hardening pass (Phase 10) is still real, necessary work afterward — that's true of any system this size built by anyone, not specific to AI-assisted builds. Don't let "AI generated it" become an excuse to skip the review pass you'd insist on for a human-written PR. |

---

## 5. System architecture

```text
                              Browser
                                 │
                              Next.js
                                 │
                  ┌──────────────┼──────────────┐
                  │              │              │
            UI Layer (RSC)   API Layer      Server Actions
                  │              │              │
                  └──────────────┼──────────────┘
                                 ↓
                       Middleware (session check + redirect ONLY)
                                 ↓
                          Authentication
                                 ↓
                    Authorization (department/role/permission)
                                 ↓
                          Zod Validation
                                 ↓
                          Service Layer  ←──── Platform Engines (§7)
                                 ↓
                        Repository / Data Layer
                                 ↓
                             Prisma ORM
                                 ↓
                            PostgreSQL
```

Request flow (corrected — authorization is real, not middleware-only):

```text
Browser → Next.js → Middleware (session present?) → Server Action / Route Handler
   → getSession() → authorize(user, permission, { departmentId? }) → Zod-validate input
   → Service Layer (business logic + platform engines) → Repository → Prisma → PostgreSQL
   → typed Service Response → React UI
```

File upload flow (unchanged from your spec, confirmed correct):

```text
Browser → Next.js Server Action → generate presigned R2 URL → browser uploads directly to R2
   → Server Action stores file metadata (key, size, type, uploadedBy) via Prisma → PostgreSQL
```

---

## 6. Platform engines (build these once, reuse everywhere)

This is the actual architectural core of the product. Every feature module (Placement, TC, and whatever you add later — Internship, Alumni, Attendance, etc.) is a thin layer of UI and domain rules sitting on top of these ten engines. Get these right and every future module gets cheaper to build.

| Engine | Purpose | Core tables | Consumed by |
|---|---|---|---|
| **Auth & RBAC** | Login, sessions, roles, permissions, department-scoped access | `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `user_department_scopes` | Everything |
| **Custom Fields** | College-specific fields without a schema migration | `custom_field_definitions` (+ `customFields` JSONB on Student/Faculty/etc.) | Students, Faculty, Forms, Rule Engine, Excel Import |
| **Dynamic Forms** | Admin-configurable forms, rendered at runtime | `form_definitions`, `form_fields` | Student form, TC request form, Placement registration form |
| **Dynamic Tables** | Configurable, searchable, filterable, permission-aware data grids | (column config only — no dedicated table) | Every list view |
| **Excel Import** | Upload → map → validate → preview → upsert, for any entity | `import_jobs`, `import_mappings`, `import_history` | Students now; Faculty/Companies/Alumni later, same engine |
| **Rule Engine** | Evaluate field/operator/value conditions with AND/OR grouping | rules stored as JSON on the owning entity | Placement eligibility, Workflow step conditions |
| **Workflow Engine** | Configurable, sequential, multi-step approval chains | `workflows`, `workflow_steps`, `workflow_instances`, `workflow_step_instances` | TC requests now; any future approval process |
| **Notifications** | Event-driven in-app + email notifications | `notifications`, `email_logs` | Placement events, TC events |
| **Audit Log** | Who did what, when, before/after value | `audit_logs` | Every mutating service call |
| **Document/PDF** | Configurable PDF layout + generation + QR verification | `document_templates` | TC generation now; future certificates |

---

## 7. Data model principles

Core entity list (per your §57, unchanged): `users`, `roles`, `permissions`, `departments`, `programs`, `academic_periods`, `batches`, `students`, `faculty`, `companies`, `placement_drives`, `placement_registrations`, `placement_attendance`, `placement_stages`, `placement_results`, `tc_requests`, `tc_clearances`, `workflows`, `workflow_steps`, `notifications`, `email_logs`, `audit_logs`, `import_jobs`, `import_mappings`, `custom_field_definitions`, `form_definitions`, `form_fields`, `document_templates`.

Rules:
- **Relational fields stay relational.** Anything used for filtering, reporting, eligibility, or permissions (department, program, batch, academic period) is a real foreign key column — never buried in JSON.
- **Everything else college-specific goes in `customFields`.** Illustrative shape:

```prisma
model Student {
  id               String   @id @default(cuid())
  registerNumber   String   @unique
  name             String
  email            String?
  phone            String?
  dateOfBirth      DateTime?

  departmentId     String
  department       Department      @relation(fields: [departmentId], references: [id])
  programId        String
  program          Program         @relation(fields: [programId], references: [id])
  batchId          String
  batch            Batch           @relation(fields: [batchId], references: [id])
  academicPeriodId String
  academicPeriod   AcademicPeriod  @relation(fields: [academicPeriodId], references: [id])

  isActive         Boolean  @default(true)
  customFields     Json     @default("{}")   // college-specific fields: Parent Phone, Aadhaar, Hostel, etc.

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([customFields], type: Gin)
  @@index([departmentId, programId, batchId])
}
```

- **Deletion rule:** hard delete only when a zero-reference check passes; otherwise `isActive = false`. Applies to Departments, Programs, Academic Periods, Batches, Roles, Form fields, Workflow steps.
- **Every mutation goes through the service layer**, which is where the audit log, authorization check, and Zod validation all live — never call Prisma from a component, route handler, or server action body directly.

---

## 8. Security principles (consolidated + corrected)

- Better Auth sessions, httpOnly secure cookies, no secrets in client bundles.
- Middleware = session presence only (Correction #6). Real authorization always re-checked server-side per request.
- RBAC + department scope enforced in the service layer, not the UI. UI hides buttons the user can't use; the server rejects the request if they try anyway.
- Zod validation on every server-side input boundary (Route Handlers, Server Actions), independent of client-side validation.
- File uploads: type + size limits validated server-side before issuing a presigned URL, never trust the client's declared MIME type alone.
- Public routes (TC verification) use a separate random token, never a sequential/guessable ID (Correction #7); rate-limited.
- Rate limiting on auth endpoints, the public verify endpoint, and Excel import endpoint at minimum.
- Centralized `AppError` → user-safe-message translation (Correction #10); never let a raw Prisma/stack trace reach the client.
- Audit log every create/update/delete that touches student data, permissions, workflow config, or TC status.
- Secrets only in environment variables, validated at boot with Zod (`env.ts`), never committed.

---

## 9. Folder structure

```text
src/
├── app/
│   ├── (auth)/
│   ├── (admin)/                  # admin dashboard route group
│   ├── (student)/                # student-facing route group
│   ├── api/
│   ├── verify/[token]/           # public TC verification page
│   └── layout.tsx
│
├── components/
│   ├── ui/                       # shadcn primitives
│   ├── forms/
│   ├── tables/                   # dynamic table engine
│   └── shared/
│
├── modules/
│   ├── auth/
│   ├── rbac/
│   ├── departments/
│   ├── programs/
│   ├── academic-structure/
│   ├── batches/
│   ├── custom-fields/
│   ├── dynamic-forms/
│   ├── excel-import/
│   ├── students/
│   ├── faculty/
│   ├── companies/
│   ├── placements/
│   ├── tc/
│   ├── workflow-engine/
│   ├── rule-engine/
│   ├── notifications/
│   ├── audit/
│   ├── reports/
│   └── settings/
│
├── server/
│   ├── services/                 # business logic — one per module above
│   ├── repositories/              # Prisma queries, one per entity
│   ├── authorization/            # can()/authorize(), department-scope helpers
│   ├── database/                 # Prisma client singleton
│   └── storage/                  # R2 abstraction layer
│
├── lib/
├── hooks/
├── types/
└── config/                       # env.ts (Zod-validated)

prisma/
├── schema.prisma
├── seed.ts
└── migrations/

docs/
├── ARCHITECTURE.md               # this file
└── DEPLOYMENT.md                 # written in Phase 10

public/
```

---

## 10. Explicit non-goals for v1

Saying these out loud now avoids scope-creep mid-build:

- Multi-tenant architecture — correctly rejected in your spec, staying rejected.
- Realtime websockets — polling instead (Correction #3); revisit only if a real college asks for it.
- Microservices — modular monolith, per your spec.
- The "future modules" list (Internship, Alumni, Attendance, Library, Hostel, Transport, Grievance, Accreditation, Faculty Workload, Examination) — the platform engines are built to support them, none are built *in* this pass.
- Native mobile apps — responsive web only.
- SSO / social login — email+password only; Better Auth makes adding this later a config change, not a rebuild.
- i18n/translation infrastructure — labels are configurable per §54, but that's terminology remapping, not multi-language UI.

---

## 11. Build roadmap

11 phases, 38 prompts, full detail in **`antigravity-build-prompts.md`**.

| Phase | Focus | Prompts |
|---|---|---|
| 0 | Foundation — scaffold, env, Prisma, tooling | 1–4 |
| 1 | Auth, RBAC, app shell | 5–8 |
| 2 | Configuration engine — departments, programs, academic structure, batches, setup wizard | 9–12 |
| 3 | Custom fields, dynamic forms, dynamic tables | 13–15 |
| 4 | Excel import engine | 16–20 |
| 5 | Student/Faculty/Company data | 21–22 |
| 6 | Placement management | 23–26 |
| 7 | Workflow engine + TC management | 27–29 |
| 8 | Notifications + email | 30–31 |
| 9 | Reports, audit, settings | 32–34 |
| 10 | Security, testing, performance, deployment | 35–38 |
