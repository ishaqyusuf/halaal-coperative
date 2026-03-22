# Tech Stack

## Purpose
This file tracks chosen and proposed technologies for the platform.

## How To Use
- Mark decisions as proposed or adopted.
- Update whenever a stack decision becomes durable.

## Current Status
- Monorepo scaffolded with Bun workspaces and Turborepo.
- Frontend apps use TanStack Start (TanStack Router + Vite + Nitro).
- Backend API uses Hono + tRPC.
- Database layer uses Prisma ORM with PostgreSQL.

## Adopted Stack
- Frontend: TanStack Start (type-safe, full-stack React framework) for admin/member portals.
- Router: TanStack Router (file-based, type-safe routing).
- State Management: TanStack Query (React Query) with tRPC integration.
- Build Tool: Vite.
- Server: Nitro (via TanStack Start).
- Backend: Hono + tRPC API server.
- Database: PostgreSQL for strong transactional support.
- ORM: Prisma typed relational ORM.
- Auth: tenant-aware authentication with role-based authorization (better-auth).
- Hosting: cloud deployment suitable for SaaS tenants and secure database access.

## Selection Criteria
- Strong support for relational data and transactions.
- Good developer velocity for a SaaS MVP.
- Clear migration tooling.
- Easy observability and audit logging.
- Full-stack type safety from database to client.

## To Decide
- Queue/job tooling.
- File storage strategy for exports and statements.
- Email/SMS provider.
