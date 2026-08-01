# Cross-provider PostgreSQL refresh options

Research date: 2026-08-01  
Scope: Supabase PostgreSQL to Neon PostgreSQL, recurring environment refreshes, one-time migrations, and MySQL to PostgreSQL. Primary/official sources only.

## Executive recommendation

For the current free/low-cost setup, build one guarded, provider-neutral refresh command around PostgreSQL's native `pg_dump` and `pg_restore` tools. Keep Supabase as the authoritative writer, restore into a fresh or quarantined Neon database/branch, sanitize and verify it, and only then point preview/development at it.

Use the tools this way:

1. **Supabase PostgreSQL -> Neon PostgreSQL, ordinary refresh:** `pg_dump` to a custom-format file, validate the archive, and `pg_restore` into a fresh Neon target. This is the recommended default.
2. **Supabase -> Neon, one-time production cutover with a short maintenance window:** the same dump/restore workflow, with source writes stopped for final catch-up/cutover.
3. **Supabase -> Neon, genuine near-zero-downtime migration:** native PostgreSQL logical replication, operated temporarily and removed after cutover. Neon's documented `pgcopydb` import supports parallel one-time copy but not `pgcopydb clone --follow`.
4. **MySQL -> PostgreSQL:** `pgloader`, followed by application-specific schema review, verification, and a final maintenance-window delta/cutover plan. Do not use pgloader for normal PostgreSQL-to-PostgreSQL refreshes; pgloader's own release notes recommend PostgreSQL backup/restore or logical replication for that case ([pgloader releases](https://github.com/dimitri/pgloader/releases)).
5. **Do not make Airbyte the primary operational-database clone tool.** Airbyte is an ELT/data-replication platform that adds its own orchestration, raw/final-table and deduplication model. It is useful when the product needs many source connectors or an analytics pipeline, but it is unnecessary operational weight for exact PostgreSQL environment refreshes ([Airbyte repository](https://github.com/airbytehq/airbyte), [Airbyte CDC tutorial](https://airbyte.com/tutorials/incremental-change-data-capture-cdc-replication)).

The central rule is **one authoritative writer and one-way movement**. A Neon preview database must not write changes that are expected to merge back into Supabase. PostgreSQL logical replication is not bidirectional environment merging, and a Neon branch cannot have a Supabase database as its native parent.

## Why dump/restore is the best default

`pg_dump` produces a transactionally consistent export while other users continue reading and writing. A custom-format archive is compressed by default and lets `pg_restore` select or reorder objects ([PostgreSQL `pg_dump`](https://www.postgresql.org/docs/current/app-pgdump.html)). Restoring with `--single-transaction` makes a moderate restore all-or-nothing and implies exit-on-error; for a very large database, use a fresh target plus a bounded transaction size instead of one giant transaction ([PostgreSQL `pg_restore`](https://www.postgresql.org/docs/current/app-pgrestore.html)).

This model is a better fit for preview refreshes than row-by-row application sync because it:

- copies one consistent source snapshot;
- includes deletes because the destination is rebuilt instead of incrementally upserted;
- has a durable archive that can be inspected with `pg_restore --list` and retried;
- avoids replication slots and retained WAL;
- does not require an always-running worker;
- is portable across ordinary PostgreSQL providers;
- is easy to make disposable and auditable.

Neon officially recommends `pg_dump`/`pg_restore` for PostgreSQL and Supabase imports, advises using an unpooled URL, and warns that piping dump output directly to restore is less resilient for lengthy transfers. A separate archive file is therefore preferable ([Neon migration guides](https://neon.com/docs/import/migrate-intro), [Neon-to-Neon migration guide](https://neon.com/docs/import/migrate-from-neon)).

### Connection rules

- **Supabase source:** prefer its direct connection for migrations, `pg_dump`, management tools, and replication. The free direct endpoint is IPv6. If the runner is IPv4-only and no IPv4 add-on is available, use the shared Supavisor **session-mode** endpoint on port 5432, not transaction mode on port 6543 ([Supabase connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres)).
- **Neon target:** use the unpooled/direct URL for dump, restore, schema inspection, and replication administration. Keep pooled URLs for application traffic ([Neon migration guide](https://neon.com/docs/import/migrate-from-neon)).
- Store source and target URLs in protected environment files or a secrets manager. Do not put credentials directly in shell history or logs.
- Give migration credentials only the required privileges and rotate/revoke temporary credentials after a sensitive refresh.

### Reference refresh flow

The production command should generate a run ID and put its archive and logs in a restricted temporary directory. The following illustrates the mechanics; the wrapper should resolve the URLs from protected environment configuration:

```bash
pg_dump \
  --dbname="$PGSOURCE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --no-subscriptions \
  --file="$REFRESH_ARCHIVE"

pg_restore --list "$REFRESH_ARCHIVE"

pg_restore \
  --dbname="$PGTARGET_URL" \
  --no-owner \
  --no-privileges \
  --single-transaction \
  --exit-on-error \
  "$REFRESH_ARCHIVE"
```

Restore into an empty, newly created, or otherwise quarantined target. Do not make `--clean` against a shared database the default. An atomic environment switch—new database/branch, validate, then rotate the preview connection—is safer and more recoverable than mutating the currently used preview database in place.

Explicitly allowlist application schemas, normally `public` plus any project-owned schemas. Supabase's `auth` and `storage` schemas have provider-owned roles and service assumptions; copying their database tables alone does not recreate Supabase Auth, Storage objects, Edge Functions, or provider configuration. Supabase documents that `auth` and `storage` objects use dedicated service owners, and its recovery documentation treats database data, Storage files, and platform configuration as separate artifacts ([Supabase permissions](https://supabase.com/docs/guides/platform/permissions), [Supabase project recovery](https://supabase.com/docs/guides/troubleshooting/restore-project-after-90-days-pause)).

Before the first automated run, inventory and compare:

- PostgreSQL major versions and client-tool compatibility;
- installed extensions and their versions on both providers;
- schemas, collations, custom types, generated columns, views, functions, triggers, and RLS policies;
- object owners and custom roles;
- tables without primary keys;
- large objects and external Storage buckets;
- the target's storage and egress quotas.

Use `--no-owner --no-privileges` because managed providers have different administrative roles. Recreate only application roles and grants through reviewed migrations. Never attempt to clone provider superuser/service roles.

## Repeatable Supabase-to-Neon architecture

### Recommended low-cost topology

```text
Supabase production (authoritative writer)
        |
        | scheduled or operator-triggered consistent dump
        v
restricted archive / quarantined restore
        |
        | sanitize + validate + disable side effects
        v
Neon mirror baseline
        |
        +-- ephemeral preview branch
        +-- ephemeral development/QA branch
```

The mirror baseline is a completed, verified point-in-time snapshot, not a second writable production system. After each successful refresh, recreate or reset disposable Neon children from that Neon baseline. Existing Neon branches do not automatically acquire newer Supabase rows.

For small databases, rebuild the mirror on demand or nightly/weekly. This is more reliable and cheaper than keeping CDC alive continuously. Keep only the last known-good sanitized baseline and short-lived preview children. Neon currently includes branching on its Free plan, but the free allowance is constrained by per-project compute, storage, egress, and a fixed five-minute scale-to-zero policy; check current pricing before automating high-frequency full copies ([Neon pricing](https://neon.com/pricing), [Neon scale to zero](https://neon.com/docs/introduction/scale-to-zero)). Supabase Free currently has no branching, no Pipelines, no automatic backups or PITR, a 500 MB database allowance, and can pause after a week of low activity ([Supabase pricing](https://supabase.com/pricing), [Supabase pausing](https://supabase.com/docs/guides/platform/free-project-pausing)).

A scheduled copy must wake/check both endpoints, detect a paused source clearly, apply connection and statement timeouts, and fail without changing the currently active preview if any step is incomplete.

### Refresh contract

Each run should record, without passwords:

- run ID, source and target fingerprints, PostgreSQL versions, and selected schemas;
- source snapshot time and archive checksum;
- schema/migration hash and installed-extension comparison;
- archive validation result and restore result;
- sanitization policy version;
- row-count and invariant results;
- operator/automation identity and promotion time;
- retained last-known-good target for rollback.

Never reuse an incremental cursor merely because two environments have the same labels. Bind all state to canonical source/target fingerprints and the schema hash.

## When logical replication is justified

Use logical replication only when the source must remain writable during a real migration and the measured dump/cutover downtime is unacceptable. PostgreSQL takes an initial snapshot and then sends changes continuously, preserving transaction order within one subscription ([PostgreSQL logical replication](https://www.postgresql.org/docs/current/logical-replication.html)). Supabase documents publishing to an external PostgreSQL database and requires a direct connection, a publication, a replication slot, and a replication-capable role ([Supabase external PostgreSQL replication](https://supabase.com/docs/guides/database/postgres/setup-replication-external)).

It is not a complete database clone:

- DDL/schema changes are not replicated and must be deployed separately, normally subscriber first for additive changes.
- sequence state is not replicated and must be synchronized before cutover;
- large objects, views, and materialized views are not replicated;
- update/delete handling requires a suitable primary key or replica identity;
- target-side writes can create conflicts and split-brain behavior;
- a stalled slot retains WAL and must be monitored and cleaned up.

These are PostgreSQL's documented restrictions ([PostgreSQL logical-replication restrictions](https://www.postgresql.org/docs/current/logical-replication-restrictions.html)). Supabase also notes that WAL-retention settings are not user-configurable and that logical replication can consume additional disk/resources ([Supabase replication overview](https://supabase.com/docs/guides/database/replication)).

Supabase's priced **Pipelines** product is different from manually operated native logical replication. Pipelines is not included on the Free plan and currently targets supported analytics destinations; do not assume buying or enabling Pipelines is required for the official PostgreSQL publication/subscription method ([Supabase pricing](https://supabase.com/pricing), [Supabase replication overview](https://supabase.com/docs/guides/database/replication)). Validate publication/slot permissions on the actual Free project before committing to the design.

There is also a decisive free-tier network constraint for the documented Supabase-to-Neon subscription setup: Neon says its Supabase procedure needs a source endpoint reachable over IPv4, while Supabase's direct Free endpoint is IPv6 and poolers cannot be used for logical replication. Supabase's dedicated IPv4 endpoint is a paid add-on. Unless an officially supported IPv6 path is available for the chosen Neon region, continuous native replication is therefore not a strictly free solution ([Neon Supabase-to-Neon replication](https://neon.com/docs/guides/logical-replication-supabase-to-neon), [Supabase IPv4 guide](https://supabase.com/docs/guides/platform/ipv4-address), [Supabase manual replication FAQ](https://supabase.com/docs/guides/database/replication/manual-replication-faq)).

Neon's scale-to-zero warning applies when Neon is the **publisher** with an active subscriber: the publisher compute remains active. Neon also removes inactive slots after approximately 40 hours in relevant multi-slot scenarios and drops subscriptions when branching/resetting to avoid duplicating them ([Neon logical replication notes](https://neon.com/docs/guides/logical-replication-neon)). These constraints reinforce using replication as a temporary migration mechanism, not as the normal preview refresh path.

## Where pgcopydb fits

`pgcopydb clone` is a credible PostgreSQL-to-PostgreSQL alternative when the database is large enough that parallel table copying and index creation materially reduce the migration window. It exports one PostgreSQL snapshot and shares it across workers ([pgcopydb clone documentation](https://pgcopydb.readthedocs.io/en/latest/ref/pgcopydb_clone.html)). Neon documents `pgcopydb` for parallel import but explicitly does not support `pgcopydb clone --follow`; use it here only for one-time copies ([Neon pgcopydb guide](https://neon.com/docs/import/pgcopydb)).

Choose it when:

- a measured dump/restore is too slow;
- parallel copy is useful;
- the operator can monitor WAL, LSN progress, temporary work files, slots, and cleanup;
- the goal is a faster one-time base copy, not continuous follow mode on Neon.

Do not choose it merely to run a daily preview refresh. Its snapshot holder, work directory, parallelism, and crash/resume rules are more operationally demanding than a durable custom-format archive. A lost snapshot can prevent a fully consistent resume unless the snapshot-holder workflow remains alive; the tool documents this caveat itself ([pgcopydb resumability](https://pgcopydb.readthedocs.io/en/latest/resume.html)).

## MySQL-to-PostgreSQL: use pgloader as a conversion project

`pgloader` is the appropriate first-choice open-source tool for a **one-time MySQL-to-PostgreSQL conversion**. It discovers MySQL schema objects, builds PostgreSQL tables/indexes/constraints, loads through PostgreSQL `COPY`, supports filtering and cast rules, and can transform MySQL-specific values such as zero dates. Neon lists pgloader in its official MySQL migration guidance ([Neon migration guides](https://neon.com/docs/import/migrate-intro), [pgloader MySQL documentation](https://pgloader.readthedocs.io/en/latest/ref/mysql.html), [pgloader repository](https://github.com/dimitri/pgloader)).

Treat it as a repeatable migration build, not a general database synchronizer:

1. Generate a schema/type inventory and identify unsigned integers, `tinyint(1)`, enum/set, zero dates, timezone assumptions, collations, JSON, binary data, generated columns, views, triggers, procedures, and case-sensitive identifiers.
2. Write a version-controlled `.load` specification with explicit casting and table filters.
3. Restore into an empty PostgreSQL target and keep the run's rejected-row/error artifacts.
4. Port application queries and database-side routines explicitly; a successful row load does not prove SQL-dialect or behavior compatibility.
5. Run repeated rehearsal migrations until row counts and business invariants match.
6. For final cutover, stop MySQL writes, run the final verified load or use a separately designed CDC/delta mechanism, synchronize identities/sequences, validate, and only then switch the application.

If ongoing MySQL-to-PostgreSQL CDC is required, that is a distinct Debezium/Airbyte-style data-integration project, not pgloader's normal one-shot conversion path. It demands delete/update semantics, schema-evolution handling, ordering/idempotency, monitoring, and recovery design.

## Why Airbyte is not the default here

Airbyte OSS/self-managed can connect database sources and destinations and can use PostgreSQL CDC. Its CDC path requires a publication/slot and primary keys for supported incremental behavior, while its destination model may create raw, normalized, or deduplicated representations rather than a byte-for-byte operational clone ([Airbyte repository](https://github.com/airbytehq/airbyte), [Airbyte PostgreSQL CDC tutorial](https://airbyte.com/tutorials/incremental-change-data-capture-cdc-replication), [Airbyte incremental sync tutorial](https://airbyte.com/tutorials/incremental-data-synchronization)).

That makes it suitable for analytics, integration, and many heterogeneous sources, but a poor first dependency for this limited-budget operational refresh. It adds a long-running control plane, connector upgrades, secrets, state, and destination semantics that must themselves be backed up and monitored. Reconsider it only when several non-PostgreSQL sources must feed a reporting/integration store and the team is prepared to operate the platform.

## Financial, tenant, and PII controls

Halaalvest preview data contains member identity, KYC documents, contact details, tenant boundaries, savings, contributions, financing, repayment, charges, shares, profit allocations, and audit evidence. A technically correct copy can still be an unsafe environment.

Before any restored database is exposed to preview users:

- keep it quarantined from the application while raw production data is present;
- replace names, emails, phone numbers, government identifiers, addresses, document URLs, account references, webhook secrets, and external provider identifiers with deterministic non-reversible test values;
- remove or replace uploaded KYC/storage objects separately—the database dump does not copy object bytes from Supabase Storage;
- preserve primary/foreign keys and tenant IDs so relationship and tenant-isolation tests remain meaningful;
- disable or QA-route email, SMS, webhooks, payment/disbursement calls, cron jobs, notification outbox workers, and background finance jobs;
- use preview-specific encryption/signing keys and revoke source credentials after the run;
- restrict archive permissions, encrypt it at rest, set a short retention period, and delete it after the approved retention window;
- never log connection strings or unmasked row values.

Prefer schema-only plus deterministic synthetic finance fixtures for ordinary development. Use a masked production snapshot only for a named QA need that synthetic data cannot satisfy.

### Required verification gates

At minimum, compare source and target for the selected scope:

- table list, columns, types, defaults, nullability, primary/unique/foreign keys, indexes, functions, triggers, RLS policies, and extensions;
- exact or expected row counts per table, plus a stable checksum for critical immutable tables;
- orphan checks for every financial/member relationship;
- every money-related row has a valid tenant and no cross-tenant relation;
- balanced ledger transactions and unchanged aggregate debits/credits;
- member savings, share capital, financing principal/outstanding, repayment, procurement, Foodstuff Purchase, charges, and profit allocations reconcile independently;
- append-only/audit history is present and source posted records were not silently rewritten;
- maximum identity/sequence values are safe before any preview writes;
- all delivery/integration kill switches are active;
- application smoke tests run against a least-privileged preview role.

Promotion should fail closed if any gate fails. Keep the currently working preview target unchanged and retain the last known-good sanitized target long enough for rollback.

## Implementation order

1. Repair the existing PostgreSQL schema inspector separately; do not block the new clone path on row-level sync.
2. Add `DATABASE_SYNC_URL`/administrative URLs per environment, preferring direct/unpooled endpoints and keeping normal `DATABASE_URL` behavior unchanged.
3. Implement `db:clone` or `db:refresh` as a PostgreSQL-only dump/archive/restore workflow with fresh-target promotion, timeouts, checksums, structured logs, and typed remote-target confirmation.
4. Add an explicit application-schema allowlist and provider-schema exclusion policy.
5. Add a versioned sanitization step and Halaalvest invariant verifier.
6. Run one Supabase-free-to-Neon rehearsal, measure archive size/time/egress, and document rollback.
7. Only if measured downtime is unacceptable, run a separate proof of concept for native logical replication after resolving its direct-connection/IPv4 cost constraint. Use ordinary `pgcopydb clone` only to shorten a large base copy.
8. Keep the existing MySQL feature isolated; add a separate `mysql-to-postgres` pgloader workflow instead of changing MySQL-to-MySQL routing.

## Decision summary

The reliable, low-cost solution is **not one universal row synchronizer**. It is a small migration facade that chooses a proven engine by source/target pair:

| Source -> target | Default engine | Intended use |
|---|---|---|
| PostgreSQL -> PostgreSQL | `pg_dump` + `pg_restore` | Repeatable full refresh and ordinary one-time migration |
| Large PostgreSQL -> PostgreSQL | `pgcopydb clone` | Faster parallel one-time copy where supported |
| Live PostgreSQL -> PostgreSQL | Native logical replication | Temporary near-zero-downtime migration, subject to provider network/plan limits |
| MySQL -> PostgreSQL | `pgloader` | Rehearsed one-time dialect/schema/data conversion |
| Many heterogeneous sources -> analytics/integration store | Airbyte OSS | Data pipeline, not exact operational clone |

For the current Supabase production plus Neon preview arrangement, start with a scheduled/on-demand **full sanitized snapshot refresh into a fresh Neon target**. It is the simplest design that is consistent, recoverable, provider-neutral, and affordable on free tiers.
