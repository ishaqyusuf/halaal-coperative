# Release Assurance Runbook

## Local Review

Run `bun run release:status --env preview --json` before requesting a Preview
release and repeat with `production` before a Production release. Review every
action and prerequisite. Local output includes working-tree changes but is
advisory; missing baselines intentionally report every target.

Never hand-author `.release/runtime/*.json`, copy Production evidence into
Preview, or treat command success as release approval.

## Protected Gate

The `Release Assurance` workflow binds Preview to the exact pull-request head
and Production to the current `main` tip. It verifies the vendored toolkit
inventory, loads a fresh signed provider bundle from the selected protected
environment, and runs `bun run release:check`.

GitHub concurrency allows one running and one pending run per environment. A
newer pending run may replace an older pending run, so every later effect must
recheck its exact revision.

## Activation Checklist

Keep the gate red until all items are complete:

- provision a current isolated Neon Preview target and
  `HALAALVEST_DATABASE_URL` for the Dashboard/API Preview deployment;
- confirm the Dashboard and Marketing Preview aliases and environment-specific
  configuration do not reuse Production credentials;
- implement the authenticated collector that normalizes database, Vercel,
  Expo, Trigger.dev, fingerprint, receipt, and current live-state evidence;
- inject separate Preview and Production HMAC keys and fresh signed envelopes
  through protected GitHub environments;
- configure required reviewers, branch/ruleset checks, and the Vercel
  Production promotion hold;
- verify Trigger.dev Preview branch ownership, or require a protected,
  commit-scoped, expiring waiver;
- run a non-destructive acceptance in each environment and verify the active
  Vercel aliases, Expo channels/build availability, and Trigger worker.

No Production `db:push`, Vercel promotion, Expo build/update, or jobs deploy is
performed by this verification-only integration.

## Preview Support

Both web and mobile Preview are modeled. Dashboard/API and Marketing use their
owned Vercel Preview deployments. Mobile uses the Expo `preview` profile,
channel, and branch for Android and iOS. Operational readiness still depends on
the isolated database, environment configuration, and trusted collector above.
