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
- `trpc.notifications.list`
  - array of shared notification payloads built from `@amanah/notifications` types.

## Starter Contract Template
- Endpoint:
- Request fields:
- Response fields:
- Validation rules:
- Error cases:
