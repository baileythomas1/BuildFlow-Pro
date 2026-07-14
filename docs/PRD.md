**BuildFlow Pro**

Product Requirements Document

Version 1.0 \| Portfolio Project \| Prepared for Internal Product &
Engineering Teams

*This document describes a fictional but realistic SaaS platform,
written as a product-management portfolio artifact.*

1\. Executive Summary

BuildFlow Pro is a project-management and client-communication platform
built for small and mid-sized residential construction companies
(roughly 3–50 employees, \$1M–\$25M annual revenue). It replaces the
spreadsheet-and-group-text workflow most contractors run on today with a
single system covering projects, scheduling, documents, estimating,
invoicing, and homeowner communication.

The core insight driving the product: existing platforms (Buildertrend,
Procore) are built for commercial GCs or are priced and configured for
teams far larger than a typical residential builder. BuildFlow Pro
targets the underserved middle — companies too big for spreadsheets, too
small to justify Procore's complexity and price.

Phase 1 (MVP) intentionally excludes several features present in the
long-term vision (real-time chat, Gantt scheduling, payroll, AI search)
in favor of shipping a narrow, complete workflow — project setup through
client-visible progress and invoicing — that a real construction office
could run on day one.

2\. Vision

Become the default operating system for small and mid-sized residential
construction companies by removing the coordination overhead between
office, field, and homeowner — starting with the highest-friction
workflow (project + client communication) and expanding outward.

Three-year vision: BuildFlow Pro is the system a builder sets up on day
one of forming their company, growing with them from their first project
through a fully staffed operation, without ever needing to migrate to a
heavier commercial-grade tool.

3\. Business Goals

- Reduce time office staff spend on status updates and client questions
  by giving homeowners self-serve visibility into their project.

- Replace 3–5 disconnected tools (spreadsheets, group texts, email, a
  generic invoicing app) with one system of record.

- Establish a recurring per-company subscription model with a clear
  per-seat upgrade path as the customer's team grows.

- Build a homeowner-facing surface (the client portal) as a
  differentiated wedge competitors underinvest in.

4\. Success Metrics

| **Metric**                   | **Phase 1 Target**                            | **Why it matters**                                                                                 |
|------------------------------|-----------------------------------------------|----------------------------------------------------------------------------------------------------|
| 30-day company retention     | ≥ 65%                                         | Validates the core workflow is sticky enough to survive the first full project cycle.              |
| Weekly active office users   | ≥ 55%                                         | Office staff (PMs/admins) are the primary buyer and daily user; low WAU signals workflow mismatch. |
| Homeowner portal adoption    | ≥ 40% of invited clients log in at least once | Tests whether the differentiated feature is actually used, not just demoed.                        |
| Median time-to-first-invoice | \< 10 minutes from project creation           | Proxy for onboarding friction in the estimating/invoicing flow.                                    |
| p95 page load                | \< 2.5s                                       | Realistic target for a data-heavy dashboard on Vercel + Postgres, not an aspirational \<2s.        |

5\. Target Users & Personas

5.1 Company Owner — "Dave"

Runs a 12-person residential remodeling company. Technically comfortable
but time-poor; cares about profitability per job and wants a 30-second
answer to "how are we doing" without asking his office manager.
Frustrated that his current tools (a shared spreadsheet + QuickBooks)
don't talk to each other.

5.2 Project Manager / Office Administrator — "Renee"

The primary daily user. Juggles 6–10 active projects, fields homeowner
calls asking for updates, chases subcontractors for schedules, and
manually re-types the same status into texts, emails, and a spreadsheet.
Her success metric is fewer interruptions, not more features.

5.3 Site Employee / Crew Lead — "Marcus"

Mobile-first, low tolerance for data entry. Needs to see today's task
list, mark things done, and upload a jobsite photo — from a phone, often
with poor signal. Will not use anything that takes more than two taps
per action.

5.4 Homeowner — "the Client"

Wants to know if their project is on schedule and on budget without
calling the office. Logs in rarely (once every few days) and needs zero
training — this persona defines the UX bar for the entire client portal.

6\. Competitive Analysis

| **Competitor** | **Strength**                        | **Gap BuildFlow Pro exploits**                                              |
|----------------|-------------------------------------|-----------------------------------------------------------------------------|
| Buildertrend   | Broad feature set, market leader    | Dated UI, steep learning curve, homeowner portal feels bolted-on            |
| Procore        | Best-in-class for commercial GC     | Overbuilt and overpriced for residential-scale teams                        |
| Jobber         | Great for trades/service businesses | Not built around multi-week construction projects with milestones           |
| Monday.com     | Flexible, well-designed PM tool     | Generic — no construction-specific objects (estimates, RFIs, client portal) |
| Houzz Pro      | Strong homeowner-facing brand       | Weaker on internal ops (scheduling, employee management)                    |

Positioning: "Buildertrend's client experience, at half the setup
complexity, priced for a 10-person company instead of a 100-person one."

7\. Brand Guidelines

Tone: professional, modern, trustworthy — avoids both the "generic SaaS
blue" look and construction-industry clichés (hard-hat iconography,
safety-orange overload).

- Primary (Navy): \#16324F — headers, primary text, nav

- Accent (Orange): \#F28C28 — primary CTAs, active states

- Secondary (Sky Blue): \#38BDF8 — links, informational badges

- Success (Green): \#22C55E — status indicators, on-budget/on-schedule
  states

- Background (Off-white): \#F8FAFC — app background

- Body text (Slate): \#1E293B

- Typography: Inter for UI text, Manrope for headings

8\. Information Architecture

Public: Marketing site, Pricing, Login/Signup.

Authenticated (by role):

- Owner / Admin: Dashboard, Projects, Calendar, Clients, Estimates,
  Invoices, Employees, Reports, Settings

- PM / Office Staff: Dashboard, Projects, Calendar, Files, Estimates,
  Invoices

- Site Employee: My Tasks, Project (read-mostly), Photo Upload

- Homeowner (Client Portal): Project Overview, Timeline, Documents,
  Invoices/Payments, Messages

9\. Functional Requirements (Phase 1)

9.1 Authentication & Access Control

- Email/password auth with company-scoped multi-tenancy (a user belongs
  to exactly one Company in Phase 1).

- Roles: Owner, Admin, PM, Employee, Client (homeowner). Permissions
  enforced server-side, not just hidden in the UI.

- Acceptance criteria: a Client-role user can never query another
  company's data, verified by row-level scoping tests on every endpoint,
  not just the endpoints the UI happens to call.

9.2 Projects

- CRUD for projects: name, address, client, budget,
  start/target-completion date, status (Planning / In Progress / On Hold
  / Complete).

- Each project has a computed "health" (On Track / At Risk / Delayed)
  derived from open overdue tasks vs. days remaining — not a manually
  set field, so it can't go stale.

- Acceptance criteria: deleting a project soft-deletes (archives) rather
  than hard-deletes, since financial records (invoices) must remain
  queryable for accounting.

9.3 Task Management (Kanban)

- Tasks belong to a project, have a status column (To Do / In Progress /
  Done), assignee, due date, and optional attachment.

- Drag-and-drop reordering within and across columns, persisted
  immediately (optimistic UI update, rollback on server error).

- Gantt-style scheduling is explicitly deferred to Phase 2 — Kanban
  alone covers the "what's next" use case Renee and Marcus actually need
  daily.

9.4 File Management

- Upload contracts, permits, and jobsite photos to a project; store in
  Supabase Storage with signed URLs, not public buckets.

- File list shows type, uploader, and date; homeowners see a read-only,
  filtered subset (no internal-only documents like subcontractor
  contracts).

9.5 Estimating & Invoicing

- Estimate builder: line items with quantity, unit cost, markup;
  generates a client-facing PDF.

- Client approval workflow: homeowner approves/rejects an estimate from
  the portal; approval converts it to a locked baseline budget.

- Invoicing: milestone-based or ad hoc invoices, Stripe-hosted checkout
  for payment, webhook-driven status sync (pending/paid/overdue).

- Acceptance criteria: an approved estimate is immutable — any change
  requires a new change-order record, preserving an audit trail for
  disputes.

9.6 Homeowner (Client) Portal

- Read-only project overview: status, upcoming milestones, budget
  summary (spent vs. approved, not raw internal costs).

- Document access (client-visible files only), invoice history, and
  one-way status-comment thread with the office (full real-time
  messaging deferred to Phase 2).

9.7 Employee Management (Phase 1 scope)

- Basic roster: name, role, hourly rate, assigned projects.
  Clock-in/out, PTO, and productivity reporting are deferred to Phase 2
  — Phase 1 only needs "who is assigned to what," not a full
  HR/timekeeping system.

9.8 Notifications

- Email notifications for: task assigned, invoice sent, invoice paid,
  estimate approved/rejected. In-app notification bell for the same
  events. Digest/preference controls deferred to Phase 2.

9.9 Dashboard

- Owner/Admin view: active project count by health status, overdue task
  count, outstanding invoice total, upcoming milestones (next 14 days).

- Deliberately excludes a weather widget and a full analytics suite in
  Phase 1 — those are nice-to-haves that don't affect whether the core
  workflow is usable.

10\. Explicitly Out of Scope for Phase 1

Naming what's deferred, and why, is part of the spec — it prevents scope
creep during build:

- Real-time chat / messaging (Phase 2) — Phase 1's one-way status
  comment thread covers the actual homeowner need without websocket
  infrastructure.

- Gantt timeline view (Phase 2) — Kanban is sufficient until
  multi-project resource scheduling becomes a real pain point.

- Full employee time-tracking, PTO, payroll (Phase 2/3) — this is its
  own subsystem and shouldn't block shipping the core project workflow.

- AI document search, mobile native app, equipment tracking, forecasting
  (Phase 3) — vision-stage features, not MVP requirements.

11\. Data Model (Phase 1 Entities)

| **Entity**   | **Key Fields**                                                                                   | **Relationships**                                                       |
|--------------|--------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------|
| Company      | id, name, plan, created_at                                                                       | has many Users, Projects                                                |
| User         | id, company_id, email, role, name                                                                | belongs to Company; has many assigned Tasks                             |
| Client       | id, company_id, name, email, user_id (nullable link to portal login)                             | belongs to Company; has one Project (Phase 1: 1 client per project)     |
| Project      | id, company_id, client_id, name, address, budget, status, start_date, target_date                | belongs to Company & Client; has many Tasks, Files, Estimates, Invoices |
| Task         | id, project_id, assignee_id, title, status, due_date                                             | belongs to Project; belongs to User (assignee)                          |
| File         | id, project_id, uploader_id, storage_path, visibility (internal/client), type                    | belongs to Project                                                      |
| Estimate     | id, project_id, status (draft/sent/approved/rejected), total, approved_at                        | belongs to Project; has many EstimateLineItems                          |
| Invoice      | id, project_id, estimate_id (nullable), amount, status (pending/paid/overdue), stripe_payment_id | belongs to Project                                                      |
| Notification | id, user_id, type, read_at, payload                                                              | belongs to User                                                         |
| AuditLog     | id, company_id, actor_id, action, entity_type, entity_id, created_at                             | belongs to Company                                                      |

12\. API Overview

REST API, JWT-based auth, every route validates company_id scope
server-side before touching the database — this is the single most
important security invariant in the system given multi-tenancy.

- POST /api/auth/login, POST /api/auth/signup

- GET/POST /api/projects, GET/PATCH/DELETE /api/projects/:id

- GET/POST /api/projects/:id/tasks, PATCH /api/tasks/:id

- POST /api/projects/:id/files, GET /api/files/:id (returns signed URL)

- POST /api/projects/:id/estimates, POST /api/estimates/:id/approve

- POST /api/projects/:id/invoices, POST /api/webhooks/stripe

- GET /api/notifications, PATCH /api/notifications/:id/read

13\. Technical Architecture

- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS

- Backend: Next.js API routes (or a thin Node/Express layer if the API
  grows past what route handlers comfortably manage)

- Database: PostgreSQL via Prisma ORM

- File storage: Supabase Storage (signed URLs, private buckets)

- Payments: Stripe (Checkout + webhooks)

- Transactional email: Resend

- Deployment: Vercel

Note: this stack is reasonable and unremarkable for a portfolio project
— the differentiator should be the product decisions above, not the
stack choice.

14\. Security

- HTTPS everywhere, bcrypt/argon2 password hashing, JWT with short
  expiry + refresh rotation

- Row-level company scoping enforced in the data-access layer, not just
  in UI queries

- Audit log on all financial and permission-changing actions (invoice
  creation, estimate approval, role changes)

- Rate limiting on auth endpoints; MFA-ready (not required for Phase 1
  launch)

15\. Accessibility & Performance

- WCAG 2.2 AA: keyboard navigation, screen-reader labels on all
  interactive elements, minimum 4.5:1 contrast

- Performance target: p95 \< 2.5s page load, Lighthouse score \> 85
  (realistic for a data-table-heavy dashboard, not the \>90 the original
  draft claimed without qualification)

16\. Roadmap

| **Phase**     | **Scope**                                                                                                                                   | **Goal**                                                                 |
|---------------|---------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------|
| Phase 1 (MVP) | Auth/RBAC, Projects, Kanban tasks, Files, Estimates & Invoicing (Stripe), basic Employee roster, Homeowner portal, Notifications, Dashboard | A real construction office can run one full project lifecycle end-to-end |
| Phase 2       | Real-time messaging, Gantt scheduling, full employee time-tracking & PTO, notification preferences/digests, analytics suite                 | Deepen retention for companies past their first project                  |
| Phase 3       | AI document search, native mobile app, payroll integration, equipment tracking, subcontractor forecasting                                   | Expand into adjacent workflows once core retention is proven             |

17\. Risks

| **Risk**                                                     | **Mitigation**                                                                           |
|--------------------------------------------------------------|------------------------------------------------------------------------------------------|
| Scope creep back toward the original 30-module vision        | Phase boundaries in Section 10 are treated as hard cuts, not soft suggestions            |
| Stripe/webhook reliability for invoice status                | Reconcile invoice status via a scheduled job in addition to webhooks, not webhooks alone |
| Homeowner portal adoption is low if the UX isn't dead simple | Usability-test the portal with a non-technical person before considering Phase 1 done    |
| File storage costs scale with jobsite photo volume           | Image compression on upload; monitor storage cost per active project monthly             |

18\. Phase 1 Acceptance Criteria

- A Company Owner can sign up, create a project, invite a homeowner, and
  the homeowner can log in and see live status without any manual data
  sync.

- A PM can build an estimate, send it, and have the homeowner approve it
  from the portal, converting it into a locked budget baseline.

- An invoice can be created, paid via Stripe, and its status reflects
  correctly in both the office view and the homeowner portal within
  seconds of payment.

- Every cross-tenant data-access attempt is denied server-side, verified
  by tests, not just manual QA.

- Core flows (project creation → task management → estimate → invoice →
  payment) are responsive and usable on both desktop and mobile
  viewports.

19\. Appendix

19.1 Glossary

- RFI: Request for Information — a formal question from field to office,
  deferred to Phase 2 as a distinct object (Phase 1 uses task comments).

- Change Order: a modification to an approved estimate, recorded as a
  new immutable version rather than an edit.

19.2 Naming Conventions

- Database tables: snake_case, plural (projects, tasks). API routes:
  kebab-case. React components: PascalCase.
