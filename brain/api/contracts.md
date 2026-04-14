# API Contracts

## Purpose
This file captures payload shapes, response conventions, and contract assumptions.

## How To Use
- Update when request/response schemas or validation rules change.
- Prefer examples and concise field lists.

## Contract Principles
- Include tenant context implicitly from auth, not from untrusted client input alone.
- Return authoritative balances from backend services only.
- Use explicit workflow statuses for requests, approvals, and repayments.
- Keep money fields consistent across endpoints.

## Current Scaffold Contracts
- `GET /health`
  - `api`: `"ok"`.
  - `auth`: `"session-present"` or `"anonymous"`.
  - `tenantId`: active tenant identifier derived from request headers.
  - `tenantSlug`: resolved tenant slug when available.
  - `resolution`: one of `subdomain`, `hostname`, `fallback`, or `none`.
  - `database`: current DB runtime mode, currently `seed-only` or `database-configured`.
  - `timestamp`: ISO timestamp for the request context.
- `trpc.health.summary`
  - `api`: `"ok"`.
  - `tenantCount`: number of seed tenants currently available.
  - `timestamp`: ISO timestamp.
- `trpc.health.tenant`
  - `tenant`: seed tenant record selected by `tenantId` or fallback default.
- `trpc.workspace.summary`
  - `tenantId`: active tenant identifier.
  - `tenantName`: display name of the active tenant.
  - `dashboard`: dashboard summary object from `packages/domain`.
  - `loanPolicy`: loan policy object from `packages/domain`.
  - `resolvedBy`: tenant-resolution mode used for the request.
- `trpc.onboarding.status`
  - `status`: `"complete"` or `"incomplete"`.
  - `completedStepCount`: completed onboarding steps.
  - `totalStepCount`: total tracked onboarding steps.
  - `completionRatio`: numeric progress ratio.
  - `primarySiteHostname`: primary public hostname when configured.
  - `primaryDashboardHostname`: primary dashboard hostname when configured.
  - `steps`: labeled step list with completion state.
- `trpc.onboarding.bootstrap`
  - Request creates tenant name, slug, primary admin identity, default policy values, and base routing hostnames.
  - Response returns the created tenant record, owner user id, primary hostnames, and refreshed onboarding state.
- `POST /api/signup`
  - Request validates `cooperativeName`, `primaryContactFullName`, and `primaryContactEmail`.
  - Response returns `expiresAt`, `onboardingUrl`, delivery metadata, and the verification email draft.
- `POST /api/onboarding`
  - Request validates `cooperativeName`, `primaryContactFullName`, `primaryContactEmail`, `currentSize`, `officeAddress`, `startDate`, and the signed `token`.
  - The route derives the slug from `cooperativeName` and applies server-side tenant policy defaults instead of asking for public policy fields.
  - `currentSize`, `officeAddress`, and `startDate` are persisted on the tenant record during workspace bootstrap.
- `trpc.notifications.list`
  - array of shared notification payloads built from `@halaal-vest/notifications` types.
- `trpc.members.list`
  - paginated tenant member result with `items`, `total`, `page`, and `pageSize`.
- `trpc.contributions.list`
  - paginated contribution result with joined member display fields.
- `trpc.charges.listDefinitions`
  - array of tenant charge definitions with amount, kind, active state, and applicability flags.

## Starter Contract Template
- Endpoint:
- Request fields:
- Response fields:
- Validation rules:
- Error cases:
