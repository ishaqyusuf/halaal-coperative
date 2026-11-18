import { Prisma, type PrismaClient } from "../../generated/prisma/client"
import { startOfUtcDay, unpaidScheduleStatuses } from "./repayments"
import type { MobileAdminFinanceSupportQueueKey } from "./mobile-admin-finance-support-policy"

export type FinanceDeskAccess = {
  charges: boolean
  contributions: boolean
  foodPurchase: boolean
  shares: boolean
}

export type FinanceDeskCursor = {
  at: string
  id: string
  queueKey: MobileAdminFinanceSupportQueueKey
}

export type FinanceDeskReadInput = {
  access: FinanceDeskAccess
  cursor?: FinanceDeskCursor
  entityId?: string
  limit: number
  queueKey?: MobileAdminFinanceSupportQueueKey
  search?: string
  summary?: boolean
  tenantId: string
}

type QueueSource = {
  from: Prisma.Sql
  open: Prisma.Sql
  at: Prisma.Sql
  member: Prisma.Sql
  text: Prisma.Sql
  blocked?: Prisma.Sql
  deskWaiting?: Prisma.Sql
}

const reviewing = Prisma.sql`r.status IN ('submitted', 'under_review')`
function getSources(today: Date) {
  const tomorrow = new Date(today.getTime() + 86_400_000)
  return {
    receipts: {
      from: Prisma.sql`member_payment_receipts r`,
      open: reviewing,
      at: Prisma.sql`r.submitted_at`,
      member: Prisma.sql`r.member_id`,
      text: Prisma.sql`coalesce(r.payment_reference, 'No payment reference')`,
      blocked: Prisma.sql`nullif(r.proof_document_url, '') IS NULL`,
    },
    financing: {
      from: Prisma.sql`loan_requests r JOIN loan_products p ON p.id = r.loan_product_id`,
      open: reviewing,
      at: Prisma.sql`r.requested_at`,
      member: Prisma.sql`r.member_id`,
      text: Prisma.sql`p.name`,
      blocked: Prisma.sql`EXISTS (
      SELECT 1 FROM loan_guarantor_approvals a
      WHERE a.loan_request_id = r.id AND a.status <> 'approved'
    )`,
    },
    procurement: {
      from: Prisma.sql`procurement_requests r`,
      open: reviewing,
      at: Prisma.sql`r.requested_at`,
      member: Prisma.sql`r.member_id`,
      text: Prisma.sql`concat_ws(' ', r.item_name, r.vendor_name)`,
      deskWaiting: Prisma.sql`r.status IN ('submitted', 'under_review', 'approved', 'purchased')`,
    },
    foodPurchase: {
      from: Prisma.sql`food_purchase_applications r JOIN food_purchase_cycles c ON c.id = r.cycle_id`,
      open: reviewing,
      at: Prisma.sql`r.requested_at`,
      member: Prisma.sql`r.member_id`,
      text: Prisma.sql`coalesce(r.item_description, 'Foodstuff Purchase application')`,
      blocked: Prisma.sql`c.status <> 'open'`,
      deskWaiting: Prisma.sql`(${reviewing}) OR (r.status = 'approved' AND r.goods_released_at IS NULL)`,
    },
    projectFinancing: {
      from: Prisma.sql`project_financing_requests r`,
      open: reviewing,
      at: Prisma.sql`r.requested_at`,
      member: Prisma.sql`r.member_id`,
      text: Prisma.sql`r.business_name`,
      blocked: Prisma.sql`r.proposed_structure = 'undecided'`,
      deskWaiting: Prisma.sql`r.status IN ('submitted', 'under_review', 'approved')`,
    },
    shares: {
      from: Prisma.sql`member_share_applications r`,
      open: Prisma.sql`r.status = 'pending'`,
      at: Prisma.sql`r.created_at`,
      member: Prisma.sql`r.member_id`,
      text: Prisma.sql`r.requested_units::text || ' optional unit(s)'`,
    },
    collections: {
      from: Prisma.sql`repayment_schedule_items r JOIN loans l ON l.id = r.loan_id
      JOIN loan_products p ON p.id = l.loan_product_id`,
      open: Prisma.sql`r.status IN (${Prisma.join(
        unpaidScheduleStatuses.map(
          (status) => Prisma.sql`${status}::"RepaymentScheduleStatus"`
        )
      )}) AND (r.status = 'due' OR r.due_at < ${tomorrow})`,
      at: Prisma.sql`r.due_at`,
      member: Prisma.sql`l.member_id`,
      text: Prisma.sql`p.name || ' installment ' || r.installment_number`,
    },
    support: {
      from: Prisma.sql`support_cases r`,
      open: Prisma.sql`r.status <> 'closed'`,
      at: Prisma.sql`r.updated_at`,
      member: Prisma.sql`r.member_id`,
      text: Prisma.sql`r.subject`,
      blocked: Prisma.sql`r.requires_financial_adjustment AND r.financial_adjustment_approval_status <> 'approved'`,
    },
  } satisfies Record<MobileAdminFinanceSupportQueueKey, QueueSource>
}

function visibleQueueKeys(
  sources: Record<MobileAdminFinanceSupportQueueKey, QueueSource>,
  input: FinanceDeskReadInput
) {
  return (Object.keys(sources) as MobileAdminFinanceSupportQueueKey[]).filter(
    (key) =>
      (key !== "shares" || input.access.shares) &&
      (key !== "foodPurchase" || input.access.foodPurchase)
  )
}

export function readFinanceDeskPage(
  prisma: PrismaClient,
  input: FinanceDeskReadInput
) {
  const sources = getSources(startOfUtcDay())
  const keys = visibleQueueKeys(sources, input).filter(
    (key) => !input.queueKey || input.queueKey === key
  )
  if (!keys.length) return Promise.resolve([])
  const candidates = keys.map((key) => {
    const source: QueueSource = sources[key]
    const search = input.search?.trim()
    const searchFilter = search
      ? Prisma.sql`AND (
          strpos(lower(coalesce(m.full_name, 'Workspace support case')), lower(${search})) > 0
          OR strpos(lower(m.member_number), lower(${search})) > 0
          OR strpos(lower(${source.text}), lower(${search})) > 0
          OR strpos(lower(r.status::text), lower(${search})) > 0
        )`
      : Prisma.empty
    const cursor = input.cursor
    return Prisma.sql`
      (SELECT r.id, ${source.at} AS at, ${key}::text AS "queueKey"
       FROM ${source.from}
       ${search ? Prisma.sql`LEFT JOIN members m ON m.id = ${source.member} AND m.tenant_id = r.tenant_id` : Prisma.empty}
       WHERE r.tenant_id = ${input.tenantId}::uuid AND (${source.open})
       ${searchFilter}
       ${input.entityId ? Prisma.sql`AND r.id = ${input.entityId}::uuid` : Prisma.empty}
       ${
         cursor
           ? Prisma.sql`AND (${source.at}, r.id, ${key}::text) >
         (${cursor.at}::timestamptz, ${cursor.id}::uuid, ${cursor.queueKey}::text)`
           : Prisma.empty
       }
       ORDER BY at, r.id LIMIT ${input.limit + 1})`
  })
  return prisma.$queryRaw<FinanceDeskCursor[]>(Prisma.sql`
    SELECT id, "queueKey", to_char(at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS at
    FROM (${Prisma.join(candidates, " UNION ALL ")}) candidates
    ORDER BY candidates.at, id, "queueKey"
    LIMIT ${input.limit + 1}
  `)
}

export async function readFinanceDeskSummary(
  prisma: PrismaClient,
  input: FinanceDeskReadInput
) {
  const today = startOfUtcDay()
  const sources = getSources(today)
  const queues = await prisma.$queryRaw<
    Array<{
      key:
        | MobileAdminFinanceSupportQueueKey
        | "contributions"
        | "charges"
        | "disbursement"
        | "profit"
      count: number
      blocked: number
      waiting: number
    }>
  >(
    Prisma.join(
      [
        ...visibleQueueKeys(sources, input).map((key) => {
          const source: QueueSource = sources[key]
          const blocked = source.blocked ?? Prisma.sql`false`
          const waiting =
            source.deskWaiting ??
            (key === "collections"
              ? Prisma.sql`(${source.open}) AND r.due_at < ${today}`
              : source.open)
          return Prisma.sql`
        SELECT ${key}::text AS key, count(*) FILTER (WHERE ${source.open})::int AS count,
          count(*) FILTER (WHERE (${source.open}) AND (${blocked}))::int AS blocked,
          count(*) FILTER (WHERE ${waiting})::int AS waiting
        FROM ${source.from}
        WHERE r.tenant_id = ${input.tenantId}::uuid AND ((${source.open}) OR (${waiting}))`
        }),
        Prisma.sql`
      SELECT 'disbursement', 0, 0, count(*)::int FROM loans
      WHERE tenant_id = ${input.tenantId}::uuid AND status = 'approved'
    `,
        ...(input.access.shares
          ? [
              Prisma.sql`
      SELECT 'profit', 0, 0, count(*)::int FROM share_business_profit_entries
      WHERE tenant_id = ${input.tenantId}::uuid AND status IN ('reviewed', 'approved')
    `,
            ]
          : []),
        ...(input.access.contributions
          ? [
              Prisma.sql`
      SELECT 'contributions', 0, 0, count(*)::int
      FROM collection_source_contribution_batch_rows r
      JOIN collection_source_contribution_batches b ON b.id = r.batch_id AND b.tenant_id = r.tenant_id
      WHERE r.tenant_id = ${input.tenantId}::uuid AND r.status = 'collected'
      AND b.status IN ('staged', 'partially_posted')
    `,
            ]
          : []),
        ...(input.access.charges
          ? [
              Prisma.sql`
      SELECT 'charges', 0, 0, count(*)::int FROM charge_applications
      WHERE tenant_id = ${input.tenantId}::uuid AND status = 'pending'
    `,
            ]
          : []),
      ],
      " UNION ALL "
    )
  )
  const waiting = (key: (typeof queues)[number]["key"]) =>
    queues.find((row) => row.key === key)?.waiting ?? 0
  return {
    blocked: queues.reduce((total, row) => total + row.blocked, 0),
    total: queues.reduce((total, row) => total + row.count, 0),
    queueCounts: queues
      .filter((row) => Object.hasOwn(sources, row.key))
      .map(({ key, count, blocked }) => ({
        key: key as MobileAdminFinanceSupportQueueKey,
        count,
        blocked,
      })),
    deskCounts: {
      charges: input.access.charges ? waiting("charges") : null,
      contributions: input.access.contributions
        ? waiting("contributions")
        : null,
      financing: waiting("financing") + waiting("disbursement"),
      repayments: waiting("collections"),
      procurement: waiting("procurement"),
      foodPurchase: input.access.foodPurchase ? waiting("foodPurchase") : null,
      projectFinancing: waiting("projectFinancing"),
      shares: input.access.shares
        ? waiting("shares") + waiting("profit")
        : null,
    },
  }
}

export type FinanceDeskSummary = Awaited<
  ReturnType<typeof readFinanceDeskSummary>
>
