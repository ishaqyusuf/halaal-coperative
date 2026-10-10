# Logly product analytics

Status: Accepted by owner, 2026-09-07.

Use one `halaalvest-web` project for web surfaces and a separate `halaalvest-mobile` project for native. Reuse the Afterservice package/provider/proxy shape. Keep ingest credentials server-side, anonymous identifiers project-scoped, and only coarse navigation events. Prefer privacy and app reliability over rich attribution. A native-safe transport is necessary because the published browser client reads `window.location`. No third-party account, database migration, historical data deletion or authenticated user identification is introduced.

Implementation, validation and deployment boundaries: [Logly analytics](../features/logly-analytics.md).
