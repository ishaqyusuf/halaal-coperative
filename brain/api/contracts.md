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

## Starter Contract Template
- Endpoint:
- Request fields:
- Response fields:
- Validation rules:
- Error cases:
