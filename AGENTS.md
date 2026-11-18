# Agent Instructions

## Brain Protocol

`.brain/` is the project memory and source of truth for architecture, product state, tasks, and implementation context. Treat Brain documentation as part of the definition of done for every meaningful change.

Before starting work:

- Read the relevant Brain files for the task. Start with `.brain/BRAIN.md`, `.brain/SYSTEM_OVERVIEW.md`, `.brain/system/overview.md`, `.brain/system/architecture.md`, `.brain/engineering/ai-rules.md`, `.brain/engineering/coding-standards.md`, and `.brain/tasks/in-progress.md`.
- For feature work, also read the matching file in `.brain/features/` and any related ADR in `.brain/decisions/`.
- For API, auth, permission, database, or migration work, read the matching files under `.brain/api/` and `.brain/database/`.
- If the repository root defines both `db:migrate` and `db:push` scripts and Prisma schema/database files are changed, run both commands after the Prisma update. Do not manually create migration files.

After code changes:

- Run a Brain documentation impact check before finishing.
- Update `.brain/database/schema.md`, `.brain/database/relationships.md`, or `.brain/database/migrations.md` for database changes.
- For Prisma database updates, if root scripts `db:migrate` and `db:push` exist, run `bun db:migrate` and `bun db:push` after changing the schema. Do not manually create migration files.
- Update `.brain/api/endpoints.md`, `.brain/api/contracts.md`, or `.brain/api/permissions.md` for API, contract, auth, or permission changes.
- Update or create `.brain/features/<feature>.md` for feature behavior changes.
- Add an ADR under `.brain/decisions/` for durable architecture, product, integration, or implementation decisions.
- Update `.brain/tasks/backlog.md`, `.brain/tasks/in-progress.md`, `.brain/tasks/done.md`, or `.brain/tasks/roadmap.md` when task state changes.
- If no Brain update is needed, state that explicitly in the final response with the reason.

Final responses must include the Brain files updated, or `No Brain documentation updates required` with a short rationale.

## Vercel runtime and cost

- Prerender eligible public pages. For added request-time rendering, proxy work, API calls, polling or jobs, record the trigger, expected frequency and reason. Verify changed public routes in the production build output.
- Mount app-owned HTTP endpoints in Next.js route handlers and reuse existing typed contracts. For server rendering in the same deployment, call the authorized service directly to avoid an HTTP self-fetch. Record callers and runtime requirements before introducing another API deployment.
- Match proxy work to the hosts and paths that need it. Exclude unrelated requests and assets where compatible with tenant routing. Measure additional network calls and set explicit timeouts.
- Keep sessions, roles, workspace data, payments, private files and previews private. For a shared public cache, document its data classification, keys, TTL and invalidation. Verify tenant isolation, unpublication and domain reassignment where applicable.
- Bound page size, polling, retries, concurrency and payloads. Skip retries for unrecoverable authorization and validation failures. When limiting expensive public routes, preserve valid mobile, webhook, health and job traffic.
- Reuse the existing runner for deferred work. Document schedule ownership, auth, timeouts, retry bounds and idempotency for added or changed jobs. Keep liveness checks cheap and dependency readiness separate.
- Scope and protect previews. Verify dependency-aware build skipping when changing the monorepo graph, review new large dependencies and image variants, and preserve known rollback deployments when tuning retention.
- Record the affected project, routes, deployment environment and verification in the PR or release notes for runtime changes. Use comparable windows and traffic mixes for invocations, Active CPU per 1,000 requests, latency and errors where available. Use normalized route identifiers and omit secrets and customer payloads.
- Before routing traffic to a new destination or retiring an endpoint, inventory web and mobile clients (including older installs), provider callbacks, jobs and monitors. Verify equivalent behavior in isolated Preview and record a rollback path under the existing release and authorization rules.

## Multi-session orchestration (token budget)

When one main thread starts several sessions or subagents for related work (for example the numbered mobile-redesign threads):

- **The orchestrator reads once and hands over a kit.** It distils the shared context (rules, owner decisions, design tokens, component APIs, tool commands and templates, device and git rules) into one short kit file under `.brain/plans/` and points every brief at it. An example is `.brain/plans/mobile-redesign-thread-kit.md`. Each brief adds only that task's specifics: routes, files, data calls and scope.
- **Sub-sessions don't re-read general material.** They read the kit plus their own task's code. They don't re-read the Brain, skill references or other threads' artifacts unless the kit points to them. When something seems missing, they ask the orchestrator instead of researching.
- **No nested delegation for the same work.** A session that already runs the model and effort a skill requires (for example the Workshop author rule) does the work itself instead of starting another agent that re-reads everything.
- **Keep the kit current.** When the owner makes a decision that affects every thread, the orchestrator updates the kit once and tells the running sessions. Sessions don't each rediscover it.
