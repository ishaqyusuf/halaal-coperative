# Decide Persisted Tenant Migration Mode

Type: research
Status: open
Blocked by: 01, 02

## Question

How should the selected tenant migration setup mode be stored, audited, loaded, and changed?

Resolve the field/table choice, allowed values, update action/API boundaries, role requirements, audit logging, and whether the mode can change after any setup or member migration work has started.

The selected mode must be persisted in the database as durable tenant/cooperative configuration and loaded anywhere the product needs to branch behavior, especially member creation and member brought-forward/backfill flows.

## Comments

- User clarification: tenant migration setup mode must be stored in the database and used across the entire operation of the cooperative. Future member creation must read whether the cooperative started as `Brought forward` or `Historical backfill`, and that decision should guide how the cooperative interacts with the website.
