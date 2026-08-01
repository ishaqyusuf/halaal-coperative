# Managed PostgreSQL provider comparison for Halaalvest

Research date: 2026-08-01  
Scope: current official product documentation and pricing for Neon, Supabase, and credible no-cost managed PostgreSQL alternatives. Plan limits change frequently; verify the linked pricing pages before committing production traffic.

## Executive recommendation

Use **Neon Free for development, QA, and preview databases**. Its native copy-on-write branching, destructive reset-from-parent workflow, pooled and direct connection strings, short point-in-time restore window, and Prisma support fit Halaalvest's current environment problem better than Supabase Free.

Do **not** move Halaalvest production from Supabase to Neon merely to obtain free branches. Keep the current hybrid arrangement while the product is pre-launch or low-volume:

- Supabase remains the authoritative production database if it is already working there.
- Neon holds disposable preview/development snapshots built from migrations plus synthetic data, or from an explicitly authorized and sanitized refresh.
- Git/Prisma migrations remain the schema source of truth.
- Production writes never flow back from Neon previews to Supabase.

A full Supabase-to-Neon production migration is reasonable later only if all Supabase-specific dependencies have been inventoried and replaced. The application-owned Prisma/PostgreSQL schemas are portable. Supabase Auth, Storage objects, Realtime, Edge Functions, secrets, and provider configuration are not recreated by copying PostgreSQL tables.

For a financial/KYC multi-tenant application, **neither provider's Free plan should be treated as the final production posture**. Supabase Free lacks managed backups/PITR and may pause; Neon Free has only a short restore window and lacks paid production safeguards such as protected branches, IP allowlisting, an SLA, and support. If real member money, KYC documents, or regulated personal data becomes production-critical, budget for a paid production database plus independent encrypted backups and restore drills.

## Current free-plan comparison

| Area | Neon Free | Supabase Free | Halaalvest implication |
|---|---|---|---|
| Managed PostgreSQL | Standard PostgreSQL with serverless compute/storage separation | Dedicated PostgreSQL instance plus a bundled backend platform | Both work with ordinary PostgreSQL tooling and Prisma. |
| Projects/databases | Current pricing lists 100 projects, each with 100 CU-hours/month and 0.5 GB storage | Two active Free projects; 500 MB database per project | Neon gives far more environment slots; both database-size allowances are small for KYC/finance history. |
| Branching | Included; current pricing table lists 10 branches/project | Not included on Free; paid preview branches are billed by usage | Neon is the clear preview/PR choice. |
| Branch data | Normal branches copy parent schema and data; schema-only branches are available | Supabase branches are data-less and receive schema/migrations plus seeds | Neon can create realistic snapshots, but raw production KYC must not be exposed to previews. |
| Refresh/reset | Child can reset to parent, fully overwriting child-local schema/data and interrupting connections briefly | Git/dashboard update advances schema/functions; it does not refresh production rows | Neon reset is an exact destructive refresh; Supabase update is schema deployment, not data sync. |
| Compute lifecycle | Fixed scale-to-zero after five minutes on Free; wake-up is automatic | Free project may pause after a week of low activity and needs project resume | Both can interrupt idle workflows; Neon is better suited to frequent disposable environments. |
| Restore/backups | Six-hour instant restore/time travel, limited by the plan's change window; pricing also lists limited snapshot capability | Automatic backups and PITR are not included on Free | Maintain encrypted off-provider logical backups regardless of provider. |
| Pooling | Built-in PgBouncer pooled URL plus direct URL; pooled connections support high application concurrency | Shared Supavisor session/transaction poolers on Free plus an IPv6 direct endpoint | Use pooled URLs for runtime and direct URLs for Prisma migrations/dump/restore. |
| Auth | Neon Auth based on Better Auth; current Free allowance is 60,000 MAU and auth data can branch with the database | Mature Supabase Auth; 50,000 MAU, social OAuth, custom SMTP, basic MFA, and Auth hooks on Free | Migrating identity is a separate product migration, not a table-copy toggle. |
| HTTP data API | PostgREST-based Data API with RLS/JWT integration | PostgREST-based Data API with RLS plus client SDKs | Halaalvest already has an API/backend boundary, so provider Data APIs are optional. |
| File/object storage | Neon documents integrations with external S3, R2, Azure Blob, and similar services | 1 GB bundled Storage, access control, and basic CDN | KYC file migration requires copying object bytes and changing URLs/credentials; database dump alone is insufficient. |
| Realtime | No Supabase-equivalent bundled Realtime allowance is listed in current Neon pricing | 2 million messages/month and 200 peak Realtime connections | If used, replace Supabase Realtime before a full migration. |
| Serverless functions | No Supabase-equivalent bundled application function runtime is listed in current Neon database plans | 500,000 Edge Function invocations | Move functions to the existing Halaalvest API/jobs or another runtime before leaving Supabase. |
| Production protection | Protected branches are paid; IP Allow is Scale; Free has community support and no SLA | Free has no uptime SLA, no platform audit logs, no downloadable managed backups/PITR, and limited log retention | Neither free control plane is sufficient for mature financial production. |

Sources: [Neon pricing](https://neon.com/pricing), [Neon scale to zero](https://neon.com/docs/introduction/scale-to-zero), [Neon branch reset](https://neon.com/blog/announcing-branch-reset), [Neon protected branches](https://neon.com/docs/guides/protected-branches), [Neon Auth](https://neon.com/docs/changelog/2025-12-12), [Neon file-storage integrations](https://neon.com/docs/changelog/2025-05-23), [Supabase pricing](https://supabase.com/pricing), [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase), [Supabase pausing](https://supabase.com/docs/guides/platform/free-project-pausing), and [Supabase branching](https://supabase.com/docs/guides/deployment/branching).

## Neon: best fit for free preview databases

### What the Free plan provides

Neon's current pricing lists:

- 100 projects;
- 10 branches per project;
- 100 CU-hours per project each month;
- 0.5 GB storage per project;
- compute up to 2 CU / 8 GB RAM;
- 5 GB public network transfer;
- autoscaling, branching, read replicas, and connection pooling;
- six-hour instant restore/time travel, subject to the documented change limit;
- Neon Auth up to 60,000 MAU;
- one day of metrics/log visibility and community support.

These are generous development allowances, but separate projects do not combine their storage into one larger production database. A 0.5 GB project limit is likely to become restrictive when member records, ledger history, audit evidence, import batches, notification history, and KYC metadata grow. See the live [Neon pricing page](https://neon.com/pricing).

Free compute automatically scales to zero after five minutes and this setting cannot be disabled on Free. The first request wakes the database automatically. That is appropriate for preview and low-traffic development, but it creates cold-start behavior and is not the same as an always-ready production instance ([Neon scale to zero](https://neon.com/docs/introduction/scale-to-zero)).

### Branching behavior

A normal Neon child is a copy-on-write clone containing the parent's roles, schema, and data at creation. Resetting a child from its parent completely overwrites the child's database changes, discards local test records, and briefly interrupts connections. It is analogous to `git reset --hard`, not a row merge or schema rebase ([Neon branch reset](https://neon.com/blog/announcing-branch-reset)).

This is useful for Halaalvest only when the parent is safe to clone. Recommended branch shapes are:

1. **Everyday PR/preview:** schema-only branch plus deterministic synthetic cooperative data.
2. **Realistic QA:** a sanitized baseline with deterministic masking, from which disposable children are created.
3. **Raw production clone:** exceptional, tightly restricted, short-lived, and never attached to delivery integrations before masking and verification.

Neon branch protection is not included on Free. On paid plans, protected branches cannot be deleted or reset; their computes/projects gain additional deletion safeguards, and children receive fresh passwords for matching roles. IP Allow is a Scale feature ([Neon protected branches](https://neon.com/docs/guides/protected-branches)). This missing Free-plan guardrail matters for an authoritative financial database, even though it is less important for disposable previews.

### Recovery posture

The Free plan's six-hour point-in-time history is valuable for recent mistakes but is not a durable backup policy. A mistake discovered the next day, a malicious deletion, credential compromise, account lockout, or provider incident can fall outside that window. Neon introduced limited Free snapshot capability, but automatic schedules and deeper retention are paid-plan concerns ([Neon Backup & Restore snapshot announcement](https://neon.com/docs/changelog/2025-10-31), [Neon pricing](https://neon.com/pricing)).

Keep periodic custom-format `pg_dump` archives encrypted outside the Neon account, verify them with `pg_restore --list`, restore them into an isolated database on a schedule, and retain only the minimum period required by policy.

### Platform-service gap

Neon now offers branchable Neon Auth and a PostgREST-based Data API. Auth user/session/configuration data lives in the `neon_auth` schema and branches with the database ([Neon Auth](https://neon.com/docs/changelog/2025-12-12)). Neon documents external services for file storage rather than a bundled Supabase Storage equivalent ([Neon file-storage integrations](https://neon.com/docs/changelog/2025-05-23)). Current Neon database pricing also does not list bundled equivalents to Supabase Realtime and Edge Functions.

For Halaalvest this gap may be acceptable because the repository already has application-owned API, auth, notifications, and background-job boundaries. A repository scan on 2026-08-01 found no `@supabase/*` or `@neondatabase/*` imports in application/package source. That suggests the database layer is deliberately provider-neutral, but runtime environment configuration and external dashboards must still be inventoried before a migration decision.

## Supabase: best bundled Free backend, weak free production recovery

### What the Free plan provides

Supabase Free currently includes:

- two active projects;
- a 500 MB PostgreSQL database with shared CPU and 500 MB RAM per project;
- 5 GB ordinary and 5 GB cached egress;
- 1 GB file Storage with access controls and a basic CDN;
- 50,000 Auth MAU, social OAuth, custom SMTP, basic MFA, and Auth hooks;
- 2 million Realtime messages and 200 concurrent peak connections;
- 500,000 Edge Function invocations;
- shared Supavisor connection pooling;
- one day of API/database logs and community support.

Free does not include database branching, automatic backups, PITR, Pipelines, an SLA, platform audit logs, a metrics endpoint, or network-security add-ons. Free projects can be paused after a week of low activity ([Supabase pricing](https://supabase.com/pricing), [Supabase project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)).

This makes Supabase Free an excellent feature-complete prototype backend, but a poor final recovery posture for authoritative financial/KYC data. Manual `pg_dump` backups and restore drills are mandatory if production remains on Free.

### Branching does not solve this Free-plan problem

Supabase branching is not included on Free. On paid plans, branches are isolated Supabase environments but deliberately start without production data. Git migrations and seed data populate them. Updating an existing branch advances schema and functions; it does not continuously copy production rows ([Supabase branching](https://supabase.com/docs/guides/deployment/branching)).

That is a safe design for KYC, but it does not provide the full data-reset behavior the current cross-provider refresh request needs. Paying for Supabase branches would mainly buy an integrated Supabase preview stack, not automatic live production-data mirroring.

### Connection modes

Supabase's direct endpoint is the correct path for migrations, `pg_dump`, management tools, and replication, but Free direct connections are IPv6. The shared Supavisor session endpoint is the documented IPv4 fallback for persistent clients; transaction mode is for short-lived/serverless runtime queries and does not preserve session behavior. Dedicated PgBouncer and dedicated IPv4 are paid options ([Supabase connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres)).

Use a pooled runtime URL and separate direct/administrative URL. Do not run the current schema-inspection or dump workflow through a transaction pooler.

## Prisma compatibility

Both Supabase and Neon are ordinary PostgreSQL targets supported by Prisma's PostgreSQL connector. The important distinction is not ORM compatibility but connection purpose:

- application/runtime queries use the provider's pooled URL;
- Prisma Migrate, `db push`, introspection, `pg_dump`, and `pg_restore` use a direct/unpooled URL;
- create one Prisma client per process/runtime rather than per request;
- verify extensions and provider-owned roles before moving archives.

Neon explicitly recommends a direct connection for ORM migrations and `pg_dump`, because session settings may not persist through PgBouncer ([Neon pooling](https://neon.com/docs/connect/connection-pooling)). Prisma documents Neon as supported through its PostgreSQL connector and optional Neon serverless adapter ([Prisma's Neon comparison](https://www.prisma.io/docs/guides/switch-to-prisma-postgres/from-neon), [Prisma PostgreSQL connector](https://www.prisma.io/docs/orm/v6/overview/databases/postgresql)). Supabase documents the same direct-versus-pooler separation ([Supabase connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres)).

Halaalvest's current `DATABASE_URL`/administrative URL split should therefore remain provider-neutral. Do not embed provider SDK assumptions into the Prisma schema or database command router.

## Full Supabase-to-Neon migration assessment

### Database-only migration

Migrating application-owned PostgreSQL schemas is straightforward in principle:

1. inventory PostgreSQL versions, extensions, roles, schemas, triggers, functions, RLS, large objects, and sequence state;
2. create a consistent custom-format archive with `pg_dump` using a direct source URL;
3. restore to a fresh Neon project/branch using an unpooled target URL plus `--no-owner --no-acl`;
4. run schema, count, relationship, tenant-isolation, ledger-balance, sequence, and application verification;
5. stop source writes, perform the final controlled cutover, and retain rollback access.

Neon officially recommends dump/restore for Supabase/PostgreSQL migration and `pgloader` only for MySQL conversion ([Neon migration guides](https://neon.com/docs/import/migrate-intro)). The detailed cross-provider process is documented in [Cross-provider PostgreSQL refresh options](./2026-08-01-cross-provider-postgres-refresh-options.md).

### Full platform migration

A PostgreSQL archive does not recreate the Supabase platform:

- `auth` and `storage` schemas have Supabase service-owned roles and assumptions;
- Auth provider settings, JWT/session behavior, email templates, OAuth credentials, and secrets need a new implementation/migration;
- Storage metadata does not contain the actual bucket object bytes;
- Edge Functions, Realtime settings, webhooks, and dashboard configuration are separate deployment artifacts;
- Supabase role ownership/ACL statements may not be valid on Neon.

Supabase documents its `auth` and `storage` service ownership model and treats database backup, Storage objects, and project configuration as distinct recovery artifacts ([Supabase permissions](https://supabase.com/docs/guides/platform/permissions), [Supabase project recovery](https://supabase.com/docs/guides/troubleshooting/restore-project-after-90-days-pause)).

### Decision

Do not perform a full production migration now solely to save Supabase branching fees. The migration adds identity, file, integration, and recovery risk without solving the more important requirement: safe, repeatable preview data.

Reconsider consolidation onto Neon when all of the following are true:

- production remains under the PostgreSQL size/compute envelope or a paid Neon budget is approved;
- Halaalvest does not rely on Supabase Auth/Storage/Realtime/Functions, or replacements have passed migration rehearsals;
- an independent backup/restore policy is working;
- production branch protection and network controls are acceptable;
- an exact rollback and cutover runbook has been rehearsed;
- Halaalvest finance, tenant, audit, KYC, notification, and sequence invariants pass against the migrated copy.

If these are satisfied, the current repository's provider-neutral Prisma architecture makes a **database-only** move to Neon plausible and may simplify future environment management. Until then, Supabase production plus Neon previews is the lower-risk design.

## Credible no-cost alternatives

### Aiven for PostgreSQL Free

Aiven is the closest conventional managed-PostgreSQL alternative in this comparison. Its Free tier is indefinite and includes one dedicated single-node VM, 1 CPU, 1 GB RAM, 1 GB storage, metrics/logs, and backups. Limitations include one service per organization, no region/cloud choice, no VPC/static IP, no integrations, no forking, no connection pooling, a 20-connection limit, no support, no SLA, and possible power-off after inactivity ([Aiven Free PostgreSQL](https://aiven.io/docs/products/postgresql/concepts/pg-free-tier), [Aiven connection limits](https://aiven.io/docs/products/postgresql/reference/pg-connection-limits)).

Use it for a small conventional development database or backup rehearsal target. It is not better than Neon for previews because it has no branches/pooling, and it is not a mature Halaalvest production answer because it is single-node, unsupported, and outside an SLA.

### Prisma Postgres Free

Prisma Postgres Free currently includes 100,000 operations, 500 MB storage, up to 50 databases, managed connection pooling, query insights, and no credit card. It has first-class Prisma integration and no database cold starts. It does not provide Neon-style database branching, and Prisma's FAQ says the Free plan is for evaluation rather than production. Managed backup snapshots begin on paid Starter/Pro/Business plans; Free users can create manual `pg_dump` archives ([Prisma pricing](https://www.prisma.io/pricing), [Prisma FAQ](https://www.prisma.io/docs/postgres/faq), [Prisma backups](https://www.prisma.io/docs/postgres/database/backups), [Prisma-Neon comparison](https://www.prisma.io/docs/guides/switch-to-prisma-postgres/from-neon)).

It is credible for isolated test databases and can reduce Prisma connection configuration, but the 100,000-operation account allowance and absence of branching make it less attractive than Neon for this repository's preview workflow.

### Render Free PostgreSQL

Render's Free PostgreSQL is a time-limited evaluation database: 1 GB storage, one database per workspace, no backups, no managed connection pooling, and expiration after 30 days followed by a 14-day paid-upgrade grace period. Render explicitly says Free services should not be used for production ([Render Free](https://render.com/docs/free), [Render backups](https://render.com/docs/postgresql-backups)).

It is suitable only for disposable demonstrations and is not a credible Halaalvest environment baseline.

### Self-hosting

PostgreSQL and Supabase's software can be self-hosted without a software subscription, but compute, storage, network, patching, monitoring, backups, failover, incident response, and operator time are not free. For a financial/KYC service, a single unmanaged free VM is a worse risk trade than using a managed development tier and budgeting for production reliability.

## Halaalvest-specific operating controls

Regardless of provider:

- Treat production as one authoritative writer; never attempt bidirectional Supabase/Neon merging.
- Keep posted money events append-oriented and verify balanced ledger transactions after every copy.
- Verify every money, KYC, member, loan, contribution, share, charge, repayment, procurement, and audit row remains tenant-scoped.
- Never expose raw production KYC/contact/document data in general preview branches.
- Prefer schema-only branches with deterministic synthetic tenants, members, contributions, savings, charges, financing, repayments, and audit events.
- For an authorized realistic QA copy, quarantine it, mask direct and indirect identifiers, remove document object URLs, then validate before attaching an application.
- Disable or QA-route email, SMS, webhooks, payment/disbursement integrations, cron jobs, outbox delivery, and background financial posting.
- Use separate runtime and administrative credentials; rotate temporary migration credentials.
- Keep encrypted off-provider logical backups and prove restores on a schedule.
- Record source/target fingerprints, schema hash, archive checksum, masking policy, validation results, operator, and promotion time for every refresh.

## Final provider choice

| Need | Recommended choice |
|---|---|
| Free PR/preview databases | Neon Free |
| Free bundled Auth + Storage + Realtime + Functions prototype | Supabase Free |
| Conventional small PostgreSQL sandbox without serverless branching | Aiven Free |
| Prisma-native disposable evaluation database | Prisma Postgres Free |
| Temporary 30-day demo | Render Free |
| Mature financial/KYC production | No Free plan; choose a paid, backed-up, monitored service after workload and compliance review |

The best current architecture is therefore **hybrid, not a rushed migration**: keep Supabase production stable, use Neon for safe disposable environments, standardize on PostgreSQL-native backup/restore plus Prisma migrations, and plan a later database consolidation only after provider-specific services and production recovery requirements have been removed from the migration risk.
