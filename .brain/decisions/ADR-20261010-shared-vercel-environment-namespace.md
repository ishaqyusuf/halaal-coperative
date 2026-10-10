# Shared Vercel environment namespace

Status: accepted implementation, hosted rollout pending.

HalaalVest shares environment values through team-level `HALAALVEST_` names linked explicitly to its Dashboard and Marketing projects, separately scoped to Preview and Production. Database credentials stay canonical as `HALAALVEST_DATABASE_URL`; no legacy database alias is created. The two environments use separate Neon branches and distinct passwords.

An explicit server-only allowlist in `@halaalvest/utils/shared-env` fills missing conventional runtime names during Next configuration and instrumentation startup. Explicit project overrides win. Unknown names and public browser variables are never automatically mapped. This keeps shared private values out of client configuration while allowing project-specific overrides.

Trigger uses separate owned projects with each project's hosted prod environment. CLI access tokens remain local. Worker synchronization sends empty strings for absent managed optional settings because provider imports upsert rather than delete omitted values; deployment readback must verify these blanks. The provider supplies its reserved runtime Trigger key.

Current hosted shared entries: database URL, APP_ENV, Trigger project ID and Trigger runtime key for both environments. Credentials are never recorded in Brain or Git. Credential storage does not establish deployment cutover; web and worker releases must still be verified.
