# Next.js upgrade — 28 October 2026

Upgraded Next.js 16.3.6 to stable 16.4.3 in Dashboard, Marketing and tenant-url;
updated the existing React Email override and matching Next ESLint plugin.
The existing exact pins/range styles are preserved. React/Expo requirements,
app configuration, business logic and financial/permission boundaries are unchanged.

Stable version checked against https://registry.npmjs.org/next/latest and the
16.4 release notes at https://nextjs.org/blog/next-16-4. Followed existing Midday
workspace dependency boundaries; no architecture migration or ADR is needed.

## Verification

- Bun 1.3.9, Node 25.4.0, macOS arm64; local profile through the existing launcher.
- Frozen install with lifecycle scripts disabled passes without lockfile changes.
- Existing isolated Bun workspace links were refreshed explicitly with
  `bun install --ignore-scripts --linker isolated`; both apps resolve 16.4.3.
- Focused tenant URL/variant-switcher tests: 3 pass, 6 assertions.
- Marketing and Dashboard production Turbopack builds pass, including their
  TypeScript, page-data collection and prerendering stages. Builds used an 8 GiB
  Node heap and the local environment. No typecheck bypass was introduced.
- Existing unrelated marketing/domain changes remain outside this commit.

No active Codex chat for this project appeared in the 50-chat current inventory;
no idle or paused chat was awakened. Existing shared dev servers were not
restarted, and no provider, DB schema, push or deployment action was performed.
This dependency/type-only work introduces no visual UI change; browser/native
acceptance was not performed or claimed. Local Brain records retain task state.
