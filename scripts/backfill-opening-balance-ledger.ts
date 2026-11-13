/**
 * One-off corrective posting for QA F3 (13 Nov 2026).
 *
 * Opening positions applied before the fix posted savings only. This posts
 * the missing brought-forward ledger entries (share capital to 3200,
 * financing to 1100, both against Cooperative Equity 4000) dated at each
 * position's opening date, with an audit row per posting. Existing rows are
 * never edited, and reruns are no-ops.
 *
 * Dry run (default):
 *   bun --env-file=/dev/null ../local-infra-kit/bin/with-env.ts --profile halaalvest -- \
 *     bun scripts/backfill-opening-balance-ledger.ts --tenant amana-savings
 * Write:
 *   ... bun scripts/backfill-opening-balance-ledger.ts --tenant amana-savings --apply
 * Omit --tenant to scan every tenant. --tenant may repeat.
 */
import { createPrismaClient } from "../packages/db/src/prisma"
import { backfillOpeningBalanceLedgerPostings } from "../packages/db/src/queries/opening-balance-ledger-backfill"

const args = process.argv.slice(2)
const apply = args.includes("--apply")
const tenantSlugs = args.flatMap((arg, index) =>
  arg === "--tenant" && args[index + 1] ? [args[index + 1]!] : []
)

if (!process.env.HALAALVEST_DATABASE_URL?.trim()) {
  console.error("HALAALVEST_DATABASE_URL is not set. Run through with-env.")
  process.exit(1)
}

const prisma = createPrismaClient()
if (!prisma) {
  console.error("Database not configured.")
  process.exit(1)
}

try {
  const tenants = tenantSlugs.length
    ? await prisma.tenant.findMany({
        select: { id: true, slug: true },
        where: { slug: { in: tenantSlugs } },
      })
    : []

  const missing = tenantSlugs.filter(
    (slug) => !tenants.some((tenant) => tenant.slug === slug)
  )
  if (missing.length) {
    console.error(`Unknown tenant slug(s): ${missing.join(", ")}`)
    process.exit(1)
  }

  const result = await backfillOpeningBalanceLedgerPostings(
    {
      apply,
      tenantIds: tenants.length ? tenants.map((tenant) => tenant.id) : undefined,
    },
    prisma
  )

  console.log(
    `${apply ? "Posted" : "Would post"} ${result.actions.length} ledger transaction(s) across ${result.scannedOpeningBalanceCount} applied opening position(s).`
  )
  for (const action of result.actions) {
    console.log(
      [
        action.tenantId,
        action.kind,
        action.amount.toFixed(2),
        action.reference,
        action.transactionId ?? "(dry run)",
      ].join("\t")
    )
  }
  if (!apply && result.actions.length) {
    console.log("Dry run only. Re-run with --apply to post.")
  }
} finally {
  await prisma.$disconnect()
}
