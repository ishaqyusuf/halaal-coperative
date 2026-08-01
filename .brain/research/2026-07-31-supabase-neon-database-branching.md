# Supabase and Neon Database Branching

Research date: 2026-07-31  
Scope: official Supabase, Neon, and PostgreSQL sources only.

## Executive recommendation

Use each provider's native branching inside that provider, but do not treat Supabase and Neon branches as equivalent or as a cross-provider synchronization mechanism.

- For Supabase, use one persistent, data-less staging/QA branch plus ephemeral PR branches. Keep schema migrations, configuration, Edge Functions, and deterministic synthetic seed data in Git. Updating from `main` updates deployable schema/function state; it does not refresh production rows.
- For Neon, use a protected production parent and ephemeral PR branches. A long-lived staging branch can be reset from production when raw production data is permitted. For Halaalvest's financial and identity data, prefer schema-only branches with synthetic seed data, or an anonymized base branch after its masking rules and beta limitations have been accepted.
- If production is in Supabase and preview is in Neon, or vice versa, neither platform can make the other provider's database its native parent. Use migrations plus safe seed data for normal development. Use an audited `pg_dump`/`pg_restore` workflow only for an explicitly authorized one-off cross-provider clone.

## Direct answer: can a child update from `main`?

| Provider | Can it update from main? | What happens to data? | Is it a merge/rebase? |
|---|---|---|---|
| Supabase, Git-backed | Yes. Bring `main` into the Git feature branch, resolve migration conflicts, and push; the integration runs on each push and applies pending migrations. | Production rows are never copied. Existing branch test data remains unless the branch is deleted/recreated. | Schema advancement through ordered migrations, not a row-data merge. |
| Supabase, dashboard branch | Yes. **Update branch** pulls newer public-schema and Edge Function changes from production. | No production-row refresh. Existing Edge Functions are replaced; branch-only new functions remain. | A platform schema/function update; migration conflicts are manual. |
| Neon, normal child | Yes. **Reset from parent** makes it match the parent's current schema and data. | All child-local schema and row changes are discarded; connections are interrupted temporarily. | Equivalent to `git reset --hard`, not a merge or rebase. |
| Neon, anonymized child | Not currently via normal reset. Neon documents anonymized branches as beta and says they cannot reset to parent yet. | Refresh by recreating/re-anonymizing according to the supported workflow. | No merge/rebase. |

The key distinction is that Supabase propagates migration-managed structure without production data, while a normal Neon reset replaces the whole child database state with the parent's schema and data.

## Supabase behavior

Supabase branches are separate Supabase environments with their own database, API credentials, Auth settings, Storage buckets, and Edge Functions. Preview branches are ephemeral and tied to PR lifecycle; persistent branches are intended for staging, QA, or development. New branches are deliberately data-less, and sample data is loaded from seed files rather than copied from production ([Supabase branching overview](https://supabase.com/docs/guides/deployment/branching), [working with branches](https://supabase.com/docs/guides/deployment/branching/working-with-branches)).

For Git-backed branching, Supabase watches repository commits and branches. Migrations under `supabase/migrations` run automatically, and the deployment workflow runs for every pushed commit. A preview branch records applied migrations and only runs new ones. Therefore, updating a feature branch from Git `main` and pushing is the correct way to carry newer migrations forward; previously applied migrations should not be rewritten ([GitHub integration](https://supabase.com/docs/guides/deployment/branching/github-integration), [migration behavior](https://supabase.com/docs/guides/deployment/branching/working-with-branches)).

For dashboard-managed branching, the **Update branch** action can pull newer public-schema and Edge Function changes from production. Supabase documents important limitations: existing branch functions are replaced, preview branches can merge only to `main` and not to each other, deleted functions need manual handling on `main`, and migration conflicts must be resolved manually. Dashboard branching is still marked public alpha, so it should not be the sole source of truth for a critical workflow ([dashboard branching](https://supabase.com/docs/guides/deployment/branching/dashboard)).

Supabase does not provide ongoing production-row synchronization into branches. Seeds run at branch creation; rerunning them requires deleting and recreating the preview branch. That recreation reruns all migrations and seed files and loses branch-local data. Supabase explicitly says not to use production data in development branches because of security exposure and side effects such as emailing real users ([working with branches](https://supabase.com/docs/guides/deployment/branching/working-with-branches), [Supabase for Platforms](https://supabase.com/docs/guides/integrations/supabase-for-platforms)).

## Neon behavior

A normal Neon child starts from the parent's exact schema and data at the selected point in time. It is isolated after creation and uses copy-on-write storage, so subsequent child changes do not affect the parent. Every branch has its own compute and connection string ([Neon workflow primer](https://neon.com/docs/get-started-with-neon/workflow-primer), [Neon practical guide](https://neon.com/blog/practical-guide-to-database-branching)).

An existing child can be refreshed with `neon branches reset <branch> --parent`. Reset discards the child's local schema and data changes and replaces them with the latest parent state, much like `git reset --hard`. It is not a three-way merge, and active connections are temporarily interrupted ([Neon getting started](https://neon.com/docs/get-started/signing-up), [Neon branch reset announcement](https://neon.com/blog/announcing-branch-reset)). For that reason, preserve desired fixtures outside the branch and reapply them after reset, or create a fresh branch for each PR.

Production should be marked protected. Protected branches cannot be reset or deleted, and children created from a protected parent receive new passwords for matching Postgres roles. Resetting or restoring such a child preserves its child-role passwords ([Neon protected branches](https://neon.com/docs/guides/protected-branches)).

Neon offers three relevant branch shapes:

1. **Schema and data:** highest production fidelity; also copies every sensitive row.
2. **Schema-only:** no production rows; seed it with synthetic fixtures. Neon explicitly positions this for sensitive-data environments ([Neon schema-only branch release](https://neon.com/docs/changelog/2025-01-31)).
3. **Anonymized:** copies schema and data, then applies explicit masking rules. Neon states that it does not detect PII automatically. The current workflow is beta; official guidance says anonymized branches cannot reset from parent yet and warns about masking columns involved in uniqueness, primary-key, or non-null constraints ([Neon PII workflow](https://neon.com/blog/branching-environments-anonymized-pii), [Neon practical guide](https://neon.com/blog/practical-guide-to-database-branching)).

## Recommended Halaalvest topology

Halaalvest contains identity, financial, ledger, and tenant-scoped records. Treat production rows as sensitive even when a field is not conventionally labelled PII.

### Supabase project

- Protect production operationally and make migrations in Git the source of truth.
- Maintain one persistent `staging`/`qa` branch with synthetic, deterministic, tenant-safe fixtures.
- Create an ephemeral branch per PR and delete it when the PR closes.
- Update a long-lived branch by merging/rebasing Git `main`, resolving migration order/conflicts, and pushing. Use dashboard **Update branch** only with awareness of its alpha status and function replacement behavior.
- When the branch must be clean, delete/recreate it; do not build a row-sync process from production.

### Neon project

- Make `production` the protected root branch.
- For everyday development and PRs, create schema-only or masked-base descendants and seed only the scenarios required by tests.
- If a fully faithful production clone is legally and operationally acceptable, create PR branches from production and delete them after testing.
- For a long-lived, non-anonymized staging child, schedule a reset from parent at a controlled cadence. Treat it as destructive: drain jobs/connections, reset, reapply safe non-production configuration/fixtures, validate, and resume.
- If using an anonymized staging base, recreate and re-mask it to refresh from production until Neon supports parent reset for anonymized branches. Derive PR branches from that safe base.

### Environment controls for both providers

- Use branch-specific credentials and secrets; never reuse production delivery keys.
- Disable or QA-route email, SMS, webhooks, payment/disbursement integrations, scheduled jobs, and outbox workers before any representative data is available.
- Verify masking coverage, tenant isolation, ledger invariants, foreign keys, record counts, and sequence values before exposing a branch to testers.
- Treat branch-local test data as disposable. Durable state belongs in migrations, seed builders, and documented test fixtures.

## Cross-provider limitation and fallback

Native branch parentage is provider-local: a Supabase branch belongs to its Supabase project, and a Neon branch belongs to its Neon project. Therefore, a Supabase production database cannot be the native parent of a Neon branch, and a Neon production database cannot be the native parent of a Supabase branch. This conclusion follows from both providers' documented project/branch models.

For cross-provider parity:

- Prefer the same schema migrations and a controlled seed/masking pipeline for repeatable preview environments.
- For an authorized exact one-time transfer, use PostgreSQL's standard dump/restore path. `pg_dump` creates a transactionally consistent export while the source remains in use, and archive formats can be restored with `pg_restore` ([PostgreSQL `pg_dump`](https://www.postgresql.org/docs/current/app-pgdump.html), [PostgreSQL `pg_restore`](https://www.postgresql.org/docs/current/app-pgrestore.html)).
- Do not interpret native branching as continuous replication. If production-row updates must flow continuously across providers, that is a separate CDC/replication architecture with different correctness, security, and operational requirements.

## Decision summary

The best default is provider-native branching, with a different refresh policy per provider:

- **Supabase:** migrations/config/functions from Git `main`; synthetic seed data; recreate for a clean reset.
- **Neon:** destructive reset from parent for full schema+data refresh, or recreate schema-only/anonymized branches when production rows must not be exposed.
- **Between Supabase and Neon:** migrations and safe fixtures by default; audited dump/restore only when an exact, explicitly authorized copy is genuinely required.
