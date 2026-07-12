import type {
  CollectionSourceContributionBatchRowStatus,
  PrismaClient,
} from "../../generated/prisma/client"
import { createPrismaClient } from "../prisma"
import { recordMemberPaymentMutation } from "./contributions"
import { getTenantInitialMigrationState } from "./migration"
import { getTenantOperationProfile } from "./operation-profile"

type BatchRowStatusInput = Extract<
  CollectionSourceContributionBatchRowStatus,
  "collected" | "exception" | "skipped" | "staged"
>

export type CollectionSourceBatchRowUpdateInput = {
  exceptionReason?: string | null
  paidAmount?: number | null
  rowId: string
  status: BatchRowStatusInput
}

export type CollectionSourceBatchRowView = {
  blocker: string | null
  contributionId: string | null
  contributionPlanId: string | null
  exceptionReason: string | null
  expectedAmount: number
  id: string
  memberId: string
  memberName: string
  memberNumber: string
  memberStatus: string
  paidAmount: number
  postedAt: Date | null
  status: CollectionSourceContributionBatchRowStatus
}

export type CollectionSourceBatchView = {
  createdAt: Date
  deductionSource: {
    externalReference: string | null
    id: string
    name: string
    type: string
  }
  id: string
  notes: string | null
  periodLabel: string
  periodMonth: number
  periodYear: number
  postedAt: Date | null
  reference: string | null
  rows: CollectionSourceBatchRowView[]
  status: string
  totals: {
    blockedRows: number
    collectedRows: number
    exceptionRows: number
    expectedAmount: number
    paidAmount: number
    postedAmount: number
    postedRows: number
    rowCount: number
    skippedRows: number
    stagedRows: number
  }
}

function getPrisma(prismaOverride?: PrismaClient) {
  const prisma = prismaOverride ?? createPrismaClient()

  if (!prisma) {
    throw new Error("Database not configured")
  }

  return prisma
}

async function assertLiveFinancialWritesOpen(
  tenantId: string,
  prisma: PrismaClient
) {
  const migrationState = await getTenantInitialMigrationState(tenantId, prisma)

  if (!migrationState.snapshot.canUseLiveFinancialWrites) {
    throw new Error(
      "Live financial record writes are locked until initial migration is finalized."
    )
  }
}

async function assertBatchPostingEnabled(tenantId: string, prisma: PrismaClient) {
  const profile = await getTenantOperationProfile(tenantId, prisma)

  if (!profile.services.collection_source_batch_posting.canStaffCreate) {
    throw new Error(
      "Collection Source batch posting is not enabled for this cooperative."
    )
  }
}

function assertPeriod(year: number, month: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Enter a valid batch year.")
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Enter a valid batch month.")
  }
}

function getPeriodLabel(year: number, month: number) {
  const date = new Date(Date.UTC(year, month - 1, 1))

  return new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(date)
}

function getPeriodStart(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1))
}

function getPeriodEnd(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1))
}

function normalizePositiveMoney(value: unknown, fallback: number) {
  const numberValue = Number(value)

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return fallback
  }

  return Math.round(numberValue * 100) / 100
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim()

  return trimmed ? trimmed : null
}

function serializeBatch(batch: any): CollectionSourceBatchView {
  const rows: CollectionSourceBatchRowView[] = batch.rows.map((row: any) => ({
    blocker: row.blocker ?? null,
    contributionId: row.contributionId ?? null,
    contributionPlanId: row.contributionPlanId ?? null,
    exceptionReason: row.exceptionReason ?? null,
    expectedAmount: Number(row.expectedAmount),
    id: row.id,
    memberId: row.member.id,
    memberName: row.member.fullName,
    memberNumber: row.member.memberNumber,
    memberStatus: row.member.status,
    paidAmount: Number(row.paidAmount),
    postedAt: row.postedAt ?? null,
    status: row.status,
  }))
  const postedRows = rows.filter((row) => row.status === "posted")
  const collectedRows = rows.filter((row) => row.status === "collected")
  const exceptionRows = rows.filter((row) => row.status === "exception")
  const skippedRows = rows.filter((row) => row.status === "skipped")
  const blockedRows = rows.filter((row) => row.status === "blocked")
  const stagedRows = rows.filter((row) => row.status === "staged")

  return {
    createdAt: batch.createdAt,
    deductionSource: {
      externalReference: batch.deductionSource.externalReference ?? null,
      id: batch.deductionSource.id,
      name: batch.deductionSource.name,
      type: batch.deductionSource.type,
    },
    id: batch.id,
    notes: batch.notes ?? null,
    periodLabel: batch.periodLabel,
    periodMonth: batch.periodMonth,
    periodYear: batch.periodYear,
    postedAt: batch.postedAt ?? null,
    reference: batch.reference ?? null,
    rows,
    status: batch.status,
    totals: {
      blockedRows: blockedRows.length,
      collectedRows: collectedRows.length,
      exceptionRows: exceptionRows.length,
      expectedAmount: rows.reduce((total, row) => total + row.expectedAmount, 0),
      paidAmount: rows.reduce((total, row) => total + row.paidAmount, 0),
      postedAmount: postedRows.reduce((total, row) => total + row.paidAmount, 0),
      postedRows: postedRows.length,
      rowCount: rows.length,
      skippedRows: skippedRows.length,
      stagedRows: stagedRows.length,
    },
  }
}

async function getBatchOrThrow(input: {
  batchId: string
  tenantId: string
  tx: PrismaClient
}) {
  const batch = await (input.tx as any).collectionSourceContributionBatch.findFirst({
    where: {
      id: input.batchId,
      tenantId: input.tenantId,
    },
  })

  if (!batch) {
    throw new Error("Collection Source batch not found.")
  }

  if (batch.status === "cancelled") {
    throw new Error("Cancelled Collection Source batches cannot be changed.")
  }

  return batch
}

async function getBatchDetail(
  tenantId: string,
  batchId: string,
  prisma: PrismaClient
): Promise<CollectionSourceBatchView | null> {
  const batch = await (prisma as any).collectionSourceContributionBatch.findFirst({
    include: {
      deductionSource: true,
      rows: {
        include: {
          member: {
            select: {
              fullName: true,
              id: true,
              memberNumber: true,
              status: true,
            },
          },
        },
        orderBy: [
          { member: { memberNumber: "asc" } },
          { member: { fullName: "asc" } },
        ],
      },
    },
    where: {
      id: batchId,
      tenantId,
    },
  })

  return batch ? serializeBatch(batch) : null
}

async function refreshBatchStatus(input: {
  batchId: string
  tenantId: string
  tx: PrismaClient
}) {
  const rows = await (input.tx as any).collectionSourceContributionBatchRow.findMany({
    select: { status: true },
    where: {
      batchId: input.batchId,
      tenantId: input.tenantId,
    },
  })
  const postableRows = rows.filter(
    (row: { status: string }) =>
      row.status !== "blocked" &&
      row.status !== "exception" &&
      row.status !== "skipped"
  )
  const postedRows = rows.filter(
    (row: { status: string }) => row.status === "posted"
  )
  const status =
    postableRows.length > 0 && postedRows.length === postableRows.length
      ? "posted"
      : postedRows.length > 0
        ? "partially_posted"
        : "staged"

  await (input.tx as any).collectionSourceContributionBatch.update({
    data: {
      status,
      ...(status === "posted" ? { postedAt: new Date() } : {}),
    },
    where: { id: input.batchId },
  })
}

export async function listCollectionSourceContributionBatches(
  tenantId: string,
  prismaOverride?: PrismaClient
): Promise<Array<Omit<CollectionSourceBatchView, "rows">>> {
  const prisma = getPrisma(prismaOverride)
  const batches = await (prisma as any).collectionSourceContributionBatch.findMany({
    include: {
      deductionSource: true,
      rows: {
        include: {
          member: {
            select: {
              fullName: true,
              id: true,
              memberNumber: true,
              status: true,
            },
          },
        },
      },
    },
    orderBy: [
      { periodYear: "desc" },
      { periodMonth: "desc" },
      { createdAt: "desc" },
    ],
    take: 12,
    where: { tenantId },
  })

  return batches.map((batch: any) => {
    const { rows: _rows, ...summary } = serializeBatch(batch)

    return summary
  })
}

export async function getCollectionSourceContributionBatch(
  tenantId: string,
  batchId: string,
  prismaOverride?: PrismaClient
) {
  const prisma = getPrisma(prismaOverride)

  return getBatchDetail(tenantId, batchId, prisma)
}

export async function stageCollectionSourceContributionBatch(
  input: {
    actorUserId: string
    deductionSourceId: string
    month: number
    notes?: string | null
    reference?: string | null
    tenantId: string
    year: number
  },
  prismaOverride?: PrismaClient
): Promise<CollectionSourceBatchView> {
  const prisma = getPrisma(prismaOverride)

  assertPeriod(input.year, input.month)
  await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  await assertBatchPostingEnabled(input.tenantId, prisma)

  const periodStart = getPeriodStart(input.year, input.month)
  const periodEnd = getPeriodEnd(input.year, input.month)
  const periodLabel = getPeriodLabel(input.year, input.month)

  const batch = await prisma.$transaction(async (tx) => {
    const source = await (tx as any).deductionSource.findFirst({
      where: {
        id: input.deductionSourceId,
        isActive: true,
        tenantId: input.tenantId,
      },
    })

    if (!source) {
      throw new Error("Collection Source does not belong to this cooperative or is inactive.")
    }

    const stagedBatch = await (tx as any).collectionSourceContributionBatch.upsert({
      create: {
        createdByUserId: input.actorUserId,
        deductionSourceId: input.deductionSourceId,
        notes: normalizeOptionalText(input.notes),
        periodLabel,
        periodMonth: input.month,
        periodYear: input.year,
        reference: normalizeOptionalText(input.reference),
        tenantId: input.tenantId,
      },
      update: {
        notes: normalizeOptionalText(input.notes),
        reference: normalizeOptionalText(input.reference),
      },
      where: {
        tenantId_deductionSourceId_periodYear_periodMonth: {
          deductionSourceId: input.deductionSourceId,
          periodMonth: input.month,
          periodYear: input.year,
          tenantId: input.tenantId,
        },
      },
    })

    const existingRowCount = await (tx as any).collectionSourceContributionBatchRow.count({
      where: {
        batchId: stagedBatch.id,
        tenantId: input.tenantId,
      },
    })

    if (existingRowCount === 0) {
      const members = await tx.member.findMany({
        include: {
          contributionPlans: {
            orderBy: { startsAt: "desc" },
            take: 1,
            where: {
              interval: "monthly",
              startsAt: { lt: periodEnd },
              OR: [{ endsAt: null }, { endsAt: { gte: periodStart } }],
            },
          },
        },
        orderBy: [{ memberNumber: "asc" }, { fullName: "asc" }],
        where: {
          deductionSourceId: input.deductionSourceId,
          status: { not: "exited" },
          tenantId: input.tenantId,
        },
      })

      for (const member of members) {
        const plan = member.contributionPlans[0]
        const expectedAmount = plan ? Number(plan.amount) : 0
        const blocker =
          member.status !== "active"
            ? "member_not_active"
            : !plan
              ? "missing_active_commitment_plan"
              : expectedAmount <= 0
                ? "zero_commitment_plan"
                : null

        await (tx as any).collectionSourceContributionBatchRow.create({
          data: {
            batchId: stagedBatch.id,
            blocker,
            contributionPlanId: plan?.id,
            expectedAmount,
            memberId: member.id,
            paidAmount: 0,
            status: blocker ? "blocked" : "staged",
            tenantId: input.tenantId,
          },
        })
      }

      await tx.auditLog.create({
        data: {
          action: "collection_source_batch.staged",
          actorType: "user",
          actorUserId: input.actorUserId,
          entityId: stagedBatch.id,
          entityType: "CollectionSourceContributionBatch",
          metadata: {
            deductionSourceId: input.deductionSourceId,
            periodLabel,
            periodMonth: input.month,
            periodYear: input.year,
            reference: normalizeOptionalText(input.reference),
            rowCount: members.length,
          },
          occurredAt: new Date(),
          tenantId: input.tenantId,
        },
      })
    }

    return stagedBatch
  })
  const detail = await getBatchDetail(input.tenantId, batch.id, prisma)

  if (!detail) {
    throw new Error("Collection Source batch not found.")
  }

  return detail
}

export async function updateCollectionSourceContributionBatchRows(
  input: {
    actorUserId: string
    batchId: string
    rows: CollectionSourceBatchRowUpdateInput[]
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<CollectionSourceBatchView> {
  const prisma = getPrisma(prismaOverride)

  if (input.rows.length === 0) {
    throw new Error("Select at least one batch row to update.")
  }

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  await assertBatchPostingEnabled(input.tenantId, prisma)

  await prisma.$transaction(async (tx) => {
    await getBatchOrThrow({
      batchId: input.batchId,
      tenantId: input.tenantId,
      tx: tx as unknown as PrismaClient,
    })

    for (const update of input.rows) {
      const row = await (tx as any).collectionSourceContributionBatchRow.findFirst({
        where: {
          batchId: input.batchId,
          id: update.rowId,
          tenantId: input.tenantId,
        },
      })

      if (!row) {
        throw new Error("Collection Source batch row not found.")
      }

      if (row.status === "posted" || row.contributionId) {
        throw new Error("Posted Collection Source batch rows cannot be changed.")
      }

      if (row.blocker && update.status === "collected") {
        throw new Error("Blocked Collection Source batch rows cannot be marked collected.")
      }

      const expectedAmount = Number(row.expectedAmount)
      const exceptionReason = normalizeOptionalText(update.exceptionReason)
      const data =
        update.status === "collected"
          ? {
              exceptionReason,
              paidAmount: normalizePositiveMoney(update.paidAmount, expectedAmount),
              status: "collected",
            }
          : update.status === "exception"
            ? {
                exceptionReason:
                  exceptionReason ??
                  (() => {
                    throw new Error("Enter an exception reason for exception rows.")
                  })(),
                paidAmount: 0,
                status: "exception",
              }
            : update.status === "skipped"
              ? {
                  exceptionReason,
                  paidAmount: 0,
                  status: "skipped",
                }
              : {
                  exceptionReason: null,
                  paidAmount: 0,
                  status: row.blocker ? "blocked" : "staged",
                }

      await (tx as any).collectionSourceContributionBatchRow.update({
        data,
        where: { id: row.id },
      })
    }

    await tx.auditLog.create({
      data: {
        action: "collection_source_batch.rows_updated",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: input.batchId,
        entityType: "CollectionSourceContributionBatch",
        metadata: {
          rows: input.rows.map((row) => ({
            exceptionReason: normalizeOptionalText(row.exceptionReason),
            paidAmount: row.paidAmount ?? null,
            rowId: row.rowId,
            status: row.status,
          })),
        },
        occurredAt: new Date(),
        tenantId: input.tenantId,
      },
    })

    await refreshBatchStatus({
      batchId: input.batchId,
      tenantId: input.tenantId,
      tx: tx as unknown as PrismaClient,
    })
  })

  const detail = await getBatchDetail(input.tenantId, input.batchId, prisma)

  if (!detail) {
    throw new Error("Collection Source batch not found.")
  }

  return detail
}

export async function postCollectionSourceContributionBatchRows(
  input: {
    actorUserId: string
    batchId: string
    notes?: string | null
    postedAt?: Date
    reference?: string | null
    rowIds: string[]
    tenantId: string
  },
  prismaOverride?: PrismaClient
): Promise<CollectionSourceBatchView> {
  const prisma = getPrisma(prismaOverride)

  if (input.rowIds.length === 0) {
    throw new Error("Select at least one collected row to post.")
  }

  await assertLiveFinancialWritesOpen(input.tenantId, prisma)
  await assertBatchPostingEnabled(input.tenantId, prisma)

  await prisma.$transaction(async (tx) => {
    const batch = await (tx as any).collectionSourceContributionBatch.findFirst({
      include: {
        deductionSource: true,
      },
      where: {
        id: input.batchId,
        tenantId: input.tenantId,
      },
    })

    if (!batch) {
      throw new Error("Collection Source batch not found.")
    }

    if (batch.status === "cancelled") {
      throw new Error("Cancelled Collection Source batches cannot be posted.")
    }

    const rows = await (tx as any).collectionSourceContributionBatchRow.findMany({
      include: {
        member: {
          select: {
            fullName: true,
            id: true,
            memberNumber: true,
          },
        },
      },
      where: {
        batchId: input.batchId,
        id: { in: input.rowIds },
        tenantId: input.tenantId,
      },
    })

    if (rows.length !== input.rowIds.length) {
      throw new Error("One or more selected batch rows were not found.")
    }

    const postedAt = input.postedAt ?? getPeriodStart(batch.periodYear, batch.periodMonth)
    const referencePrefix =
      normalizeOptionalText(input.reference) ??
      normalizeOptionalText(batch.reference) ??
      normalizeOptionalText(batch.deductionSource.externalReference) ??
      batch.deductionSource.name
    const postedContributionIds: string[] = []

    for (const row of rows) {
      if (row.status !== "collected") {
        throw new Error("Only collected Collection Source batch rows can be posted.")
      }

      if (row.contributionId) {
        throw new Error("This Collection Source batch row has already been posted.")
      }

      if (row.blocker) {
        throw new Error("Blocked Collection Source batch rows cannot be posted.")
      }

      const paidAmount = Number(row.paidAmount)

      if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
        throw new Error("Collected batch rows must have a paid amount greater than zero.")
      }

      const expectedAmount = Number(row.expectedAmount)
      const committedSavingsAmount = Math.min(paidAmount, expectedAmount)
      const extraSavingsAmount = Math.max(0, paidAmount - committedSavingsAmount)
      const result = await recordMemberPaymentMutation(
        {
          actorUserId: input.actorUserId,
          channel: "payroll",
          committedSavingsAmount,
          contributionPlanId: row.contributionPlanId ?? undefined,
          extraSavingsAmount,
          memberId: row.memberId,
          periodLabel: batch.periodLabel,
          postedAt,
          reference: `${referencePrefix}:${batch.id}:${row.id}`,
          tenantId: input.tenantId,
        },
        tx as unknown as PrismaClient
      )

      await (tx as any).collectionSourceContributionBatchRow.update({
        data: {
          contributionId: result.contributionId,
          paidAmount,
          postedAt,
          status: "posted",
        },
        where: { id: row.id },
      })

      if (result.contributionId) {
        postedContributionIds.push(result.contributionId)
      }
    }

    await (tx as any).collectionSourceContributionBatch.update({
      data: {
        notes: normalizeOptionalText(input.notes) ?? batch.notes,
        postedByUserId: input.actorUserId,
      },
      where: { id: input.batchId },
    })

    await tx.auditLog.create({
      data: {
        action: "collection_source_batch.posted",
        actorType: "user",
        actorUserId: input.actorUserId,
        entityId: input.batchId,
        entityType: "CollectionSourceContributionBatch",
        metadata: {
          deductionSourceId: batch.deductionSourceId,
          periodLabel: batch.periodLabel,
          postedAmount: rows.reduce(
            (total: number, row: any) => total + Number(row.paidAmount),
            0
          ),
          postedContributionIds,
          postedRowIds: rows.map((row: any) => row.id),
          reference: referencePrefix,
        },
        occurredAt: new Date(),
        tenantId: input.tenantId,
      },
    })

    await refreshBatchStatus({
      batchId: input.batchId,
      tenantId: input.tenantId,
      tx: tx as unknown as PrismaClient,
    })
  })

  const detail = await getBatchDetail(input.tenantId, input.batchId, prisma)

  if (!detail) {
    throw new Error("Collection Source batch not found.")
  }

  return detail
}
