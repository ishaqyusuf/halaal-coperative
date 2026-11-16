import { afterAll, describe, expect, it } from "bun:test"
import { createPrismaClient } from "../prisma"
import {
  type OverviewKpis,
  readOverviewKpis,
  readOverviewRecentActivity,
} from "./dashboard"

// Equivalence of the home overview's one-statement reads (L8) with the
// per-KPI Prisma reference, on the local database: every tenant as seeded,
// then again after a rolled-back shuffle of statuses and dates.
const db = createPrismaClient()
const run =
  db && process.env.RUN_LOCAL_DB_INTEGRATION === "1" ? describe : describe.skip
const rollback = new Error("rollback")

// Hides `$queryRaw`, so the reads take the Prisma reference path.
function withoutRaw<T extends object>(client: T): T {
  return new Proxy(client, {
    get: (target, key) =>
      key === "$queryRaw" ? undefined : Reflect.get(target, key),
  })
}

// Money is compared to the cent: Postgres sums exactly, the reference adds
// floats.
function normalizeKpis(kpis: OverviewKpis) {
  return Object.fromEntries(
    Object.entries(kpis).map(([key, value]) => [
      key,
      typeof value === "number" && !Number.isInteger(value)
        ? Math.round(value * 100) / 100
        : value,
    ])
  )
}

const today = new Date()
const startOfToday = Date.UTC(
  today.getUTCFullYear(),
  today.getUTCMonth(),
  today.getUTCDate()
)
// Today's midnight (and 1 ms either side) lands on the shuffled due dates'
// exact 30/60/90-day boundaries.
const asOfs = [
  today,
  new Date(startOfToday),
  new Date(startOfToday + 1),
  new Date(startOfToday - 1),
  new Date("2026-01-01T00:00:00.000Z"),
  new Date("2026-03-31T23:59:59.999Z"),
  new Date("2027-06-15T12:30:00.000Z"),
]

async function compareTenants(client: any) {
  const tenants: Array<{ id: string }> = await client.tenant.findMany({
    select: { id: true },
  })
  let checks = 0

  for (const tenant of [...tenants, { id: crypto.randomUUID() }]) {
    for (const asOf of asOfs) {
      const [sql, reference] = await Promise.all([
        readOverviewKpis(client, tenant.id, asOf),
        readOverviewKpis(withoutRaw(client), tenant.id, asOf),
      ])
      expect({ tenantId: tenant.id, asOf, kpis: normalizeKpis(sql) }).toEqual({
        tenantId: tenant.id,
        asOf,
        kpis: normalizeKpis(reference),
      })
      checks += 1
    }

    const [activity, referenceActivity] = await Promise.all([
      readOverviewRecentActivity(client, tenant.id),
      readOverviewRecentActivity(withoutRaw(client), tenant.id),
    ])
    expect({ tenantId: tenant.id, activity }).toEqual({
      tenantId: tenant.id,
      activity: referenceActivity,
    })
    checks += 1
  }

  return { checks, tenants: tenants.length }
}

async function pickEnum(
  tx: any,
  table: string,
  column: string,
  enumName: string
) {
  await tx.$executeRawUnsafe(
    `UPDATE ${table} SET ${column} = (enum_range(NULL::"${enumName}"))[
       1 + floor(random() * array_length(enum_range(NULL::"${enumName}"), 1))::int
     ]`
  )
}

run("home overview reads (L8)", () => {
  afterAll(async () => {
    await db?.$disconnect()
  })

  it("match the per-KPI reference for every seeded tenant", async () => {
    const { checks } = await compareTenants(db)
    expect(checks).toBeGreaterThan(0)
  }, 120_000)

  it("match the reference after shuffling statuses and dates", async () => {
    try {
      await db!.$transaction(
        async (tx: any) => {
          await tx.$executeRawUnsafe("SELECT setseed(0.42)")
          const enums: Array<[string, string, string]> = [
            ["member_onboarding_requests", "status", "MemberOnboardingStatus"],
            ["members", "status", "MemberStatus"],
            ["members", "kyc_status", "KycStatus"],
            ["loan_requests", "status", "LoanRequestStatus"],
            ["loans", "status", "LoanStatus"],
            [
              "member_share_applications",
              "status",
              "MemberShareApplicationStatus",
            ],
            ["member_opening_balances", "status", "MemberOpeningBalanceStatus"],
            ["procurement_requests", "status", "ProcurementRequestStatus"],
            [
              "project_financing_requests",
              "status",
              "ProjectFinancingRequestStatus",
            ],
            [
              "food_purchase_applications",
              "status",
              "FoodPurchaseApplicationStatus",
            ],
            ["food_purchase_cycles", "status", "FoodPurchaseCycleStatus"],
            ["member_payment_receipts", "status", "MemberPaymentReceiptStatus"],
            ["support_cases", "status", "SupportCaseStatus"],
            ["repayment_schedule_items", "status", "RepaymentScheduleStatus"],
            ["share_businesses", "status", "ShareBusinessStatus"],
            ["share_business_profit_entries", "status", "ProfitEntryStatus"],
            [
              "share_profit_allocations",
              "status",
              "ShareProfitAllocationStatus",
            ],
            ["dividend_periods", "status", "DividendPeriodStatus"],
            ["contributions", "status", "ContributionStatus"],
            ["repayments", "status", "RepaymentStatus"],
          ]

          for (const [table, column, enumName] of enums) {
            await pickEnum(tx, table, column, enumName)
          }

          await tx.$executeRawUnsafe(`
            UPDATE import_batches SET status = (ARRAY['draft', 'failed', 'applied', 'undone'])[1 + floor(random() * 4)::int]
          `)
          // Due dates around today and the 30/60/90-day cut-offs, to the
          // millisecond, including exact boundaries.
          await tx.$executeRawUnsafe(`
            UPDATE repayment_schedule_items SET due_at =
              date_trunc('day', now()) - (floor(random() * 140) || ' days')::interval
              + (ARRAY[interval '0', interval '1 millisecond', interval '-1 millisecond', interval '12 hours'])[1 + floor(random() * 4)::int]
          `)
          // Few distinct timestamps, so the latest-three lists have ties.
          for (const [table, column] of [
            ["contributions", "posted_at"],
            ["repayments", "paid_at"],
            ["loan_requests", "requested_at"],
          ]) {
            await tx.$executeRawUnsafe(
              `UPDATE ${table} SET ${column} = timestamptz '2026-11-01' + (floor(random() * 3) || ' hours')::interval`
            )
          }
          await tx.$executeRawUnsafe(`
            INSERT INTO member_documents (tenant_id, member_id, document_type, document_url, review_status, updated_at)
            SELECT m.tenant_id, m.id, 'id_card', 'https://example.test/doc',
              (ARRAY['pending', 'approved', 'rejected'])[1 + floor(random() * 3)::int], now()
            FROM members m WHERE random() < 0.3
          `)

          const { checks } = await compareTenants(tx)
          expect(checks).toBeGreaterThan(0)
          throw rollback
        },
        { maxWait: 10_000, timeout: 120_000 }
      )
    } catch (error) {
      if (error !== rollback) throw error
    }
  }, 180_000)
})
