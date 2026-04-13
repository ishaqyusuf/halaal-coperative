# API Endpoints

## Purpose
This file tracks the public and internal API surface of the platform.

## How To Use
- Add or update entries when routes or actions change.
- Keep descriptions short and behavior-focused.

## Proposed Endpoint Areas
- Auth and session.
- Tenant onboarding.
- Member management.
- Contributions.
- Charges.
- Loan requests and approvals.
- Repayments.
- Statements and reports.
- Dashboard summaries.

## Current Scaffold Endpoints
- `GET /`
  - Purpose: basic API status message.
- `GET /health`
  - Purpose: health response with request-context information.
  - Notes: includes tenant resolution and DB runtime mode.
- `TRPC /trpc/health.summary`
  - Purpose: lightweight API and tenant count health summary.
- `TRPC /trpc/health.tenant`
  - Purpose: return a seed tenant snapshot for setup flows.
- `TRPC /trpc/workspace.summary`
  - Purpose: tenant dashboard summary and tenant policy derived from shared domain modules.
- `TRPC /trpc/onboarding.status`
  - Purpose: return onboarding progress for the active tenant, including domain, owner, policy, and ledger bootstrap state.
- `TRPC /trpc/onboarding.bootstrap`
  - Purpose: create a new tenant workspace with primary domains, tenant-admin owner, default policy, and baseline ledger accounts.
- `TRPC /trpc/notifications.list`
  - Purpose: return sample notification payloads using the shared notification registry.
- `TRPC /trpc/members.list|get|create|update|updateStatus`
  - Purpose: list and manage tenant member records.
- `TRPC /trpc/contributions.list|record|memberHistory|memberSavings`
  - Purpose: list and post contributions plus retrieve member savings history.
- `TRPC /trpc/charges.listDefinitions|createDefinition|updateDefinition`
  - Purpose: manage tenant charge definitions.

## Near-Term Route Targets
- `TRPC /trpc/auth.*`: session and membership actions.
- `TRPC /trpc/members.*`: tenant-scoped member listing and management.
- `TRPC /trpc/loanRequests.*`: submit and review new loan requests.
- `TRPC /trpc/contributions.*`: contribution posting and reporting.

## Starter Endpoint Template
- Method:
- Path:
- Purpose:
- Roles allowed:
- Request summary:
- Response summary:
