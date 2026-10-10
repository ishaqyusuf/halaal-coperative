# ADR-021: Centralize The Mobile Runtime And Ban Offline Command Replay

## Status

Accepted

## Context

- Mobile authentication hydration, query retry, app foreground behavior, connectivity, read cache, drafts, and recovery previously lived across providers and screens without one explicit runtime state.
- React Query and native connectivity defaults can accidentally create multiple retry owners or retain paused mutations, which is unsafe for cooperative money and privileged operations.
- Cached reads and drafts were cleared on ordinary role transitions but their storage keys did not independently encode tenant, user, membership, and role scope.

## Decision

- Mount one `MobileRuntimeProvider` at the application root inside the single auth and typed-query providers.
- Model cold, hydrating, unauthenticated, authenticated, fatal, online, offline, retrying, fresh, stale, active, inactive, and background states explicitly.
- Use NetInfo as the React Query online source and AppState as its focus source. The runtime is the sole reconnect/foreground refresh owner and refetches active reads with a bounded debounce.
- Configure mutations with `networkMode: "always"` and `retry: false`; never call `resumePausedMutations`. Events and commands require online state, and financial commands produce an explicit online-required error while retaining the draft.
- Scope read caches and form drafts by tenant, user, active membership, and effective role. Clear React Query state plus persisted reads/drafts on sign-out, session invalidation, tenant/role change, and successful ownership transitions.
- Preserve a securely cached profile during transient hydration/network failure, but clear it when the server identifies the credential as unauthorized.
- Render global cached/offline runtime banners inside the runtime gate. They must never precede session verification or expose post-auth state on cold, hydrating, or fatal bootstrap surfaces.
- Use a deterministic keyboard-aware authentication route. Reserve bottom sheets for user-triggered workflows instead of auto-presenting one during cold launch.
- Protect unauthenticated, member, admin, and shared signed-in route groups at the root with Expo Router `Stack.Protected`. Nested layouts remain defense-in-depth guards, but role changes and sign-out rely on the root navigator pruning forbidden history rather than dispatching a replacement action from an invalidated child navigator.
- Enable Metro `inlineRequires`, preserve app-owned runtime singletons, and use bounded icon imports. Expo Router may discover every route, but Hermes should evaluate feature dependencies only as their modules are required.

## Consequences

- Feature components can consume runtime state without knowing NetInfo, AppState, retry, or transport details.
- Reconnect and foreground transitions refresh reads but cannot replay money or privileged commands.
- Cache/draft keys cannot collide across members, staff roles, or tenants even if cleanup is interrupted.
- Expo Go can validate cold launch and keyboard behavior; complete offline/native-module evidence still requires the installed development-build matrix in later tickets.
- Expo Go can traverse member and admin tab graphs and open the subscription route without the prior Hermes Hades GC crash. Root role transitions also return to the authorized graph without an unhandled navigation replacement.
- Bootstrap hydration and fatal recovery now share one feature-owned fail-closed presentation across the runtime gate and route initialization guards. Development-only deterministic previews are guarded from production and provide reviewable Light/Dark evidence without treating Expo Go's own loader as application UI.

## Alternatives Considered

- Let every screen subscribe to connectivity and AppState.
  - Rejected because it creates duplicate refreshes and inconsistent offline command behavior.
- Resume paused React Query mutations after reconnect.
  - Rejected because delayed financial or privileged commands could execute outside the user's current context.
- Treat every hydration error as logout.
  - Rejected because a transient network failure should not erase a valid secure session or its scoped cached reads.
