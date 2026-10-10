# ADR-019: Version Marketing Experiences Behind Production Readiness

## Status

Accepted and implemented on 2026-08-11.

## Context

The public marketing root already separates launch/prelaunch copy from early-access signup policy, but a complete visual redesign previously had to replace the active landing implementation directly. That made long-running design work difficult to review at a stable URL and made activation or rollback depend on another code change.

The Ramp-inspired redesign needs to evolve beside the current Organic Trust page while continuing to use the same early-access, signup, Quick Fill, and onboarding contracts.

## Decision

- Define typed marketing experience IDs in `@halaalvest/domain`; the initial IDs are `organic-trust-v1` and `ramp-v2`.
- Keep `MARKETING_STAGE`, `MARKETING_EARLY_ACCESS_ENABLED`, and `MARKETING_EXPERIENCE` independent. They control launch copy, signup access, and visual experience selection respectively.
- Keep the root marketing route compositional. A shared loader resolves signup and QA context, a shared page view mounts development tooling, and an experience registry loads only the selected presentation module.
- Require every experience to consume the same `isLaunchReady`, `quickFill`, and `signupHref` contract.
- Keep production readiness in code. An unfinished experience requested through `MARKETING_EXPERIENCE` falls back to `organic-trust-v1` in production, while non-production environments may render it directly.
- Expose registered experiences at `/preview/marketing/<experience>`. Preview pages are dynamic and `noindex`; production access fails closed unless `MARKETING_EXPERIENCE_PREVIEW_TOKEN` is configured and supplied exactly through the preview query.
- Activate and roll back completed experiences by changing `MARKETING_EXPERIENCE`, not by replacing or reverting the root route.

## Consequences

- Ramp-v2 is implemented as a distinct presentation and can be reviewed or refined without changing the active production homepage.
- Production cannot accidentally activate a registered draft merely because an environment variable is mistyped or changed early.
- Rollback to Organic Trust is an environment change and does not require a code revert.
- The preview token is a deployment secret and must not use a `NEXT_PUBLIC_` prefix. Preview links should be shared only with intended reviewers because the query token grants bearer-style access.
- Presentation modules remain app-owned; reusable signup and domain behavior remain in their existing packages and server helpers.

## Alternatives Considered

- Maintain the redesign only on a long-lived Git branch: rejected because preview URLs drift from the main integration branch and rollback still depends on source control operations.
- Use `MARKETING_STAGE` for visual versions: rejected because product launch state and presentation version are independent decisions.
- Allow any registered experience to activate directly from the environment: rejected because a draft could reach production before visual, accessibility, performance, and conversion checks pass.
- Select the experience with a public query parameter on `/`: rejected because it creates unstable canonical content, cache ambiguity, and an unguarded production-preview surface.
