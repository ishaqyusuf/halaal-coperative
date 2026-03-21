# API Permissions

## Purpose
This file documents who can do what across the platform.

## How To Use
- Update when roles or protected actions change.
- Keep permissions aligned with real enforcement in code.

## Initial Roles
- Platform owner.
- Tenant admin.
- Finance officer.
- Member.

## Sensitive Actions
- Create or update charge definitions.
- Approve or reject loan requests.
- Mark repayments received.
- Publish dividend results.
- Export statements and reports.
- Configure cooperative rules.
- Resolve offline sync conflicts.

## Rules
- Members can view only their own financial records.
- Tenant admins and finance officers operate only within their tenant.
- Office staff may capture transactions subject to tenant-defined permissions.
- Highly sensitive actions should be audit logged.
