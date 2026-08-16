# AGENTS.md

## Project
College Operations Platform — a single-college-per-deployment web app (Placement Management + Transfer Certificate Management modules), built to be redeployed independently for each customer college. NOT multi-tenant. No tenant_id column, ever. No shared data between installs.

## Always read first
docs/ARCHITECTURE.md — the authoritative spec. Re-read it at the start of every new task.

## Stack (do not deviate without asking me first)
- Next.js, latest stable, App Router, TypeScript strict mode
- Tailwind CSS + shadcn/ui
- PostgreSQL + Prisma ORM
- Better Auth (email/password), sessions in Postgres via the Prisma adapter
- Zod for ALL validation: API input, forms, env vars
- React Hook Form for forms
- SheetJS (xlsx) for Excel
- Resend + React Email for email; Inngest for background jobs
- Cloudflare R2 (S3-compatible) for file storage
- Vitest for unit/integration tests, Playwright for E2E

## Rules
- Business logic lives in src/server/services/. Never call Prisma from a component, route handler, or server action body directly — go through a service.
- Every mutation re-checks authorization server-side, even if the UI already hides the button that triggers it.
- Anything college-configurable (departments, programs, academic structure, roles, permissions, workflow steps, placement stages, form fields, labels/terminology) is admin-editable data. Never hardcode it.
- College-specific fields go through the custom-field engine (customFields JSONB + custom_field_definitions), never a new migration.
- Next.js Middleware only checks session presence and redirects. Real permission/department-scope checks happen in the service layer, server-side, every request.
- Ask me before adding a new external dependency or service not already listed in Stack above.
- Write a short Vitest test alongside any new service function that contains real logic (not pure CRUD passthroughs).