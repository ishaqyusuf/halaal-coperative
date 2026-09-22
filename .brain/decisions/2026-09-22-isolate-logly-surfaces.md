# Separate Logly workspaces for deployed Halaalvest surfaces

Status: Accepted (owner-authorized integration, 2026-09-22).

Dashboard, marketing and Android have independent fixed Logly project identities under Halaalvest. Preserve the old combined web project/history. Surface-qualified environment names and layout-bound identities prevent shared root dotenv values from combining web namespaces. Browser proxy origin allowlists enumerate verified production domains, requiring updates when new production hosts are onboarded. Ingest keys stay in Vercel server variables only.

Android uses the existing mobile workspace and endpoint with the current Logly native event contract. Until native/core0.3 packages are published, extend the published schema locally rather than ship an unresolvable dependency. Keep the privacy adapter and bounded in-memory transport. No iOS enablement or distribution-policy change is included.

Production builds without an EAS channel require a binary release; generating an AAB or sending a synthetic event does not establish installed-device acceptance.
