# BuildFlow Pro — Engineering Conventions

Full spec lives in `docs/PRD.md`. Reference sections by number in prompts instead of restating them.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- PostgreSQL via Prisma ORM
- Supabase Storage (files)
- Stripe (payments)
- Resend (transactional email)
- Deployed on Vercel

## Scope discipline
- Only implement what's explicitly requested in the current prompt.
- Never implement anything listed in PRD Section 10 ("Explicitly Out of Scope for Phase 1") unless directly instructed.
- If a request seems to require something out of Phase 1 scope, stop and flag it instead of building it anyway.

## Conventions
- DB tables: snake_case, plural (e.g. `projects`, `tasks`)
- API routes: kebab-case, REST-style under `/app/api`
- React components: PascalCase, one component per file
- Every API route must scope queries by `company_id` server-side — never trust a client-supplied `company_id`
- Soft-delete (`archived_at`) for Projects and financial records; never hard-delete
- An approved Estimate is immutable — changes create a new Change Order record, not an edit

## Brand
Navy `#16324F`, Orange `#F28C28`, Sky Blue `#38BDF8`, Green `#22C55E`, Slate `#1E293B`, off-white `#F8FAFC`. Fonts: Inter (UI), Manrope (headings).
