import { randomUUID } from "node:crypto"
import type {
  KycStatus,
  LoanStatus,
  MemberStatus,
  MemberType,
  Prisma,
  PrismaClient,
} from "../../generated/prisma/client"
import { ExpectedQueryError } from "../query-error"
import { mobileAccessChargeCode } from "./cooperative-mobile-billing-constants"
import { ensureTenantLedgerAccounts } from "./ledger"

/**
 * Batched writers for spreadsheet imports. Each one reads what it needs in a
 * few set-based queries, then writes every row with createMany (ids are made
 * here so ledger rows can point at them), so a 2,000-row file costs a handful
 * of statements instead of ~10 per row. They run inside the caller's
 * transaction (`applyImportBatch`), so a file is posted whole or not at all.
 *
 * When `batchId` is given, each posted ledger transaction and charge gets an
 * idempotency key `import-batch:<batchId>:row:<n>`, so the database itself
 * refuses to post the same batch row twice.
 */

type Db = PrismaClient | Prisma.TransactionClient

export function buildRepaymentSchedule(input: {
  monthlyRepaymentAmount?: number
  principalAmount: number
  startDate: Date
  termMonths: number
}) {
  const monthlyAmount =
    input.monthlyRepaymentAmount && input.monthlyRepaymentAmount > 0
      ? Number(input.monthlyRepaymentAmount.toFixed(2))
      : Number((input.principalAmount / input.termMonths).toFixed(2))

  return Array.from({ length: input.termMonths }, (_, index) => {
    const dueAt = new Date(input.startDate)
    dueAt.setUTCMonth(dueAt.getUTCMonth() + index)

    return {
      amountPaid: 0,
      chargeDue: 0,
      dueAt,
      installmentNumber: index + 1,
      principalDue: monthlyAmount,
      status: "pending" as const,
      totalDue: monthlyAmount,
    }
  })
}

export type ImportPostingResult = { processed: number }

const SHOW_AT_MOST = 5

function rowKey(batchId: string | undefined, rowNumber: number) {
  return batchId ? `import-batch:${batchId}:row:${rowNumber}` : undefined
}

function listSome(values: string[]) {
  const unique = [...new Set(values)]
  const shown = unique.slice(0, SHOW_AT_MOST).join(", ")
  return unique.length > SHOW_AT_MOST
    ? `${shown} and ${unique.length - SHOW_AT_MOST} more`
    : shown
}

function toKobo(amount: number) {
  return Math.round(amount * 100)
}

function fromKobo(kobo: number) {
  return kobo / 100
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10)
}

async function findMembersByNumber(
  db: Db,
  tenantId: string,
  memberNumbers: string[],
  kindLabel: string
) {
  const members = await db.member.findMany({
    select: { id: true, memberNumber: true, totalSavingsSnapshot: true },
    where: { memberNumber: { in: [...new Set(memberNumbers)] }, tenantId },
  })
  const byNumber = new Map(
    members.map((member) => [member.memberNumber, member])
  )
  const missing = memberNumbers.filter((number) => !byNumber.has(number))

  if (missing.length > 0) {
    throw ExpectedQueryError.validation(
      `These member numbers are not in Halaalvest yet, so their ${kindLabel} cannot be added: ${listSome(missing)}. Import the members first.`
    )
  }

  return byNumber
}

/** Adds (or with a negative amount, takes away) savings for many members in one statement. */
async function adjustSavingsSnapshots(
  db: Db,
  tenantId: string,
  koboByMember: Map<string, number>
) {
  if (koboByMember.size === 0) return

  const ids = [...koboByMember.keys()]
  const amounts = ids.map((id) =>
    fromKobo(koboByMember.get(id) ?? 0).toFixed(2)
  )

  await db.$executeRaw`
    UPDATE members AS m
    SET total_savings_snapshot = m.total_savings_snapshot + v.amount
    FROM (
      SELECT unnest(${ids}::uuid[]) AS id, unnest(${amounts}::numeric[]) AS amount
    ) AS v
    WHERE m.id = v.id AND m.tenant_id = ${tenantId}::uuid
  `
}

export async function postImportedContributions(
  db: Db,
  input: {
    actorUserId: string
    batchId?: string
    rows: Array<{
      amount: number
      channel: "cash" | "manual" | "payroll" | "transfer"
      committedAmount?: number
      extraSavingsAmount?: number
      memberNumber: string
      periodLabel?: string
      postedAt: Date
      reference?: string
    }>
    tenantId: string
  }
): Promise<ImportPostingResult> {
  const { rows, tenantId } = input
  if (rows.length === 0) return { processed: 0 }

  const references = rows
    .map((row) => row.reference?.trim())
    .filter((reference): reference is string => Boolean(reference))
  const [members, accounts, alreadyAdded] = await Promise.all([
    findMembersByNumber(
      db,
      tenantId,
      rows.map((row) => row.memberNumber),
      "savings"
    ),
    ensureTenantLedgerAccounts(tenantId, db as PrismaClient),
    references.length
      ? db.contribution.findMany({
          select: { reference: true },
          where: { reference: { in: references }, tenantId },
        })
      : Promise.resolve([]),
  ])

  if (alreadyAdded.length > 0) {
    throw ExpectedQueryError.conflict(
      `Some payments in this file are already in Halaalvest (references ${listSome(alreadyAdded.map(({ reference }) => reference ?? ""))}). Remove them and try again.`
    )
  }

  const now = new Date()
  const contributions: Prisma.ContributionCreateManyInput[] = []
  const transactions: Prisma.LedgerTransactionCreateManyInput[] = []
  const entries: Prisma.LedgerEntryCreateManyInput[] = []
  const audits: Prisma.AuditLogCreateManyInput[] = []
  const koboByMember = new Map<string, number>()

  rows.forEach((row, index) => {
    const member = members.get(row.memberNumber)!
    const contributionId = randomUUID()
    const transactionId = randomUUID()

    contributions.push({
      amount: row.amount,
      channel: row.channel,
      committedAmount: row.committedAmount,
      extraSavingsAmount: row.extraSavingsAmount ?? 0,
      id: contributionId,
      memberId: member.id,
      periodLabel: row.periodLabel,
      postedAt: row.postedAt,
      reference: row.reference,
      status: "posted",
      tenantId,
    })
    transactions.push({
      contributionId,
      id: transactionId,
      idempotencyKey: rowKey(input.batchId, index + 1),
      memberId: member.id,
      narration: `Contribution from member${row.periodLabel ? ` for ${row.periodLabel}` : ""}`,
      postedAt: row.postedAt,
      tenantId,
      transactionType: "contribution",
    })
    entries.push(
      {
        amount: row.amount,
        direction: "debit",
        ledgerAccountId: accounts["2000"]!,
        ledgerTransactionId: transactionId,
        tenantId,
      },
      {
        amount: row.amount,
        direction: "credit",
        ledgerAccountId: accounts["1000"]!,
        ledgerTransactionId: transactionId,
        tenantId,
      }
    )
    audits.push({
      action: "contribution.recorded",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: contributionId,
      entityType: "Contribution",
      metadata: {
        amount: row.amount,
        channel: row.channel,
        committedAmount: row.committedAmount ?? null,
        extraSavingsAmount: row.extraSavingsAmount ?? 0,
        importBatchId: input.batchId ?? null,
        memberId: member.id,
      },
      occurredAt: now,
      tenantId,
    })
    koboByMember.set(
      member.id,
      (koboByMember.get(member.id) ?? 0) + toKobo(row.amount)
    )
  })

  await db.contribution.createMany({ data: contributions })
  await db.ledgerTransaction.createMany({ data: transactions })
  await db.ledgerEntry.createMany({ data: entries })
  await adjustSavingsSnapshots(db, tenantId, koboByMember)
  await db.auditLog.createMany({ data: audits })

  return { processed: rows.length }
}

export async function postImportedCharges(
  db: Db,
  input: {
    actorUserId: string
    batchId?: string
    rows: Array<{
      amount: number
      assessedAt: Date
      code: string
      kind: "fixed" | "percentage"
      memberNumber: string
      name: string
      notes?: string
    }>
    tenantId: string
  }
): Promise<ImportPostingResult> {
  const { rows, tenantId } = input
  if (rows.length === 0) return { processed: 0 }

  if (rows.some((row) => row.code === mobileAccessChargeCode)) {
    throw ExpectedQueryError.validation(
      "Mobile app access charges are added by mobile billing, not by import."
    )
  }

  const [members, accounts] = await Promise.all([
    findMembersByNumber(
      db,
      tenantId,
      rows.map((row) => row.memberNumber),
      "charges"
    ),
    ensureTenantLedgerAccounts(tenantId, db as PrismaClient),
  ])

  // One upsert per charge code in the file (a handful), not per row. The last
  // row for a code sets its name and amount, as row-by-row upserts did.
  const lastRowByCode = new Map(rows.map((row) => [row.code, row]))
  const definitions = new Map<
    string,
    { id: string; isMonthlyLevy: boolean; name: string; purpose: string }
  >()
  for (const [code, row] of lastRowByCode) {
    const definition = await db.chargeDefinition.upsert({
      create: {
        amount: row.amount,
        appliesToMembers: true,
        code,
        isActive: true,
        kind: row.kind,
        name: row.name,
        tenantId,
      },
      select: { id: true, isMonthlyLevy: true, name: true, purpose: true },
      update: {
        amount: row.amount,
        isActive: true,
        kind: row.kind,
        name: row.name,
      },
      where: { tenantId_code: { code, tenantId } },
    })
    definitions.set(code, definition)
  }

  if (
    [...definitions.values()].some(({ purpose }) => purpose === "member_share")
  ) {
    throw ExpectedQueryError.validation(
      "Share charges cannot be imported here. Record past share payments from Finance setup instead."
    )
  }

  const alreadyAdded = await db.chargeApplication.findMany({
    select: { assessedAt: true, chargeDefinitionId: true, memberId: true },
    where: {
      chargeDefinitionId: { in: [...definitions.values()].map(({ id }) => id) },
      memberId: { in: [...new Set([...members.values()].map(({ id }) => id))] },
      tenantId,
    },
  })
  const addedKeys = new Set(
    alreadyAdded.map(
      (item) =>
        `${item.memberId}|${item.chargeDefinitionId}|${dateKey(item.assessedAt)}`
    )
  )
  const repeats = rows.filter((row) =>
    addedKeys.has(
      `${members.get(row.memberNumber)!.id}|${definitions.get(row.code)!.id}|${dateKey(row.assessedAt)}`
    )
  )
  if (repeats.length > 0) {
    throw ExpectedQueryError.conflict(
      `Some charges in this file are already in Halaalvest (${listSome(repeats.map((row) => `${row.memberNumber} ${row.code} ${dateKey(row.assessedAt)}`))}). Remove them and try again.`
    )
  }

  const now = new Date()
  const applications: Prisma.ChargeApplicationCreateManyInput[] = []
  const transactions: Prisma.LedgerTransactionCreateManyInput[] = []
  const entries: Prisma.LedgerEntryCreateManyInput[] = []
  const audits: Prisma.AuditLogCreateManyInput[] = []
  const koboByMember = new Map<string, number>()

  rows.forEach((row, index) => {
    const member = members.get(row.memberNumber)!
    const definition = definitions.get(row.code)!
    const applicationId = randomUUID()
    const transactionId = randomUUID()
    const key = rowKey(input.batchId, index + 1)

    applications.push({
      amount: row.amount,
      applicabilitySnapshot: {
        amount: row.amount,
        assessedAt: row.assessedAt.toISOString(),
        basisAmount: null,
        chargeApplicabilityId: null,
        chargeDefinition: {
          code: row.code,
          id: definition.id,
          isMonthlyLevy: definition.isMonthlyLevy,
          name: definition.name,
          purpose: definition.purpose,
        },
        collectionMode: "deduct_from_savings",
        isRequired: null,
        schemaVersion: 1,
        source: "manual",
        sourceType: "import",
        target: null,
        trigger: null,
        version: null,
        workflow: null,
      },
      assessedAt: row.assessedAt,
      chargeDefinitionId: definition.id,
      collectionMode: "deduct_from_savings",
      id: applicationId,
      memberId: member.id,
      notes: row.notes,
      status: "posted",
      tenantId,
      workflowIdempotencyKey: key,
    })
    transactions.push({
      chargeApplicationId: applicationId,
      id: transactionId,
      idempotencyKey: key,
      memberId: member.id,
      narration: `${definition.name} assessed`,
      postedAt: row.assessedAt,
      tenantId,
      transactionType: definition.isMonthlyLevy ? "levy" : "charge",
    })
    entries.push(
      {
        amount: row.amount,
        direction: "debit",
        ledgerAccountId: accounts["1000"]!,
        ledgerTransactionId: transactionId,
        tenantId,
      },
      {
        amount: row.amount,
        direction: "credit",
        ledgerAccountId: accounts[definition.isMonthlyLevy ? "3100" : "3000"]!,
        ledgerTransactionId: transactionId,
        tenantId,
      }
    )
    audits.push({
      action: "charge.applied",
      actorType: "user",
      actorUserId: input.actorUserId,
      entityId: applicationId,
      entityType: "ChargeApplication",
      metadata: {
        amount: row.amount,
        chargeDefinitionId: definition.id,
        collectionMode: "deduct_from_savings",
        importBatchId: input.batchId ?? null,
        memberId: member.id,
        sourceType: "import",
      },
      occurredAt: now,
      tenantId,
    })
    koboByMember.set(
      member.id,
      (koboByMember.get(member.id) ?? 0) - toKobo(row.amount)
    )
  })

  await db.chargeApplication.createMany({ data: applications })
  await db.ledgerTransaction.createMany({ data: transactions })
  await db.ledgerEntry.createMany({ data: entries })
  await adjustSavingsSnapshots(db, tenantId, koboByMember)
  await db.auditLog.createMany({ data: audits })

  return { processed: rows.length }
}

export async function postImportedLoanMigrations(
  db: Db,
  input: {
    actorUserId: string
    rows: Array<{
      disbursedAt?: Date
      extraMonthlySavingsAmount?: number
      firstRepaymentDueAt?: Date
      loanProductName: string
      loanType: "normal" | "quick"
      memberNumber: string
      monthlyRepaymentAmount?: number
      outstandingPrincipal: number
      principalAmount: number
      requestedAt: Date
      status: LoanStatus
      termMonths: number
    }>
    tenantId: string
  }
): Promise<ImportPostingResult> {
  const { rows, tenantId } = input
  if (rows.length === 0) return { processed: 0 }

  const members = await findMembersByNumber(
    db,
    tenantId,
    rows.map((row) => row.memberNumber),
    "loans"
  )

  const lastRowByProduct = new Map(
    rows.map((row) => [row.loanProductName, row])
  )
  const products = new Map<string, string>()
  for (const [name, row] of lastRowByProduct) {
    const product = await db.loanProduct.upsert({
      create: {
        isActive: true,
        loanType: row.loanType,
        maxSavingsMultiple: 2,
        name,
        tenantId,
        termMonths: row.termMonths,
      },
      select: { id: true },
      update: {
        isActive: true,
        loanType: row.loanType,
        maxSavingsMultiple: 2,
        termMonths: row.termMonths,
      },
      where: { tenantId_name: { name, tenantId } },
    })
    products.set(name, product.id)
  }

  const alreadyAdded = await db.loanRequest.findMany({
    select: { loanProductId: true, memberId: true, requestedAt: true },
    where: {
      loanProductId: { in: [...products.values()] },
      memberId: { in: [...new Set([...members.values()].map(({ id }) => id))] },
      reviewNotes: "Imported from migration workflow.",
      tenantId,
    },
  })
  const addedKeys = new Set(
    alreadyAdded.map(
      (item) =>
        `${item.memberId}|${item.loanProductId}|${dateKey(item.requestedAt)}`
    )
  )
  const repeats = rows.filter((row) =>
    addedKeys.has(
      `${members.get(row.memberNumber)!.id}|${products.get(row.loanProductName)}|${dateKey(row.requestedAt)}`
    )
  )
  if (repeats.length > 0) {
    throw ExpectedQueryError.conflict(
      `Some loans in this file are already in Halaalvest (${listSome(repeats.map((row) => `${row.memberNumber} ${row.loanProductName}`))}). Remove them and try again.`
    )
  }

  const requests: Prisma.LoanRequestCreateManyInput[] = []
  const approvals: Prisma.LoanApprovalCreateManyInput[] = []
  const loans: Prisma.LoanCreateManyInput[] = []
  const scheduleItems: Prisma.RepaymentScheduleItemCreateManyInput[] = []

  for (const row of rows) {
    const member = members.get(row.memberNumber)!
    const loanProductId = products.get(row.loanProductName)!
    const requestId = randomUUID()
    const loanId = randomUUID()
    const estimatedMonthlyServicing =
      row.monthlyRepaymentAmount && row.monthlyRepaymentAmount > 0
        ? Number(row.monthlyRepaymentAmount.toFixed(2))
        : Number((row.principalAmount / row.termMonths).toFixed(2))

    requests.push({
      availablePoolSnapshot: 0,
      createdByUserId: input.actorUserId,
      eligibleAmountSnapshot: Number(member.totalSavingsSnapshot),
      estimatedMonthlyServicing,
      extraMonthlySavingsAmount: row.extraMonthlySavingsAmount ?? 0,
      id: requestId,
      loanProductId,
      memberId: member.id,
      requestedAmount: row.principalAmount,
      requestedAt: row.requestedAt,
      requestedTermMonths: row.termMonths,
      reviewNotes: "Imported from migration workflow.",
      status: "approved",
      tenantId,
    })
    approvals.push({
      action: "approved",
      actedAt: row.requestedAt,
      actorUserId: input.actorUserId,
      loanRequestId: requestId,
      notes: "Approved during historical import.",
      tenantId,
    })
    loans.push({
      disbursedAt: row.disbursedAt ?? null,
      estimatedMonthlyServicing,
      extraMonthlySavingsAmount: row.extraMonthlySavingsAmount ?? 0,
      firstRepaymentDueAt: row.firstRepaymentDueAt ?? null,
      id: loanId,
      loanProductId,
      loanRequestId: requestId,
      memberId: member.id,
      outstandingPrincipal: row.outstandingPrincipal,
      principalAmount: row.principalAmount,
      status: row.status,
      tenantId,
      termMonths: row.termMonths,
    })

    if (row.firstRepaymentDueAt) {
      let remainingPaid = Math.max(
        0,
        row.principalAmount - row.outstandingPrincipal
      )
      for (const item of buildRepaymentSchedule({
        monthlyRepaymentAmount: row.monthlyRepaymentAmount,
        principalAmount: row.principalAmount,
        startDate: row.firstRepaymentDueAt,
        termMonths: row.termMonths,
      })) {
        const applied = Math.min(remainingPaid, item.totalDue)
        remainingPaid -= applied
        scheduleItems.push({
          amountPaid: applied,
          chargeDue: item.chargeDue,
          dueAt: item.dueAt,
          installmentNumber: item.installmentNumber,
          loanId,
          principalDue: item.principalDue,
          status:
            applied >= item.totalDue
              ? "paid"
              : applied > 0
                ? "partially_paid"
                : item.status,
          tenantId,
          totalDue: item.totalDue,
        })
      }
    }
  }

  await db.loanRequest.createMany({ data: requests })
  await db.loanApproval.createMany({ data: approvals })
  await db.loan.createMany({ data: loans })
  if (scheduleItems.length) {
    await db.repaymentScheduleItem.createMany({ data: scheduleItems })
  }

  return { processed: rows.length }
}

type ImportedMemberRow = {
  address?: string
  deductionSourceName?: string
  email?: string
  fullName: string
  governmentIdNumber?: string
  joinedAt: Date
  kycDocumentType?: string
  kycReviewNotes?: string
  kycStatus?: KycStatus
  memberNumber: string
  memberType: MemberType
  monthlyCommitment?: number
  occupation?: string
  openingSavingsBalance?: number
  phoneNumber?: string
  status?: MemberStatus
}

function trimmedOrNull(value: string | undefined) {
  return value?.trim() || null
}

export async function postImportedMembers(
  db: Db,
  input: {
    actorUserId: string
    rows: ImportedMemberRow[]
    tenantId: string
  }
): Promise<ImportPostingResult> {
  const { rows, tenantId } = input
  if (rows.length === 0) return { processed: 0 }

  const sourceNames = [
    ...new Set(
      rows
        .map((row) => row.deductionSourceName)
        .filter((name): name is string => Boolean(name))
    ),
  ]
  const [sources, existingMembers] = await Promise.all([
    sourceNames.length
      ? db.deductionSource.findMany({
          select: { id: true, name: true },
          where: { name: { in: sourceNames }, tenantId },
        })
      : Promise.resolve([]),
    db.member.findMany({
      select: { id: true, memberNumber: true },
      where: {
        memberNumber: { in: rows.map((row) => row.memberNumber) },
        tenantId,
      },
    }),
  ])
  const sourceIdByName = new Map(sources.map(({ id, name }) => [name, id]))
  const memberIdByNumber = new Map(
    existingMembers.map(({ id, memberNumber }) => [memberNumber, id])
  )

  // A member number that appears twice in one file is written once: the last
  // row wins, as it did when each row was upserted in turn.
  const lastRowByNumber = new Map(rows.map((row) => [row.memberNumber, row]))
  const created: Prisma.MemberCreateManyInput[] = []

  for (const row of lastRowByNumber.values()) {
    const deductionSourceId = row.deductionSourceName
      ? (sourceIdByName.get(row.deductionSourceName) ?? null)
      : null
    const existingId = memberIdByNumber.get(row.memberNumber)

    if (!existingId) {
      const id = randomUUID()
      memberIdByNumber.set(row.memberNumber, id)
      created.push({
        address: trimmedOrNull(row.address),
        deductionSourceId,
        email: trimmedOrNull(row.email),
        fullName: row.fullName,
        governmentIdNumber: trimmedOrNull(row.governmentIdNumber),
        id,
        joinedAt: row.joinedAt,
        kycDocumentType: trimmedOrNull(row.kycDocumentType),
        kycReviewNotes: trimmedOrNull(row.kycReviewNotes),
        kycStatus: row.kycStatus ?? "not_started",
        memberNumber: row.memberNumber,
        memberType: row.memberType,
        occupation: trimmedOrNull(row.occupation),
        phoneNumber: trimmedOrNull(row.phoneNumber),
        status: row.status ?? "active",
        tenantId,
        totalSavingsSnapshot: row.openingSavingsBalance ?? 0,
      })
      continue
    }

    // Updating members already in Halaalvest stays one statement each; a
    // re-import usually touches few of them.
    await db.member.update({
      data: {
        deductionSourceId,
        fullName: row.fullName,
        joinedAt: row.joinedAt,
        memberType: row.memberType,
        status: row.status ?? "active",
        ...(row.address !== undefined && {
          address: trimmedOrNull(row.address),
        }),
        ...(row.email !== undefined && { email: trimmedOrNull(row.email) }),
        ...(row.governmentIdNumber !== undefined && {
          governmentIdNumber: trimmedOrNull(row.governmentIdNumber),
        }),
        ...(row.kycDocumentType !== undefined && {
          kycDocumentType: trimmedOrNull(row.kycDocumentType),
        }),
        ...(row.kycReviewNotes !== undefined && {
          kycReviewNotes: trimmedOrNull(row.kycReviewNotes),
        }),
        ...(row.kycStatus !== undefined && { kycStatus: row.kycStatus }),
        ...(row.occupation !== undefined && {
          occupation: trimmedOrNull(row.occupation),
        }),
        ...(row.openingSavingsBalance !== undefined && {
          totalSavingsSnapshot: row.openingSavingsBalance,
        }),
        ...(row.phoneNumber !== undefined && {
          phoneNumber: trimmedOrNull(row.phoneNumber),
        }),
      },
      where: { id: existingId },
    })
  }

  if (created.length) {
    await db.member.createMany({ data: created })
  }

  const commitmentRows = [...lastRowByNumber.values()].filter(
    (row) => row.monthlyCommitment && row.monthlyCommitment > 0
  )
  if (commitmentRows.length) {
    const memberIds = commitmentRows.map(
      (row) => memberIdByNumber.get(row.memberNumber)!
    )
    const [plans, amountLogs] = await Promise.all([
      db.contributionPlan.findMany({
        orderBy: { startsAt: "desc" },
        select: { id: true, memberId: true },
        where: { isActive: true, memberId: { in: memberIds }, tenantId },
      }),
      db.memberAmountLog.findMany({
        select: { effectiveFrom: true, id: true, memberId: true },
        where: { memberId: { in: memberIds }, tenantId },
      }),
    ])
    const planByMember = new Map<string, string>()
    for (const plan of plans) {
      if (!planByMember.has(plan.memberId))
        planByMember.set(plan.memberId, plan.id)
    }
    const logByMemberDay = new Map(
      amountLogs.map((log) => [
        `${log.memberId}|${log.effectiveFrom.toISOString()}`,
        log.id,
      ])
    )
    const newPlans: Prisma.ContributionPlanCreateManyInput[] = []
    const newLogs: Prisma.MemberAmountLogCreateManyInput[] = []

    for (const row of commitmentRows) {
      const memberId = memberIdByNumber.get(row.memberNumber)!
      const amount = row.monthlyCommitment!
      const planId = planByMember.get(memberId)
      if (planId) {
        await db.contributionPlan.update({
          data: { amount, name: "Monthly commitment", startsAt: row.joinedAt },
          where: { id: planId },
        })
      } else {
        newPlans.push({
          amount,
          interval: "monthly",
          isActive: true,
          memberId,
          name: "Monthly commitment",
          startsAt: row.joinedAt,
          tenantId,
        })
      }

      const logId = logByMemberDay.get(
        `${memberId}|${row.joinedAt.toISOString()}`
      )
      if (logId) {
        await db.memberAmountLog.update({
          data: { amount, notes: "Imported initial monthly commitment." },
          where: { id: logId },
        })
      } else {
        newLogs.push({
          amount,
          createdByUserId: input.actorUserId,
          effectiveFrom: row.joinedAt,
          memberId,
          notes: "Imported initial monthly commitment.",
          tenantId,
        })
      }
    }

    if (newPlans.length)
      await db.contributionPlan.createMany({ data: newPlans })
    if (newLogs.length) await db.memberAmountLog.createMany({ data: newLogs })
  }

  return { processed: rows.length }
}

/**
 * Finds every loan a repayment file points at in one query and checks the
 * whole file before anything is posted, so a bad row stops the import before
 * the first repayment is written.
 */
export async function resolveImportedRepaymentLoans(
  db: Db,
  input: {
    rows: Array<{
      amount: number
      loanProductName: string
      memberNumber: string
      reference?: string
    }>
    tenantId: string
  }
) {
  const { rows, tenantId } = input
  const references = rows
    .map((row) => row.reference?.trim())
    .filter((reference): reference is string => Boolean(reference))
  const [loans, alreadyAdded] = await Promise.all([
    db.loan.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        loanProduct: { select: { name: true } },
        member: { select: { memberNumber: true } },
        outstandingPrincipal: true,
        status: true,
      },
      where: {
        loanProduct: {
          name: { in: [...new Set(rows.map((row) => row.loanProductName))] },
        },
        member: {
          memberNumber: {
            in: [...new Set(rows.map((row) => row.memberNumber))],
          },
        },
        tenantId,
      },
    }),
    references.length
      ? db.repayment.findMany({
          select: { reference: true },
          where: { reference: { in: references }, tenantId },
        })
      : Promise.resolve([]),
  ])

  if (alreadyAdded.length > 0) {
    throw ExpectedQueryError.conflict(
      `Some repayments in this file are already in Halaalvest (references ${listSome(alreadyAdded.map(({ reference }) => reference ?? ""))}). Remove them and try again.`
    )
  }

  const loanByKey = new Map<string, (typeof loans)[number]>()
  for (const loan of loans) {
    const key = `${loan.member.memberNumber}|${loan.loanProduct.name}`
    if (!loanByKey.has(key)) loanByKey.set(key, loan)
  }

  const missing: string[] = []
  const closed: string[] = []
  const owedKobo = new Map<string, number>()
  const loanIds = rows.map((row) => {
    const key = `${row.memberNumber}|${row.loanProductName}`
    const loan = loanByKey.get(key)
    if (!loan) {
      missing.push(`${row.memberNumber} ${row.loanProductName}`)
      return ""
    }
    if (!["disbursed", "active"].includes(loan.status)) {
      closed.push(`${row.memberNumber} ${row.loanProductName}`)
    }
    owedKobo.set(loan.id, (owedKobo.get(loan.id) ?? 0) + toKobo(row.amount))
    return loan.id
  })

  if (missing.length > 0) {
    throw ExpectedQueryError.validation(
      `No loan was found for: ${listSome(missing)}. Import the loans first.`
    )
  }
  if (closed.length > 0) {
    throw ExpectedQueryError.validation(
      `These loans are not open, so repayments cannot be added: ${listSome(closed)}.`
    )
  }
  const overpaid = loans.filter(
    (loan) =>
      (owedKobo.get(loan.id) ?? 0) > toKobo(Number(loan.outstandingPrincipal))
  )
  if (overpaid.length > 0) {
    throw ExpectedQueryError.validation(
      `The repayments for ${listSome(overpaid.map((loan) => `${loan.member.memberNumber} ${loan.loanProduct.name}`))} add up to more than what is still owed.`
    )
  }

  return loanIds
}
