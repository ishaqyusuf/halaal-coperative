# Logly analytics integration

The current main revision composes the shared provider in dashboard and marketing and mounts the native runtime in the Expo root. Browser `/api/analytics` uses `halaalvest-web`; `/api/analytics/mobile` uses independently scoped `halaalvest-mobile` credentials. Package privacy projection removes private route segments and event properties. Native identifiers remain installation-local in SecureStore, and the native bundle never receives the server credential. Country metadata uses only the trusted Vercel edge header. No schema changes.

Twelve analytics tests / 50 assertions, events-package typecheck, mobile typecheck, and the Android Expo export pass on the clean analytics branch. The native runtime uses existing JavaScript random-ID support. Both web deployments were previously promoted successfully: dashboard `dpl_ey3CgBPmf9ZrVWFX847ecqMaajRg`, marketing `dpl_6PDXnBzM3KGtHjNxDMJPQpujN8xi`.

The verified public EAS project ID and owner are fallback app-config values while environment overrides remain supported. This removes clean-build dependence on a local dotenv loader. Initial Android build `236ab544-6b03-4429-a3f9-c9661cdedfd5` failed before extraction because Expo received a truncated archive; it never reached application compilation. A retry using the current pinned CLI follows this config fix. Interactive acceptance remains separate.
