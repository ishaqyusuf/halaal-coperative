# Tech Stack

## Purpose
This file tracks chosen and proposed technologies for the platform.

## How To Use
- Mark decisions as proposed or adopted.
- Update whenever a stack decision becomes durable.

## Current Status
- No application stack has been implemented yet.

## Proposed Stack
- Frontend: Next.js web app for admin/member portals.
- Backend: Node.js service layer, potentially in the same monorepo.
- Database: PostgreSQL for strong transactional support.
- ORM: Prisma or equivalent typed relational ORM.
- Auth: tenant-aware authentication with role-based authorization.
- Hosting: cloud deployment suitable for SaaS tenants and secure database access.

## Selection Criteria
- Strong support for relational data and transactions.
- Good developer velocity for a SaaS MVP.
- Clear migration tooling.
- Easy observability and audit logging.

## To Decide
- Exact monorepo tooling.
- Queue/job tooling.
- File storage strategy for exports and statements.
- Email/SMS provider.
