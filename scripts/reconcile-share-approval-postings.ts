import { parseArgs } from "node:util"
import { createPrismaClient } from "../packages/db/src/prisma"
import { reconcileTrackedShareApprovalPostings } from "../packages/db/src/queries/tenant-finance"

const { values } = parseArgs({
  options: {
    apply: { type: "boolean", default: false },
    tenant: { type: "string" },
  },
})
if (!values.tenant) throw new Error("An explicit --tenant slug is required.")

const prisma = createPrismaClient()
if (!prisma) throw new Error("Database not configured. Run through with-env.")

try {
  const tenant = await prisma.tenant.findUniqueOrThrow({
    select: { id: true },
    where: { slug: values.tenant },
  })
  const corrections = await reconcileTrackedShareApprovalPostings(
    { apply: values.apply, tenantId: tenant.id },
    prisma
  )
  console.log(JSON.stringify({ applied: values.apply, corrections }, null, 2))
  if (corrections.length) {
    console.log(
      "Review previously calculated unpublished business profit and dividend allocations with a cutoff on or after the earliest corrected date. Recompute before publication."
    )
  }
  if (corrections.length === 50) {
    console.log("Batch limit reached. Check for the next batch.")
  }
} finally {
  await prisma.$disconnect()
}
