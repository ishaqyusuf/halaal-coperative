# ADR: Patch Hono and the MCP rate-limit dependency chain within parent ranges

Date: 29 September 2026
Status: Accepted for source; clean accepted-artifact verification open

## Context and decision

The v113 lock already selected `hono@4.13.10` for the API, but `@modelcontextprotocol/sdk@1.29.0` and `@prisma/dev@0.24.3` retained `4.12.12`. Their declared Hono ranges are `^4.11.4` and `^4.12.8`; both accept 4.13.10. Add a root `hono:4.13.10` override so Bun deduplicates these copies. The API's CORS middleware already specifies a dashboard origin with credentials rather than relying on wildcard defaults.

The SDK also accepted `express-rate-limit@8.3.2` through `^8.2.1`; that release pins vulnerable `ip-address@10.1.0`. Published express-rate-limit 8.7.0 instead requests `ip-address:^10.2.0`. Pin both `express-rate-limit:8.7.0` and `ip-address:10.7.2` in the root overrides. Both remain within their declared parent majors. The [leading-zero octet advisory](https://github.com/advisories/GHSA-mwp4-54f8-5fhr) patches at 10.3.1; 10.7.2 also clears the later moderate ip-address findings present at 10.3.1.

## Verification and limits

Final lock SHA-256 `a70a2a3132889af060387999a997ac508f26d5a8724fdac8d060482bae782b4c`. Relative to v113, the lock adds three overrides, updates express-rate-limit and ip-address entries, and removes two nested Hono 4.12.12 entries; no other package or workspace entry changed. Normal lockfile-only install is byte-stable and frozen install passes. The exact audit improves from **0 critical/9 high/45 moderate/6 low** to **0 critical/7 high/21 moderate/4 low**, removing the old Hono and ip-address advisory groups without adding a finding.

Ignored Bun links retained five old Hono targets and five old rate-limit/IP targets after install; these were corrected locally before functional checks. The API Hono CORS fixture allows the configured dashboard origin and omits the allow-origin header for a different origin. The MCP SDK resolves Hono 4.13.10, express-rate-limit 8.7.0 and ip-address 10.7.2; the latter rejects `012.0.0.1` and accepts normal private IPv4 input. API/database/jobs TypeScript, focused API context tests, Trigger CLI and a local optimized marketing build pass.

This is source/tooling evidence, not a clean Linux/Trigger artifact, signed app or proof of every runtime caller. Seven highs remain, as do owner cloud hold, provider/device QA and draft-policy gates. See [the exact remaining-high artifact matrix](../runbooks/halaalvest-remaining-high-artifact-matrix.md).
