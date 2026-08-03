# ADR-016: Separate Business Lifecycle from Profit-Sharing Seasons

## Status

Accepted

## Date

2026-08-02

## Context

- A cooperative can bring forward an ongoing business that started before the current financial or dividend year.
- Treating the business start date as the lower bound for migration safety is too weak: staff could attach old profit to a live record and unintentionally include it in the next distribution.
- Treating the finance start date as the lower bound for the business itself is too strict: it prevents accurate registration of long-running businesses.
- A client-selected dividend period cannot be trusted as the accounting boundary for a new live profit.

## Decision

- Keep business start/end dates as lifecycle metadata. An old business is valid in brought-forward and live operation.
- Treat each profit date as the accounting boundary. A manual profit must be within the business lifecycle, within the current configured sharing season, and no later than the server's current date.
- Resolve the current season from the tenant's financial-year start month and annual, semi-annual, quarterly, or ad-hoc distribution frequency.
- Reuse an exact draft `DividendPeriod`, or create the scheduled draft period atomically on the first valid manual profit. Do not write into approved, published, closed, overlapping, or unavailable periods.
- Ignore client-selected period linkage for manual profit and persist the authoritative season ID.
- Preserve explicit period selection only for backfill/import, with tenant ownership and date containment checks.
- Define brought-forward historical profit as pending profit dated before the current configured season start, rather than before today.

## Consequences

- Old and ongoing businesses can be represented accurately without opening a path for old profit to enter the next sharing run.
- Every live profit has a deterministic tenant-scoped season relation before allocation or publication.
- The UI can communicate one inclusive allowed range and fail closed when the season is unavailable.
- Historical corrections remain available only through migration-specific controls and locks.
- No Prisma schema change is required; the decision strengthens use of the existing `ShareBusinessProfitEntry.linkedDividendPeriodId` relation.

## Alternatives Considered

- Restrict the business start date to the current season.
  - Rejected because it falsifies the lifecycle of brought-forward businesses.
- Allow any profit date after the business start date and sort it out during dividend review.
  - Rejected because invalid historical profit would already be mixed into live operations.
- Let staff choose a dividend period for every manual profit.
  - Rejected because it permits accidental or cross-period accounting and duplicates server-owned policy resolution.
