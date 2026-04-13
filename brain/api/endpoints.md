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
- `TRPC /trpc/health.summary`
  - Purpose: lightweight API and tenant count health summary.
- `TRPC /trpc/health.tenant`
  - Purpose: return a seed tenant snapshot for setup flows.
- `TRPC /trpc/workspace.summary`
  - Purpose: tenant dashboard summary and sample loan policy.
- `TRPC /trpc/notifications.list`
  - Purpose: return sample notification payloads using the shared notification registry.

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
